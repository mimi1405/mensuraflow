import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { DXFEntity, Point, Measurement, FinishCatalogItem } from '../types';
import { getHatchStyle, renderHatchPattern } from '../lib/hatchPatterns';
import { supabase } from '../lib/supabase';
import { FloorLayerControls } from './FloorLayerControls';

interface DXFCanvasProps {
  onPointClick: (point: Point) => void;
  onCursorMove?: (point: Point) => void;
  isPlacingCopy?: boolean;
  copiedMeasurement?: Measurement | null;
  placementPosition?: Point | null;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export function DXFCanvas({ onPointClick, onCursorMove, isPlacingCopy, copiedMeasurement, placementPosition, onDuplicate, onDelete }: DXFCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ offsetX: 0, offsetY: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<Point | null>(null);
  const [isDraggingObject, setIsDraggingObject] = useState(false);
  const [draggedObjectId, setDraggedObjectId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; measurement: Measurement } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null);
  const [finishCatalog, setFinishCatalog] = useState<FinishCatalogItem[]>([]);
  const [layerVisibility, setLayerVisibility] = useState({
    ceiling: true,
    roomFloor: true,
    finish: true,
  });

  const { currentPlan, measurements, toolState, setSelectedMeasurement, setBodenSelectedRoom } = useAppStore();

  const handleLayerVisibilityChange = (layer: 'ceiling' | 'roomFloor' | 'finish', visible: boolean) => {
    setLayerVisibility(prev => ({ ...prev, [layer]: visible }));
  };

  useEffect(() => {
    loadFinishCatalog();
  }, []);

  const loadFinishCatalog = async () => {
    const { data } = await supabase.from('finish_catalog').select('*');
    setFinishCatalog(data || []);
  };

  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width, height });
      }
    };

    updateCanvasSize();

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (currentPlan && currentPlan.dxf_data.boundingBox) {
      autoFitView();
    }
  }, [currentPlan?.id, canvasSize]);

  useEffect(() => {
    renderCanvas();
  }, [viewport, currentPlan, measurements, toolState, isPlacingCopy, placementPosition, cursorPosition]);

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed) {
        setIsSpacePressed(true);
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsDragging(false);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed]);

  const autoFitView = () => {
    if (!currentPlan || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const entities = currentPlan.dxf_data.entities;

    if (!entities || entities.length === 0) return;

    let globalMinX = Infinity;
    let globalMinY = Infinity;
    let globalMaxX = -Infinity;
    let globalMaxY = -Infinity;

    const relevantEntities: DXFEntity[] = [];

    for (const entity of entities) {
      if (entity.type === 'text' || entity.type === 'mtext') continue;

      if (entity.type === 'line' && entity.start && entity.end) {
        const lineLength = Math.sqrt(
          Math.pow(entity.end.x - entity.start.x, 2) +
          Math.pow(entity.end.y - entity.start.y, 2)
        );

        if (lineLength > 0) {
          relevantEntities.push(entity);
          globalMinX = Math.min(globalMinX, entity.start.x, entity.end.x);
          globalMinY = Math.min(globalMinY, entity.start.y, entity.end.y);
          globalMaxX = Math.max(globalMaxX, entity.start.x, entity.end.x);
          globalMaxY = Math.max(globalMaxY, entity.start.y, entity.end.y);
        }
      } else if ((entity.type === 'polyline' || entity.type === 'lwpolyline') && entity.points) {
        if (entity.points.length >= 2) {
          relevantEntities.push(entity);
          for (const point of entity.points) {
            globalMinX = Math.min(globalMinX, point.x);
            globalMinY = Math.min(globalMinY, point.y);
            globalMaxX = Math.max(globalMaxX, point.x);
            globalMaxY = Math.max(globalMaxY, point.y);
          }
        }
      }
    }

    if (relevantEntities.length === 0 || globalMinX === Infinity) {
      return;
    }

    const gridSize = 30;
    const dxfWidth = globalMaxX - globalMinX;
    const dxfHeight = globalMaxY - globalMinY;
    const cellWidth = dxfWidth / gridSize;
    const cellHeight = dxfHeight / gridSize;

    const densityGrid: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));

    for (const entity of relevantEntities) {
      if (entity.type === 'line' && entity.start && entity.end) {
        const lineLength = Math.sqrt(
          Math.pow(entity.end.x - entity.start.x, 2) +
          Math.pow(entity.end.y - entity.start.y, 2)
        );

        if (lineLength < dxfWidth * 0.5 && lineLength < dxfHeight * 0.5) {
          const cellX = Math.floor((entity.start.x - globalMinX) / cellWidth);
          const cellY = Math.floor((entity.start.y - globalMinY) / cellHeight);
          const cellXEnd = Math.floor((entity.end.x - globalMinX) / cellWidth);
          const cellYEnd = Math.floor((entity.end.y - globalMinY) / cellHeight);

          const validCellX = Math.max(0, Math.min(gridSize - 1, cellX));
          const validCellY = Math.max(0, Math.min(gridSize - 1, cellY));
          const validCellXEnd = Math.max(0, Math.min(gridSize - 1, cellXEnd));
          const validCellYEnd = Math.max(0, Math.min(gridSize - 1, cellYEnd));

          densityGrid[validCellY][validCellX] += lineLength;
          if (validCellX !== validCellXEnd || validCellY !== validCellYEnd) {
            densityGrid[validCellYEnd][validCellXEnd] += lineLength;
          }
        }
      } else if ((entity.type === 'polyline' || entity.type === 'lwpolyline') && entity.points) {
        for (let i = 0; i < entity.points.length - 1; i++) {
          const p1 = entity.points[i];
          const p2 = entity.points[i + 1];
          const segmentLength = Math.sqrt(
            Math.pow(p2.x - p1.x, 2) +
            Math.pow(p2.y - p1.y, 2)
          );

          const cellX = Math.floor((p1.x - globalMinX) / cellWidth);
          const cellY = Math.floor((p1.y - globalMinY) / cellHeight);

          const validCellX = Math.max(0, Math.min(gridSize - 1, cellX));
          const validCellY = Math.max(0, Math.min(gridSize - 1, cellY));

          densityGrid[validCellY][validCellX] += segmentLength;
        }
      }
    }

    let maxDensity = 0;
    let centerCellX = Math.floor(gridSize / 2);
    let centerCellY = Math.floor(gridSize / 2);

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (densityGrid[y][x] > maxDensity) {
          maxDensity = densityGrid[y][x];
          centerCellX = x;
          centerCellY = y;
        }
      }
    }

    const searchRadius = 5;
    let buildingMinX = Infinity;
    let buildingMinY = Infinity;
    let buildingMaxX = -Infinity;
    let buildingMaxY = -Infinity;

    for (let y = Math.max(0, centerCellY - searchRadius); y < Math.min(gridSize, centerCellY + searchRadius + 1); y++) {
      for (let x = Math.max(0, centerCellX - searchRadius); x < Math.min(gridSize, centerCellX + searchRadius + 1); x++) {
        if (densityGrid[y][x] > maxDensity * 0.1) {
          const cellMinX = globalMinX + x * cellWidth;
          const cellMinY = globalMinY + y * cellHeight;
          const cellMaxX = cellMinX + cellWidth;
          const cellMaxY = cellMinY + cellHeight;

          buildingMinX = Math.min(buildingMinX, cellMinX);
          buildingMinY = Math.min(buildingMinY, cellMinY);
          buildingMaxX = Math.max(buildingMaxX, cellMaxX);
          buildingMaxY = Math.max(buildingMaxY, cellMaxY);
        }
      }
    }

    if (buildingMinX === Infinity) {
      buildingMinX = globalMinX;
      buildingMinY = globalMinY;
      buildingMaxX = globalMaxX;
      buildingMaxY = globalMaxY;
    }

    const padding = 0.15;
    const buildingWidth = (buildingMaxX - buildingMinX) * (1 + padding * 2);
    const buildingHeight = (buildingMaxY - buildingMinY) * (1 + padding * 2);
    const buildingCenterX = (buildingMinX + buildingMaxX) / 2;
    const buildingCenterY = (buildingMinY + buildingMaxY) / 2;

    const scaleX = canvas.width / buildingWidth;
    const scaleY = canvas.height / buildingHeight;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = canvas.width / 2 - buildingCenterX * scale;
    const offsetY = canvas.height / 2 + buildingCenterY * scale;

    setViewport({ offsetX, offsetY, scale });
  };

  const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;

      const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const isPointNearLine = (point: Point, linePoints: Point[], threshold: number): boolean => {
    for (let i = 0; i < linePoints.length - 1; i++) {
      const p1 = linePoints[i];
      const p2 = linePoints[i + 1];

      const lineLength = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      const dist = Math.abs((p2.y - p1.y) * point.x - (p2.x - p1.x) * point.y + p2.x * p1.y - p2.y * p1.x) / lineLength;

      const dotProduct = ((point.x - p1.x) * (p2.x - p1.x) + (point.y - p1.y) * (p2.y - p1.y)) / (lineLength * lineLength);

      if (dotProduct >= 0 && dotProduct <= 1 && dist < threshold) {
        return true;
      }
    }
    return false;
  };

  const findMeasurementAtPoint = (worldPoint: Point): Measurement | null => {
    const clickThreshold = 10 / viewport.scale;
    const candidates: Array<{ measurement: Measurement; area: number; priority: number }> = [];

    for (let i = measurements.length - 1; i >= 0; i--) {
      const measurement = measurements[i];

      if (measurement.object_type === 'line') {
        if (isPointNearLine(worldPoint, measurement.geometry.points, clickThreshold)) {
          return measurement;
        }
      } else {
        if (isPointInPolygon(worldPoint, measurement.geometry.points)) {
          const area = Math.abs(
            measurement.geometry.points.reduce((sum, point, idx) => {
              const nextPoint = measurement.geometry.points[(idx + 1) % measurement.geometry.points.length];
              return sum + (point.x * nextPoint.y - nextPoint.x * point.y);
            }, 0) / 2
          );

          const priority = measurement.object_type === 'window' ? 3 :
                          measurement.object_type === 'door' ? 2 : 1;

          candidates.push({ measurement, area, priority });
        }
      }
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.area - b.area;
    });

    return candidates[0].measurement;
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(viewport.offsetX, viewport.offsetY);
    ctx.scale(viewport.scale, -viewport.scale);

    if (currentPlan?.dxf_data.entities) {
      renderDXFEntities(ctx, currentPlan.dxf_data.entities);
    }

    if (measurements) {
      renderFloorHatches(ctx, measurements);
      renderMeasurements(ctx, measurements);
    }

    if (toolState.currentPoints.length > 0) {
      renderCurrentDrawing(ctx, toolState.currentPoints, cursorPosition);
    }

    if (isPlacingCopy && copiedMeasurement && placementPosition) {
      renderGhostObject(ctx, copiedMeasurement, placementPosition);
    }

    ctx.restore();
  };

  const renderDXFEntities = (ctx: CanvasRenderingContext2D, entities: DXFEntity[]) => {
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1 / viewport.scale;

    for (const entity of entities) {
      if (entity.type === 'line' && entity.start && entity.end) {
        ctx.beginPath();
        ctx.moveTo(entity.start.x, entity.start.y);
        ctx.lineTo(entity.end.x, entity.end.y);
        ctx.stroke();
      } else if (entity.type === 'lwpolyline' && entity.points) {
        ctx.beginPath();
        ctx.moveTo(entity.points[0].x, entity.points[0].y);
        for (let i = 1; i < entity.points.length; i++) {
          ctx.lineTo(entity.points[i].x, entity.points[i].y);
        }
        ctx.stroke();
      } else if (entity.type === 'arc' && entity.center && entity.radius) {
        const startAngle = (entity.startAngle || 0) * Math.PI / 180;
        const endAngle = (entity.endAngle || 360) * Math.PI / 180;
        ctx.beginPath();
        ctx.arc(entity.center.x, entity.center.y, entity.radius, -startAngle, -endAngle, true);
        ctx.stroke();
      } else if (entity.type === 'circle' && entity.center && entity.radius) {
        ctx.beginPath();
        ctx.arc(entity.center.x, entity.center.y, entity.radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };

  const renderFloorHatches = (ctx: CanvasRenderingContext2D, measurements: Measurement[]) => {
    const floorMeasurements = measurements.filter(m => m.floor_category);

    const ceilings = floorMeasurements.filter(m => m.floor_category === 'ceiling');
    const roomFloors = floorMeasurements.filter(m => m.floor_category === 'roomFloor');
    const finishes = floorMeasurements.filter(m => m.floor_category === 'finish');

    const renderLayer = (layerMeasurements: Measurement[]) => {
      for (const measurement of layerMeasurements) {
        const isSelected = toolState.selectedMeasurement?.id === measurement.id;

        let customColor: string | undefined;
        if (measurement.floor_category === 'finish' && measurement.finish_catalog_id) {
          const catalogItem = finishCatalog.find(c => c.id === measurement.finish_catalog_id);
          customColor = catalogItem?.color;
        }

        const style = getHatchStyle(
          measurement.floor_category!,
          measurement.floor_kind,
          customColor
        );

        if (isSelected) {
          style.opacity = Math.min(1, style.opacity + 0.2);
        }

        renderHatchPattern(ctx, measurement.geometry.points, style);
      }
    };

    if (layerVisibility.ceiling) renderLayer(ceilings);
    if (layerVisibility.roomFloor) renderLayer(roomFloors);
    if (layerVisibility.finish) renderLayer(finishes);
  };

  const renderMeasurements = (ctx: CanvasRenderingContext2D, measurements: Measurement[]) => {
    const nonFloorMeasurements = measurements.filter(m => !m.floor_category);

    for (const measurement of nonFloorMeasurements) {
      const isSelected = toolState.selectedMeasurement?.id === measurement.id;

      if (measurement.object_type === 'area' || measurement.object_type === 'window' || measurement.object_type === 'door') {
        const isWindowOrDoor = measurement.object_type === 'window' || measurement.object_type === 'door';

        if (isWindowOrDoor) {
          ctx.fillStyle = isSelected ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 0, 0, 0.3)';
          ctx.strokeStyle = isSelected ? 'rgba(255, 255, 255, 1.0)' : 'rgba(255, 0, 0, 0.8)';
        } else {
          ctx.fillStyle = isSelected ? 'rgba(0, 255, 0, 0.5)' : 'rgba(0, 255, 0, 0.3)';
          ctx.strokeStyle = isSelected ? 'rgba(255, 255, 255, 1.0)' : 'rgba(0, 255, 0, 0.8)';
        }

        ctx.lineWidth = isSelected ? 4 / viewport.scale : 2 / viewport.scale;

        if (measurement.geometry.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(measurement.geometry.points[0].x, measurement.geometry.points[0].y);
          for (let i = 1; i < measurement.geometry.points.length; i++) {
            ctx.lineTo(measurement.geometry.points[i].x, measurement.geometry.points[i].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else if (measurement.object_type === 'line') {
        if (measurement.line_type === 'kantenschutz') {
          ctx.strokeStyle = isSelected ? 'rgba(255, 20, 147, 1.0)' : 'rgba(255, 20, 147, 0.8)';
        } else if (measurement.line_type === 'dachrandabschluss') {
          ctx.strokeStyle = isSelected ? 'rgba(255, 255, 0, 1.0)' : 'rgba(255, 255, 0, 0.8)';
        } else if (measurement.line_type === 'perimeterdämmung') {
          ctx.strokeStyle = isSelected ? 'rgba(30, 144, 255, 1.0)' : 'rgba(30, 144, 255, 0.8)';
        } else {
          ctx.strokeStyle = isSelected ? 'rgba(255, 20, 147, 1.0)' : 'rgba(255, 20, 147, 0.8)';
        }

        ctx.lineWidth = isSelected ? 6 / viewport.scale : 3 / viewport.scale;

        if (measurement.geometry.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(measurement.geometry.points[0].x, measurement.geometry.points[0].y);
          for (let i = 1; i < measurement.geometry.points.length; i++) {
            ctx.lineTo(measurement.geometry.points[i].x, measurement.geometry.points[i].y);
          }
          ctx.stroke();
        }
      }
    }
  };

  const renderCurrentDrawing = (ctx: CanvasRenderingContext2D, points: Point[], cursor: Point | null) => {
    if (points.length === 0) return;

    const isWindowOrDoor = toolState.activeTool === 'window' || toolState.activeTool === 'door';
    const isLine = toolState.activeTool === 'line';
    const isRectangle = toolState.activeTool === 'rectangle';
    const isBoden = toolState.activeTool === 'boden';

    if (isBoden && toolState.bodenStep && points.length >= 3) {
      let customColor: string | undefined;
      if (toolState.bodenStep === 'finish' && toolState.pendingFinishCatalogId) {
        const catalogItem = finishCatalog.find(c => c.id === toolState.pendingFinishCatalogId);
        customColor = catalogItem?.color;
      }

      const style = getHatchStyle(
        toolState.bodenStep,
        toolState.pendingFloorKind,
        customColor
      );

      style.opacity = Math.max(0.3, style.opacity);
      renderHatchPattern(ctx, points, style);
      return;
    }

    if (isLine) {
      ctx.strokeStyle = 'rgba(255, 20, 147, 0.8)';
      ctx.lineWidth = 3 / viewport.scale;
    } else {
      ctx.fillStyle = isWindowOrDoor ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 255, 0, 0.2)';
      ctx.strokeStyle = isWindowOrDoor ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 255, 0, 0.8)';
      ctx.lineWidth = 2 / viewport.scale;
    }

    if (isLine) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      if (!isRectangle && !isWindowOrDoor) {
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();
    }

    if (cursor && points.length > 0 && !isDragging && !isSpacePressed) {
      ctx.save();
      ctx.setLineDash([10 / viewport.scale, 10 / viewport.scale]);
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)';
      ctx.lineWidth = 1 / viewport.scale;
      ctx.beginPath();
      ctx.moveTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.lineTo(cursor.x, cursor.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const isLastPoint = i === points.length - 1;
      const radius = isLastPoint ? 8 / viewport.scale : 6 / viewport.scale;

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2 / viewport.scale;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = isLastPoint ? '#00FFFF' : '#FFFF00';
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const renderGhostObject = (ctx: CanvasRenderingContext2D, measurement: Measurement, targetPosition: Point) => {
    const centroid = measurement.geometry.points.reduce(
      (acc, p) => ({
        x: acc.x + p.x / measurement.geometry.points.length,
        y: acc.y + p.y / measurement.geometry.points.length
      }),
      { x: 0, y: 0 }
    );

    const deltaX = targetPosition.x - centroid.x;
    const deltaY = targetPosition.y - centroid.y;

    const ghostPoints = measurement.geometry.points.map(p => ({
      x: p.x + deltaX,
      y: p.y + deltaY
    }));

    if (measurement.object_type === 'area' || measurement.object_type === 'window' || measurement.object_type === 'door') {
      const isWindowOrDoor = measurement.object_type === 'window' || measurement.object_type === 'door';

      if (isWindowOrDoor) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
      } else {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
      }

      ctx.lineWidth = 2 / viewport.scale;
      ctx.setLineDash([5 / viewport.scale, 5 / viewport.scale]);

      if (ghostPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(ghostPoints[0].x, ghostPoints[0].y);
        for (let i = 1; i < ghostPoints.length; i++) {
          ctx.lineTo(ghostPoints[i].x, ghostPoints[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.setLineDash([]);
    } else if (measurement.object_type === 'line') {
      if (measurement.line_type === 'kantenschutz') {
        ctx.strokeStyle = 'rgba(255, 20, 147, 0.6)';
      } else if (measurement.line_type === 'dachrandabschluss') {
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
      } else if (measurement.line_type === 'perimeterdämmung') {
        ctx.strokeStyle = 'rgba(30, 144, 255, 0.6)';
      } else {
        ctx.strokeStyle = 'rgba(255, 20, 147, 0.6)';
      }

      ctx.lineWidth = 3 / viewport.scale;
      ctx.setLineDash([5 / viewport.scale, 5 / viewport.scale]);

      if (ghostPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(ghostPoints[0].x, ghostPoints[0].y);
        for (let i = 1; i < ghostPoints.length; i++) {
          ctx.lineTo(ghostPoints[i].x, ghostPoints[i].y);
        }
        ctx.stroke();
      }

      ctx.setLineDash([]);
    }
  };

  const screenToWorld = (screenX: number, screenY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;

    const worldX = (x - viewport.offsetX) / viewport.scale;
    const worldY = -(y - viewport.offsetY) / viewport.scale;

    return { x: worldX, y: worldY };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);

    if (e.button === 2) {
      e.preventDefault();
      const clickedMeasurement = findMeasurementAtPoint(worldPos);
      if (clickedMeasurement && toolState.activeTool === 'select') {
        setSelectedMeasurement(clickedMeasurement);
        setContextMenu({ x: e.clientX, y: e.clientY, measurement: clickedMeasurement });
      }
      return;
    }

    setContextMenu(null);

    if (e.button === 1 || isSpacePressed) {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      e.preventDefault();
      return;
    }

    if (e.button === 0 && isPlacingCopy) {
      onPointClick(worldPos);
      return;
    }

    const isBodenSelectionMode = toolState.bodenMode.enabled && !toolState.bodenMode.isArmed;

    if (e.button === 0 && (toolState.activeTool === 'select' || isBodenSelectionMode)) {
      const clickedMeasurement = findMeasurementAtPoint(worldPos);

      if (clickedMeasurement) {
        setSelectedMeasurement(clickedMeasurement);

        if (isBodenSelectionMode && clickedMeasurement.floor_category === 'roomFloor') {
          console.debug('[BodenSelect] Room clicked:', clickedMeasurement.id);
          setBodenSelectedRoom(clickedMeasurement.id);
        } else if (isBodenSelectionMode) {
          setBodenSelectedRoom(null);
        }

        if (toolState.activeTool === 'select') {
          setIsDraggingObject(true);
          setDraggedObjectId(clickedMeasurement.id);

          const centroid = clickedMeasurement.geometry.points.reduce(
            (acc, p) => ({ x: acc.x + p.x / clickedMeasurement.geometry.points.length, y: acc.y + p.y / clickedMeasurement.geometry.points.length }),
            { x: 0, y: 0 }
          );
          setDragOffset({ x: worldPos.x - centroid.x, y: worldPos.y - centroid.y });
          setLastMousePos({ x: e.clientX, y: e.clientY });
        }
      } else {
        setSelectedMeasurement(null);
        if (isBodenSelectionMode) {
          setBodenSelectedRoom(null);
        }
      }
    } else if (e.button === 0 && toolState.activeTool === 'pan') {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (e.button === 0 && toolState.activeTool !== 'select' && toolState.activeTool !== 'pan' && !isBodenSelectionMode) {
      onPointClick(worldPos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);

    setCursorPosition(worldPos);

    if (onCursorMove) {
      onCursorMove(worldPos);
    }

    if (isDraggingObject && draggedObjectId && lastMousePos) {
      const draggedMeasurement = measurements.find(m => m.id === draggedObjectId);

      if (draggedMeasurement) {
        const centroid = draggedMeasurement.geometry.points.reduce(
          (acc, p) => ({ x: acc.x + p.x / draggedMeasurement.geometry.points.length, y: acc.y + p.y / draggedMeasurement.geometry.points.length }),
          { x: 0, y: 0 }
        );

        const newCentroid = { x: worldPos.x - dragOffset.x, y: worldPos.y - dragOffset.y };
        const deltaX = newCentroid.x - centroid.x;
        const deltaY = newCentroid.y - centroid.y;

        renderCanvas();
      }
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (isDragging && lastMousePos) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;

      setViewport(prev => ({
        ...prev,
        offsetX: prev.offsetX + dx,
        offsetY: prev.offsetY + dy
      }));

      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    if (isDraggingObject && draggedObjectId) {
      setIsDraggingObject(false);
      setDraggedObjectId(null);
    }
    setIsDragging(false);
    setLastMousePos(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = viewport.scale * zoomFactor;

    const worldX = (mouseX - viewport.offsetX) / viewport.scale;
    const worldY = (mouseY - viewport.offsetY) / viewport.scale;

    const newOffsetX = mouseX - worldX * newScale;
    const newOffsetY = mouseY - worldY * newScale;

    setViewport({
      offsetX: newOffsetX,
      offsetY: newOffsetY,
      scale: newScale
    });
  };

  const getCursorStyle = () => {
    if (isSpacePressed || isDragging) return 'grab';
    if (toolState.activeTool === 'pan') return 'grab';
    if (toolState.activeTool === 'select') return 'default';
    return 'crosshair';
  };

  const hasFloorMeasurements = measurements.some(m => m.floor_category);
  const isFloorPlan = currentPlan?.type === 'ground';

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="border border-gray-300 w-full h-full"
        style={{ display: 'block', cursor: getCursorStyle() }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
      {isFloorPlan && hasFloorMeasurements && (
        <FloorLayerControls
          onVisibilityChange={handleLayerVisibilityChange}
          visibilityState={layerVisibility}
        />
      )}
      {contextMenu && (
        <div
          className="absolute bg-white border border-gray-300 rounded shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left text-gray-900 hover:bg-gray-100 flex items-center gap-2"
            onClick={() => {
              setContextMenu(null);
              onDuplicate?.();
            }}
          >
            <span>Duplicate</span>
            <span className="text-gray-600 text-xs">Ctrl+C, Ctrl+V</span>
          </button>
          <button
            className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100 flex items-center gap-2"
            onClick={() => {
              setContextMenu(null);
              onDelete?.();
            }}
          >
            <span>Delete</span>
            <span className="text-gray-600 text-xs">Del</span>
          </button>
        </div>
      )}
    </div>
  );
}
