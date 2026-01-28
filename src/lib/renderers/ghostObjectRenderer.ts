/**
 * Ghost Object Renderer
 *
 * Purpose: Renders a semi-transparent preview of objects being copied/pasted.
 * Shows where the object will appear when the user pastes, following the cursor position.
 * Uses dashed lines and reduced opacity to distinguish from real objects.
 */

import { Measurement, Point } from '../../types';
import { Viewport } from '../canvasViewport';

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
