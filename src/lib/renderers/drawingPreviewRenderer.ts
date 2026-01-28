/**
 * Drawing Preview Renderer
 *
 * Purpose: Renders real-time preview of objects being drawn by the user.
 * Shows the current shape with control points and a preview line to the cursor.
 * Supports different tools (area, window, door, line, rectangle, boden) with appropriate styling.
 */

import { Point, ToolState, FinishCatalogItem } from '../../types';
import { Viewport } from '../canvasViewport';
import { getHatchStyle, renderHatchPattern } from '../hatchPatterns';

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
