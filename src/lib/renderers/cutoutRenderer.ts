/**
 * Cutout Renderer
 *
 * Purpose: Renders cutout shapes that subtract from measurement areas.
 * Shows cutouts with semi-transparent red fill and dashed borders.
 * Only displays cutouts that are currently referenced by at least one measurement.
 */

import { Cutout, Measurement } from '../../types';
import { Viewport } from '../canvasViewport';

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
