/**
 * Cutout Geometry Utilities
 *
 * This module handles geometric operations for cutouts:
 * - Polygon clipping using martinez-polygon-clipping library
 * - Applying cutouts to measurement geometries
 * - Calculating area and perimeter of clipped polygons
 * - Generating unique cutout names
 */

import * as martinez from 'martinez-polygon-clipping';
import { Point, Measurement, Cutout } from '../types';

/**
 * Converts points array to martinez format (array of coordinates)
 */
function pointsToCoords(points: Point[]): number[][] {
  return points.map(p => [p.x, p.y]);
}

/**
 * Converts martinez coordinates back to Point array
 */
function coordsToPoints(coords: number[][]): Point[] {
  return coords.map(coord => ({ x: coord[0], y: coord[1] }));
}

/**
 * Calculates the area of a polygon using the shoelace formula
 */
export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

/**
 * Calculates the perimeter of a polygon
 */
export function calculatePolygonPerimeter(points: Point[]): number {
  if (points.length < 2) return 0;

  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const dx = points[j].x - points[i].x;
    const dy = points[j].y - points[i].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return perimeter;
}

/**
 * Applies cutouts to a measurement's geometry using polygon clipping
 * Returns the clipped geometry along with updated area and perimeter
 *
 * SIGN CONVENTION: The returned area is ALWAYS POSITIVE and represents
 * the NET area (original area minus cutout areas). This is the area
 * that should be stored as computed_value.
 */
export function applyCutoutsToMeasurement(
  measurement: Measurement,
  cutouts: Cutout[]
): {
  points: Point[][];
  area: number;
  perimeter: number;
} {
  if (!measurement.cutout_ids || measurement.cutout_ids.length === 0) {
    const originalArea = calculatePolygonArea(measurement.geometry.points);
    return {
      points: [measurement.geometry.points],
      area: Math.abs(originalArea),
      perimeter: calculatePolygonPerimeter(measurement.geometry.points)
    };
  }

  const applicableCutouts = cutouts.filter(c =>
    measurement.cutout_ids?.includes(c.id)
  );

  if (applicableCutouts.length === 0) {
    const originalArea = calculatePolygonArea(measurement.geometry.points);
    return {
      points: [measurement.geometry.points],
      area: Math.abs(originalArea),
      perimeter: calculatePolygonPerimeter(measurement.geometry.points)
    };
  }

  try {
    const basePolygon = [pointsToCoords(measurement.geometry.points)];

    let resultPolygon: number[][][][] = basePolygon as any;

    for (const cutout of applicableCutouts) {
      const cutoutPolygon = [pointsToCoords(cutout.geometry.points)];

      resultPolygon = martinez.diff(resultPolygon as any, cutoutPolygon as any) as any;

      if (!resultPolygon || resultPolygon.length === 0) {
        return { points: [], area: 0, perimeter: 0 };
      }
    }

    const clippedPolygons: Point[][] = [];
    let totalArea = 0;
    let totalPerimeter = 0;

    for (const multiPoly of resultPolygon) {
      for (const ring of multiPoly) {
        const points = coordsToPoints(ring);
        if (points.length >= 3) {
          clippedPolygons.push(points);
          const ringArea = calculatePolygonArea(points);
          totalArea += Math.abs(ringArea);
          totalPerimeter += calculatePolygonPerimeter(points);
        }
      }
    }

    return {
      points: clippedPolygons.length > 0 ? clippedPolygons : [measurement.geometry.points],
      area: Math.abs(totalArea),
      perimeter: totalPerimeter
    };
  } catch (error) {
    console.error('Error applying cutouts:', error);
    const fallbackArea = calculatePolygonArea(measurement.geometry.points);
    return {
      points: [measurement.geometry.points],
      area: Math.abs(fallbackArea),
      perimeter: calculatePolygonPerimeter(measurement.geometry.points)
    };
  }
}

/**
 * Generates a unique cutout name for a plan
 * Format: ./.<nn> where nn is zero-padded to 2 digits
 */
export function generateCutoutName(existingCutouts: Cutout[], planId: string): string {
  const planCutouts = existingCutouts.filter(c => c.plan_id === planId);
  const nextNumber = planCutouts.length + 1;
  return `./.${nextNumber.toString().padStart(2, '0')}`;
}

/**
 * Calculates the centroid of a polygon for label placement
 */
export function calculateCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };

  let x = 0, y = 0;
  for (const point of points) {
    x += point.x;
    y += point.y;
  }
  return {
    x: x / points.length,
    y: y / points.length
  };
}

/**
 * Calculates the overlapped area between a cutout and a measurement
 * Returns the area that is actually subtracted from the measurement
 *
 * SIGN CONVENTION: This function ALWAYS returns a POSITIVE number.
 * The UI is responsible for displaying it as negative (e.g., "-2.18 m²").
 * Never use this value with a negative sign in calculations.
 */
export function calculateCutoutOverlapArea(
  measurement: Measurement,
  cutout: Cutout
): number {
  try {
    const measurementPolygon = [pointsToCoords(measurement.geometry.points)];
    const cutoutPolygon = [pointsToCoords(cutout.geometry.points)];

    const intersection = martinez.intersection(
      measurementPolygon as any,
      cutoutPolygon as any
    ) as any;

    if (!intersection || intersection.length === 0) {
      return 0;
    }

    let totalArea = 0;
    for (const multiPoly of intersection) {
      for (const ring of multiPoly) {
        const points = coordsToPoints(ring);
        if (points.length >= 3) {
          const ringArea = calculatePolygonArea(points);
          totalArea += Math.abs(ringArea);
        }
      }
    }

    return Math.abs(totalArea);
  } catch (error) {
    console.error('Error calculating cutout overlap:', error);
    const fallbackArea = calculatePolygonArea(cutout.geometry.points);
    return Math.abs(fallbackArea);
  }
}
