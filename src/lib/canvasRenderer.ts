/**
 * Canvas Rendering Functions
 *
 * This module contains all rendering logic for the DXF canvas:
 * - DXF entity rendering (lines, polylines, arcs, circles)
 * - Measurement rendering (areas, windows, doors, lines)
 * - Floor hatch pattern rendering
 * - Current drawing preview rendering
 * - Ghost object rendering for copy/paste operations
 */

import { DXFEntity, Point, Measurement, FinishCatalogItem, ToolState, Cutout } from '../types';
import { getHatchStyle, renderHatchPattern } from './hatchPatterns';
import { Viewport } from './canvasViewport';
import { applyCutoutsToMeasurement, calculateCentroid, calculatePolygonArea } from './cutoutGeometry';

/**
 * Renders all DXF entities (lines, polylines, arcs, circles)
 */
export const renderDXFEntities = (
  ctx: CanvasRenderingContext2D,
  entities: DXFEntity[],
  viewport: Viewport
) => {
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

/**
 * Renders floor hatch patterns (ceiling, roomFloor, finish layers)
 */
export const renderFloorHatches = (
  ctx: CanvasRenderingContext2D,
  measurements: Measurement[],
  layerVisibility: { ceiling: boolean; roomFloor: boolean; finish: boolean },
  selectedMeasurementId: string | undefined,
  finishCatalog: FinishCatalogItem[]
) => {
  const floorMeasurements = measurements.filter(m => m.floor_category);

  const ceilings = floorMeasurements.filter(m => m.floor_category === 'ceiling');
  const roomFloors = floorMeasurements.filter(m => m.floor_category === 'roomFloor');
  const finishes = floorMeasurements.filter(m => m.floor_category === 'finish');

  const renderLayer = (layerMeasurements: Measurement[]) => {
    for (const measurement of layerMeasurements) {
      const isSelected = selectedMeasurementId === measurement.id;

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

/**
 * Renders measurement objects (areas, windows, doors, lines)
 * Applies cutouts to measurements before rendering
 */
export const renderMeasurements = (
  ctx: CanvasRenderingContext2D,
  measurements: Measurement[],
  selectedMeasurementId: string | undefined,
  viewport: Viewport,
  cutouts: Cutout[] = []
) => {
  const nonFloorMeasurements = measurements.filter(m => !m.floor_category);

  for (const measurement of nonFloorMeasurements) {
    const isSelected = selectedMeasurementId === measurement.id;

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

      const clippedResult = applyCutoutsToMeasurement(measurement, cutouts);

      for (const polygonPoints of clippedResult.points) {
        if (polygonPoints.length > 0) {
          ctx.beginPath();
          ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
          for (let i = 1; i < polygonPoints.length; i++) {
            ctx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
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

/**
 * Renders the current drawing in progress with preview
 */
export const renderCurrentDrawing = (
  ctx: CanvasRenderingContext2D,
  points: Point[],
  cursor: Point | null,
  toolState: ToolState,
  viewport: Viewport,
  isDragging: boolean,
  isSpacePressed: boolean,
  finishCatalog: FinishCatalogItem[]
) => {
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

/**
 * Renders a ghost preview of an object being copied
 */
export const renderGhostObject = (
  ctx: CanvasRenderingContext2D,
  measurement: Measurement,
  targetPosition: Point,
  viewport: Viewport
) => {
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

/**
 * Renders cutouts on the canvas
 * Shows transparent overlay with red dashed border
 * Only renders cutouts that are currently referenced by at least one measurement
 */
export const renderCutouts = (
  ctx: CanvasRenderingContext2D,
  cutouts: Cutout[],
  measurements: Measurement[],
  planId: string,
  selectedCutoutId: string | undefined,
  viewport: Viewport
) => {
  const planCutouts = cutouts.filter(c => c.plan_id === planId);

  const validCutouts = planCutouts.filter(cutout => {
    return measurements.some(m => m.cutout_ids?.includes(cutout.id));
  });

  for (const cutout of validCutouts) {
    if (cutout.geometry.points.length < 3) continue;

    const isSelected = selectedCutoutId === cutout.id;

    ctx.fillStyle = isSelected ? 'rgba(255, 0, 0, 0.2)' : 'rgba(255, 0, 0, 0.1)';
    ctx.strokeStyle = isSelected ? 'rgba(255, 255, 255, 1.0)' : 'rgba(255, 0, 0, 0.8)';
    ctx.lineWidth = isSelected ? 4 / viewport.scale : 2 / viewport.scale;
    ctx.setLineDash([8 / viewport.scale, 4 / viewport.scale]);

    ctx.beginPath();
    ctx.moveTo(cutout.geometry.points[0].x, cutout.geometry.points[0].y);
    for (let i = 1; i < cutout.geometry.points.length; i++) {
      ctx.lineTo(cutout.geometry.points[i].x, cutout.geometry.points[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.setLineDash([]);
  }
};

/**
 * Renders grey label boxes for all measurements and cutouts
 * Shows name and value (area/length) for each object
 */
export const renderObjectLabels = (
  ctx: CanvasRenderingContext2D,
  measurements: Measurement[],
  cutouts: Cutout[],
  layerVisibility: { ceiling: boolean; roomFloor: boolean; finish: boolean },
  selectedMeasurementId: string | undefined,
  planId: string,
  viewport: Viewport,
  finishCatalog?: FinishCatalogItem[]
) => {
  const fontSize = 14 / viewport.scale;
  const padding = 6 / viewport.scale;
  const lineHeight = fontSize * 1.2;

  const drawLabelBox = (
    x: number,
    y: number,
    line1: string,
    line2: string
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, -1);

    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const line1Width = ctx.measureText(line1).width;
    const line2Width = ctx.measureText(line2).width;
    const boxWidth = Math.max(line1Width, line2Width) + padding * 2;
    const boxHeight = lineHeight * 2.5;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1 / viewport.scale;

    ctx.fillRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
    ctx.strokeRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillText(line1, 0, -lineHeight / 2);
    ctx.fillText(line2, 0, lineHeight / 2);

    ctx.restore();
  };

  const shouldRenderFloorMeasurement = (measurement: Measurement): boolean => {
    if (!measurement.floor_category) return true;

    switch (measurement.floor_category) {
      case 'ceiling':
        return layerVisibility.ceiling;
      case 'roomFloor':
        return layerVisibility.roomFloor;
      case 'finish':
        return layerVisibility.finish;
      default:
        return false;
    }
  };

  for (const measurement of measurements) {
    if (!shouldRenderFloorMeasurement(measurement)) continue;

    const label = measurement.label || `#${measurement.id.substring(0, 6)}`;

    if (measurement.object_type === 'line') {
      const points = measurement.geometry.points;
      if (points.length < 2) continue;

      const length = measurement.computed_value;
      const line1 = label;
      const line2 = `${length.toFixed(2)} m`;

      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];
      const dx = lastPoint.x - firstPoint.x;
      const dy = lastPoint.y - firstPoint.y;

      const isHorizontal = Math.abs(dx) > Math.abs(dy);
      const midX = (firstPoint.x + lastPoint.x) / 2;
      const midY = (firstPoint.y + lastPoint.y) / 2;

      let labelX = midX;
      let labelY = midY;

      if (isHorizontal) {
        labelY += fontSize * 1.5;
      } else {
        labelX -= fontSize * 1.5;
      }

      drawLabelBox(labelX, labelY, line1, line2);
    } else if (
      measurement.object_type === 'area' ||
      measurement.object_type === 'window' ||
      measurement.object_type === 'door'
    ) {
      const clippedResult = applyCutoutsToMeasurement(measurement, cutouts);

      let largestPolygon = clippedResult.points[0];
      let largestArea = 0;

      for (const polygonPoints of clippedResult.points) {
        const area = calculatePolygonArea(polygonPoints);
        if (area > largestArea) {
          largestArea = area;
          largestPolygon = polygonPoints;
        }
      }

      if (!largestPolygon || largestPolygon.length < 3) continue;

      const centroid = calculateCentroid(largestPolygon);
      const area = clippedResult.area;

      const line1 = label;
      const line2 = `${area.toFixed(2)} m²`;

      drawLabelBox(centroid.x, centroid.y, line1, line2);
    }
  }

  const planCutouts = cutouts.filter(c => c.plan_id === planId);
  const validCutouts = planCutouts.filter(cutout => {
    return measurements.some(m => m.cutout_ids?.includes(cutout.id));
  });

  for (const cutout of validCutouts) {
    if (cutout.geometry.points.length < 3) continue;

    const centroid = calculateCentroid(cutout.geometry.points);
    const area = calculatePolygonArea(cutout.geometry.points);

    const line1 = cutout.name;
    const line2 = `${area.toFixed(2)} m²`;

    drawLabelBox(centroid.x, centroid.y, line1, line2);
  }
};
