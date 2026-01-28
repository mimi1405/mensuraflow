/**
 * DXF Entity Renderer
 *
 * Purpose: Renders raw DXF entities (lines, polylines, arcs, circles) from imported CAD files.
 * This is the base layer that shows the architectural drawing background.
 */

import { DXFEntity } from '../../types';
import { Viewport } from '../canvasViewport';

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
