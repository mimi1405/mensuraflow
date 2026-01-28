/**
 * Measurement Renderer
 *
 * Purpose: Renders user-created measurement objects (areas, windows, doors, lines).
 * Applies cutouts to measurements before rendering to show net areas accurately.
 * Different object types have distinct colors and styles for easy identification.
 */

import { Measurement, Cutout } from '../../types';
import { Viewport } from '../canvasViewport';
import { applyCutoutsToMeasurement } from '../cutoutGeometry';

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
