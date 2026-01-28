/**
 * Label Renderer
 *
 * Purpose: Renders text labels for all measurements and cutouts on the canvas.
 * Shows name and calculated value (area for polygons, length for lines) in white boxes.
 * Handles layer visibility and calculates appropriate label positioning for different object types.
 */

import { Measurement, Cutout, FinishCatalogItem } from '../../types';
import { Viewport } from '../canvasViewport';
import { applyCutoutsToMeasurement, calculateCentroid, calculatePolygonArea } from '../cutoutGeometry';

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
