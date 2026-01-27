/**
 * Canvas Interaction Handlers
 *
 * This module contains all event handling logic for canvas interactions:
 * - Mouse event handlers (down, move, up, wheel)
 * - Keyboard event handlers (space bar for panning)
 * - Object selection and dragging (measurements and cutouts)
 * - Context menu interactions
 * - Viewport panning and zooming
 */

import { Point, Measurement, ToolState, Cutout } from '../types';
import { findMeasurementAtPoint, findCutoutAtPoint } from './canvasGeometry';
import { screenToWorld, Viewport } from './canvasViewport';

export interface InteractionState {
  isDragging: boolean;
  lastMousePos: Point | null;
  isDraggingObject: boolean;
  draggedObjectId: string | null;
  dragOffset: Point;
  isSpacePressed: boolean;
}

export interface MouseDownHandlerProps {
  e: React.MouseEvent<HTMLCanvasElement>;
  canvas: HTMLCanvasElement | null;
  viewport: Viewport;
  measurements: Measurement[];
  cutouts: Cutout[];
  toolState: ToolState;
  isPlacingCopy: boolean;
  interactionState: InteractionState;
  onPointClick: (point: Point) => void;
  setSelectedMeasurement: (measurement: Measurement | null) => void;
  setSelectedCutout: (cutout: Cutout | null) => void;
  setBodenSelectedRoom: (id: string | null) => void;
  setContextMenu: (menu: { x: number; y: number; measurement: Measurement } | null) => void;
  setInteractionState: (state: Partial<InteractionState>) => void;
}

export const handleMouseDown = ({
  e,
  canvas,
  viewport,
  measurements,
  cutouts,
  toolState,
  isPlacingCopy,
  interactionState,
  onPointClick,
  setSelectedMeasurement,
  setSelectedCutout,
  setBodenSelectedRoom,
  setContextMenu,
  setInteractionState,
}: MouseDownHandlerProps) => {
  const worldPos = screenToWorld(e.clientX, e.clientY, canvas, viewport);

  if (e.button === 2) {
    e.preventDefault();
    const clickedMeasurement = findMeasurementAtPoint(worldPos, measurements, viewport.scale);
    if (clickedMeasurement && toolState.activeTool === 'select') {
      setSelectedMeasurement(clickedMeasurement);
      setContextMenu({ x: e.clientX, y: e.clientY, measurement: clickedMeasurement });
    }
    return;
  }

  setContextMenu(null);

  if (e.button === 1 || interactionState.isSpacePressed) {
    setInteractionState({
      isDragging: true,
      lastMousePos: { x: e.clientX, y: e.clientY }
    });
    e.preventDefault();
    return;
  }

  if (e.button === 0 && isPlacingCopy) {
    onPointClick(worldPos);
    return;
  }

  const isBodenSelectionMode = toolState.bodenMode.enabled && !toolState.bodenMode.isArmed;

  if (e.button === 0 && (toolState.activeTool === 'select' || isBodenSelectionMode)) {
    const clickedCutout = findCutoutAtPoint(worldPos, cutouts);

    if (clickedCutout) {
      setSelectedCutout(clickedCutout);
      return;
    }

    const clickedMeasurement = findMeasurementAtPoint(worldPos, measurements, viewport.scale);

    if (clickedMeasurement) {
      setSelectedMeasurement(clickedMeasurement);

      if (isBodenSelectionMode && clickedMeasurement.floor_category === 'roomFloor') {
        console.debug('[BodenSelect] Room clicked:', clickedMeasurement.id);
        setBodenSelectedRoom(clickedMeasurement.id);
      } else if (isBodenSelectionMode) {
        setBodenSelectedRoom(null);
      }

      if (toolState.activeTool === 'select') {
        const centroid = clickedMeasurement.geometry.points.reduce(
          (acc, p) => ({ x: acc.x + p.x / clickedMeasurement.geometry.points.length, y: acc.y + p.y / clickedMeasurement.geometry.points.length }),
          { x: 0, y: 0 }
        );
        setInteractionState({
          isDraggingObject: true,
          draggedObjectId: clickedMeasurement.id,
          dragOffset: { x: worldPos.x - centroid.x, y: worldPos.y - centroid.y },
          lastMousePos: { x: e.clientX, y: e.clientY }
        });
      }
    } else {
      setSelectedMeasurement(null);
      if (isBodenSelectionMode) {
        setBodenSelectedRoom(null);
      }
    }
  } else if (e.button === 0 && toolState.activeTool === 'pan') {
    setInteractionState({
      isDragging: true,
      lastMousePos: { x: e.clientX, y: e.clientY }
    });
  } else if (e.button === 0 && toolState.activeTool !== 'select' && toolState.activeTool !== 'pan' && !isBodenSelectionMode) {
    onPointClick(worldPos);
  }
};

export interface MouseMoveHandlerProps {
  e: React.MouseEvent<HTMLCanvasElement>;
  canvas: HTMLCanvasElement | null;
  viewport: Viewport;
  measurements: Measurement[];
  interactionState: InteractionState;
  onCursorMove?: (point: Point) => void;
  setCursorPosition: (point: Point) => void;
  setViewport: (viewport: Viewport) => void;
  setInteractionState: (state: Partial<InteractionState>) => void;
  renderCanvas: () => void;
}

export const handleMouseMove = ({
  e,
  canvas,
  viewport,
  measurements,
  interactionState,
  onCursorMove,
  setCursorPosition,
  setViewport,
  setInteractionState,
  renderCanvas,
}: MouseMoveHandlerProps) => {
  const worldPos = screenToWorld(e.clientX, e.clientY, canvas, viewport);

  setCursorPosition(worldPos);

  if (onCursorMove) {
    onCursorMove(worldPos);
  }

  if (interactionState.isDraggingObject && interactionState.draggedObjectId && interactionState.lastMousePos) {
    const draggedMeasurement = measurements.find(m => m.id === interactionState.draggedObjectId);

    if (draggedMeasurement) {
      const centroid = draggedMeasurement.geometry.points.reduce(
        (acc, p) => ({ x: acc.x + p.x / draggedMeasurement.geometry.points.length, y: acc.y + p.y / draggedMeasurement.geometry.points.length }),
        { x: 0, y: 0 }
      );

      const newCentroid = { x: worldPos.x - interactionState.dragOffset.x, y: worldPos.y - interactionState.dragOffset.y };
      const deltaX = newCentroid.x - centroid.x;
      const deltaY = newCentroid.y - centroid.y;

      renderCanvas();
    }
    setInteractionState({
      lastMousePos: { x: e.clientX, y: e.clientY }
    });
  } else if (interactionState.isDragging && interactionState.lastMousePos) {
    const dx = e.clientX - interactionState.lastMousePos.x;
    const dy = e.clientY - interactionState.lastMousePos.y;

    setViewport({
      ...viewport,
      offsetX: viewport.offsetX + dx,
      offsetY: viewport.offsetY + dy
    });

    setInteractionState({
      lastMousePos: { x: e.clientX, y: e.clientY }
    });
  }
};

export interface MouseUpHandlerProps {
  interactionState: InteractionState;
  setInteractionState: (state: Partial<InteractionState>) => void;
}

export const handleMouseUp = ({
  interactionState,
  setInteractionState,
}: MouseUpHandlerProps) => {
  if (interactionState.isDraggingObject && interactionState.draggedObjectId) {
    setInteractionState({
      isDraggingObject: false,
      draggedObjectId: null
    });
  }
  setInteractionState({
    isDragging: false,
    lastMousePos: null
  });
};

export interface WheelHandlerProps {
  e: React.WheelEvent<HTMLCanvasElement>;
  canvas: HTMLCanvasElement | null;
  viewport: Viewport;
  setViewport: (viewport: Viewport) => void;
}

export const handleWheel = ({
  e,
  canvas,
  viewport,
  setViewport,
}: WheelHandlerProps) => {
  e.preventDefault();

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

export interface KeyboardHandlerProps {
  isSpacePressed: boolean;
  setIsSpacePressed: (pressed: boolean) => void;
  setIsDragging: (dragging: boolean) => void;
}

export const setupKeyboardHandlers = ({
  isSpacePressed,
  setIsSpacePressed,
  setIsDragging,
}: KeyboardHandlerProps) => {
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
};

export const getCursorStyle = (
  isSpacePressed: boolean,
  isDragging: boolean,
  activeTool: string
): string => {
  if (isSpacePressed || isDragging) return 'grab';
  if (activeTool === 'pan') return 'grab';
  if (activeTool === 'select') return 'default';
  return 'crosshair';
};
