/**
 * DXFCanvas Component - Main Canvas Orchestrator
 *
 * This component acts as the main orchestrator for the DXF canvas functionality.
 * It coordinates between multiple specialized modules:
 * - canvasRenderer: Handles all rendering operations
 * - canvasGeometry: Provides geometry calculations
 * - canvasViewport: Manages viewport transformations
 * - canvasInteraction: Handles user input events
 */

import { useEffect, useRef, useState } from 'react';
import { Scissors } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { Point, Measurement, FinishCatalogItem, DXFLayerVisibility, DXFRenderSettings } from '../types';
import { supabase } from '../lib/supabase';
import { FloorLayerControls } from './FloorLayerControls';
import { DXFLayerControls } from './DXFLayerControls';
import { PlanRenderSettings } from './PlanRenderSettings';

import { autoFitView, screenToWorld, Viewport } from '../lib/canvasViewport';
import {
  renderDXFEntities,
  renderFloorHatches,
  renderMeasurements,
  renderCurrentDrawing,
  renderGhostObject,
  renderCutouts,
  renderObjectLabels,
} from '../lib/canvasRenderer';
import { renderDXFRawEntities, isEntityInPaperSpace } from '../lib/rawCanvasRenderer';
import {
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleWheel,
  setupKeyboardHandlers,
  getCursorStyle,
  InteractionState,
} from '../lib/canvasInteraction';

interface DXFCanvasProps {
  onPointClick: (point: Point) => void;
  onCursorMove?: (point: Point) => void;
  isPlacingCopy?: boolean;
  copiedMeasurement?: Measurement | null;
  placementPosition?: Point | null;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onCutout?: () => void;
}

export function DXFCanvas({ onPointClick, onCursorMove, isPlacingCopy, copiedMeasurement, placementPosition, onDuplicate, onDelete, onCutout }: DXFCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewport, setViewport] = useState<Viewport>({ offsetX: 0, offsetY: 0, scale: 1 });
  const [interactionState, setInteractionStateRaw] = useState<InteractionState>({
    isDragging: false,
    lastMousePos: null,
    isDraggingObject: false,
    draggedObjectId: null,
    dragOffset: { x: 0, y: 0 },
    isSpacePressed: false,
  });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; measurement: Measurement } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null);
  const [finishCatalog, setFinishCatalog] = useState<FinishCatalogItem[]>([]);
  const [layerVisibility, setLayerVisibility] = useState({
    ceiling: true,
    roomFloor: true,
    finish: true,
  });
  const [dxfVisibility, setDxfVisibility] = useState<DXFLayerVisibility>({
    layers: {},
    types: { line: true, lwpolyline: true, arc: true, circle: true }
  });
  const [renderSettings, setRenderSettings] = useState<DXFRenderSettings>({
    renderMode: 'simplified',
    layers: {},
    types: {},
    spaces: { model: true, paper: false }
  });
  const [viewportSaveTimeout, setViewportSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const { currentPlan, measurements, cutouts, toolState, setSelectedMeasurement, setSelectedCutout, setBodenSelectedRoom, setCurrentPlan, plans, setPlans } = useAppStore();

  const setInteractionState = (state: Partial<InteractionState>) => {
    setInteractionStateRaw(prev => ({ ...prev, ...state }));
  };

  const handleLayerVisibilityChange = (layer: 'ceiling' | 'roomFloor' | 'finish', visible: boolean) => {
    setLayerVisibility(prev => ({ ...prev, [layer]: visible }));
  };

  const handleDXFLayerToggle = async (layer: string, visible: boolean) => {
    if (!currentPlan) return;

    const updatedVisibility = {
      ...dxfVisibility,
      layers: { ...dxfVisibility.layers, [layer]: visible }
    };

    setDxfVisibility(updatedVisibility);

    const { data, error } = await supabase
      .from('plans')
      .update({ dxf_layer_visibility: updatedVisibility })
      .eq('id', currentPlan.id)
      .select()
      .single();

    if (!error && data) {
      const updatedPlans = plans.map(p => p.id === currentPlan.id ? data : p);
      setPlans(updatedPlans);
      setCurrentPlan(data);
    } else if (error) {
      console.warn('Failed to persist layer visibility:', error);
    }
  };

  const handleDXFTypeToggle = async (type: 'line' | 'lwpolyline' | 'arc' | 'circle', visible: boolean) => {
    if (!currentPlan) return;

    const updatedVisibility = {
      ...dxfVisibility,
      types: { ...dxfVisibility.types, [type]: visible }
    };

    setDxfVisibility(updatedVisibility);

    const { data, error } = await supabase
      .from('plans')
      .update({ dxf_layer_visibility: updatedVisibility })
      .eq('id', currentPlan.id)
      .select()
      .single();

    if (!error && data) {
      const updatedPlans = plans.map(p => p.id === currentPlan.id ? data : p);
      setPlans(updatedPlans);
      setCurrentPlan(data);
    } else if (error) {
      console.warn('Failed to persist type visibility:', error);
    }
  };

  const handleRenderSettingsChange = async (newSettings: DXFRenderSettings) => {
    if (!currentPlan) return;

    setRenderSettings(newSettings);

    const { data, error } = await supabase
      .from('plans')
      .update({ dxf_render_settings: newSettings })
      .eq('id', currentPlan.id)
      .select()
      .single();

    if (!error && data) {
      const updatedPlans = plans.map(p => p.id === currentPlan.id ? data : p);
      setPlans(updatedPlans);
      setCurrentPlan(data);
    } else if (error) {
      console.warn('Failed to persist render settings:', error);
    }
  };

  const handleFitToView = () => {
    if (!currentPlan?.dxf_data.entities || !canvasRef.current) return;

    const newViewport = autoFitView(currentPlan.dxf_data.entities, canvasRef.current);
    setViewport(newViewport);
    persistViewport(newViewport);
  };

  const persistViewport = async (vp: Viewport) => {
    if (!currentPlan) return;

    const { data, error } = await supabase
      .from('plans')
      .update({ viewport: vp })
      .eq('id', currentPlan.id)
      .select()
      .single();

    if (!error && data) {
      const updatedPlans = plans.map(p => p.id === currentPlan.id ? data : p);
      setPlans(updatedPlans);
      setCurrentPlan(data);
    } else if (error) {
      console.warn('Failed to persist viewport:', error);
    }
  };

  const debouncedPersistViewport = (vp: Viewport) => {
    if (viewportSaveTimeout) {
      clearTimeout(viewportSaveTimeout);
    }
    const timeout = setTimeout(() => {
      persistViewport(vp);
    }, 500);
    setViewportSaveTimeout(timeout);
  };

  useEffect(() => {
    loadFinishCatalog();
  }, []);

  useEffect(() => {
    if (currentPlan?.dxf_layer_visibility) {
      setDxfVisibility(currentPlan.dxf_layer_visibility);
    } else if (currentPlan?.dxf_data?.entitiesModel) {
      const uniqueLayers = Array.from(
        new Set(currentPlan.dxf_data.entitiesModel.map(e => e.layer))
      );
      const defaultVisibility = {
        layers: Object.fromEntries(uniqueLayers.map(layer => [layer, true])),
        types: { line: true, lwpolyline: true, arc: true, circle: true }
      };
      setDxfVisibility(defaultVisibility);
    }
  }, [currentPlan?.id, currentPlan?.dxf_layer_visibility]);

  useEffect(() => {
    if (currentPlan?.dxf_render_settings) {
      setRenderSettings(currentPlan.dxf_render_settings);
    } else if (currentPlan?.dxf_data) {
      const allLayers = new Set<string>();
      currentPlan.dxf_data.entitiesModel.forEach(e => allLayers.add(e.layer));
      if (currentPlan.dxf_data.raw?.entities) {
        currentPlan.dxf_data.raw.entities.forEach((e: any) => {
          if (e.layer) allLayers.add(e.layer);
        });
      }

      const allTypes = new Set<string>();
      if (currentPlan.dxf_data.raw?.entities) {
        currentPlan.dxf_data.raw.entities.forEach((e: any) => {
          if (e.type) allTypes.add(e.type.toUpperCase());
        });
      }
      ['LINE', 'LWPOLYLINE', 'POLYLINE', 'ARC', 'CIRCLE'].forEach(t => allTypes.add(t));

      const defaultSettings = {
        renderMode: 'simplified' as const,
        layers: Object.fromEntries(Array.from(allLayers).map(l => [l, true])),
        types: Object.fromEntries(Array.from(allTypes).map(t => [t, true])),
        spaces: { model: true, paper: false }
      };
      setRenderSettings(defaultSettings);
    }
  }, [currentPlan?.id, currentPlan?.dxf_render_settings]);

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
    if (currentPlan && currentPlan.dxf_data.entities && canvasRef.current) {
      if (currentPlan.viewport &&
          currentPlan.viewport.scale > 0 &&
          isFinite(currentPlan.viewport.scale) &&
          isFinite(currentPlan.viewport.offsetX) &&
          isFinite(currentPlan.viewport.offsetY)) {
        setViewport(currentPlan.viewport);
      } else {
        const newViewport = autoFitView(currentPlan.dxf_data.entities, canvasRef.current);
        setViewport(newViewport);
        persistViewport(newViewport);
      }
    }
  }, [currentPlan?.id, canvasSize]);

  useEffect(() => {
    renderCanvas();
  }, [viewport, currentPlan, measurements, toolState, isPlacingCopy, placementPosition, cursorPosition, dxfVisibility, layerVisibility, renderSettings]);

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    return setupKeyboardHandlers({
      isSpacePressed: interactionState.isSpacePressed,
      setIsSpacePressed: (pressed) => setInteractionState({ isSpacePressed: pressed }),
      setIsDragging: (dragging) => setInteractionState({ isDragging: dragging }),
    });
  }, [interactionState.isSpacePressed]);

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

    if (currentPlan?.dxf_data) {
      if (renderSettings.renderMode === 'simplified') {
        const visibleEntities = currentPlan.dxf_data.entitiesModel.filter(entity => {
          const layerVisible = renderSettings.layers[entity.layer] !== false;
          const normalizedType = entity.type.toUpperCase();
          const typeVisible = renderSettings.types[normalizedType] !== false;
          return layerVisible && typeVisible;
        });
        renderDXFEntities(ctx, visibleEntities, viewport);
      } else if (renderSettings.renderMode === 'raw' && currentPlan.dxf_data.raw?.entities) {
        const visibleRawEntities = currentPlan.dxf_data.raw.entities.filter((entity: any) => {
          const layerVisible = renderSettings.layers[entity.layer] !== false;
          const typeVisible = renderSettings.types[entity.type?.toUpperCase()] !== false;
          const isPaper = isEntityInPaperSpace(entity);
          const spaceVisible = isPaper
            ? renderSettings.spaces?.paper !== false
            : renderSettings.spaces?.model !== false;
          return layerVisible && typeVisible && spaceVisible;
        });
        renderDXFRawEntities(ctx, visibleRawEntities, viewport);
      }
    }

    if (measurements) {
      renderFloorHatches(ctx, measurements, layerVisibility, toolState.selectedMeasurement?.id, finishCatalog);
      renderMeasurements(ctx, measurements, toolState.selectedMeasurement?.id, viewport, cutouts);
    }

    if (currentPlan) {
      renderCutouts(ctx, cutouts, measurements, currentPlan.id, toolState.selectedCutout?.id, viewport);
    }

    if (toolState.currentPoints.length > 0) {
      renderCurrentDrawing(
        ctx,
        toolState.currentPoints,
        cursorPosition,
        toolState,
        viewport,
        interactionState.isDragging,
        interactionState.isSpacePressed,
        finishCatalog
      );
    }

    if (isPlacingCopy && copiedMeasurement && placementPosition) {
      renderGhostObject(ctx, copiedMeasurement, placementPosition, viewport);
    }

    if (measurements && currentPlan) {
      renderObjectLabels(
        ctx,
        measurements,
        cutouts,
        layerVisibility,
        toolState.selectedMeasurement?.id,
        currentPlan.id,
        viewport,
        finishCatalog
      );
    }

    ctx.restore();
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
        style={{ display: 'block', cursor: getCursorStyle(interactionState.isSpacePressed, interactionState.isDragging, toolState.activeTool) }}
        onMouseDown={(e) => handleMouseDown({
          e,
          canvas: canvasRef.current,
          viewport,
          measurements,
          cutouts,
          toolState,
          isPlacingCopy: !!isPlacingCopy,
          interactionState,
          onPointClick,
          setSelectedMeasurement,
          setSelectedCutout,
          setBodenSelectedRoom,
          setContextMenu,
          setInteractionState,
        })}
        onMouseMove={(e) => handleMouseMove({
          e,
          canvas: canvasRef.current,
          viewport,
          measurements,
          interactionState,
          onCursorMove,
          setCursorPosition,
          setViewport: (vp: Viewport) => {
            setViewport(vp);
            debouncedPersistViewport(vp);
          },
          setInteractionState,
          renderCanvas,
        })}
        onMouseUp={() => handleMouseUp({
          interactionState,
          setInteractionState,
        })}
        onMouseLeave={() => handleMouseUp({
          interactionState,
          setInteractionState,
        })}
        onWheel={(e) => handleWheel({
          e,
          canvas: canvasRef.current,
          viewport,
          setViewport: (vp: Viewport) => {
            setViewport(vp);
            debouncedPersistViewport(vp);
          },
        })}
        onContextMenu={(e) => e.preventDefault()}
      />
      {currentPlan && (
        <>
          <PlanRenderSettings
            settings={renderSettings}
            onChange={handleRenderSettingsChange}
            onFit={handleFitToView}
          />
          <DXFLayerControls
            visibility={dxfVisibility}
            onLayerToggle={handleDXFLayerToggle}
            onTypeToggle={handleDXFTypeToggle}
          />
        </>
      )}
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
              onCutout?.();
            }}
          >
            <Scissors className="w-4 h-4" />
            <span>Scissor / Cutout</span>
          </button>
          <div className="border-t border-gray-200 my-1" />
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
