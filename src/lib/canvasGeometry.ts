/**
 * Geometry Utilities for Canvas Operations
 *
 * This module contains geometry calculation functions used for:
 * - Point-in-polygon detection
 * - Point-to-line distance calculations
 * - Finding measurements and cutouts at specific points
 * - Hit testing for user interactions
 */

import { Point, Measurement, Cutout } from '../types';

/**
 * Determines if a point is inside a polygon using ray casting algorithm
 */
export const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
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

/**
 * Checks if a point is near any segment of a polyline within a threshold distance
 */
export const isPointNearLine = (point: Point, linePoints: Point[], threshold: number): boolean => {
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

/**
 * Finds a measurement object at a given world point
 * Prioritizes smaller areas and higher priority objects (windows/doors)
 */
export const findMeasurementAtPoint = (
  worldPoint: Point,
  measurements: Measurement[],
  scale: number
): Measurement | null => {
  const clickThreshold = 10 / scale;
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

/**
 * Finds a cutout object at a given world point
 * Prioritizes smaller cutouts to allow precise selection
 */
export const findCutoutAtPoint = (
  worldPoint: Point,
  cutouts: Cutout[]
): Cutout | null => {
  const candidates: Array<{ cutout: Cutout; area: number }> = [];

  for (let i = cutouts.length - 1; i >= 0; i--) {
    const cutout = cutouts[i];

    if (cutout.geometry.points.length < 3) continue;

    if (isPointInPolygon(worldPoint, cutout.geometry.points)) {
      const area = Math.abs(
        cutout.geometry.points.reduce((sum, point, idx) => {
          const nextPoint = cutout.geometry.points[(idx + 1) % cutout.geometry.points.length];
          return sum + (point.x * nextPoint.y - nextPoint.x * point.y);
        }, 0) / 2
      );

      candidates.push({ cutout, area });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.area - b.area);

  return candidates[0].cutout;
};
