/**
 * Cutout Operations - Core Polygon Clipping Logic
 *
 * Purpose: Implements the main cutout application and overlap calculation:
 * - Applies cutouts to measurements using Martinez difference operation
 * - Calculates overlap area using Martinez intersection operation
 * - Uses hole-aware area calculation to ensure mathematical correctness
 * - Includes development-mode invariant checking
 *
 * This module orchestrates the polygon clipping operations and ensures that
 * "cutout area shown" equals "area actually subtracted" by using consistent
 * hole-aware area calculations throughout.
 */

import * as martinez from 'martinez-polygon-clipping';
import { Point, Measurement, Cutout } from '../../types';
import { calculatePolygonArea, calculatePolygonPerimeter } from './polygonMath';
import { pointsToCoords, coordsToPoints } from './ringNormalization';
import { multiPolygonNetArea } from './holeDetection';

/**
 * Applies cutouts to a measurement's geometry using polygon clipping
 * Returns the clipped geometry along with updated area and perimeter
 *
 * SIGN CONVENTION: The returned area is ALWAYS POSITIVE and represents
 * the NET area (original area minus cutout areas). This is the area
 * that should be stored as computed_value.
 *
 * HOLE HANDLING: Martinez diff() can return polygons with holes.
 * We correctly compute net area as (outer - holes) for each polygon.
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

    // Apply each cutout sequentially using martinez.diff
    for (const cutout of applicableCutouts) {
      const cutoutPolygon = [pointsToCoords(cutout.geometry.points)];

      resultPolygon = martinez.diff(resultPolygon as any, cutoutPolygon as any) as any;

      if (!resultPolygon || resultPolygon.length === 0) {
        return { points: [], area: 0, perimeter: 0 };
      }
    }

    // Calculate net area using hole-aware logic
    const netArea = multiPolygonNetArea(resultPolygon);

    // DEV: Log area calculation for debugging
    if (import.meta.env.DEV) {
      const originalArea = calculatePolygonArea(measurement.geometry.points);
      if (netArea > originalArea + 0.001) {
        console.warn(
          `[Cutout Warning] Net area (${netArea.toFixed(4)}) > Original area (${originalArea.toFixed(4)})`,
          { measurement: measurement.label, cutoutCount: applicableCutouts.length }
        );
      }
    }

    // Collect all rings for rendering (both outer rings and holes)
    // The renderer will need to distinguish between outer and inner rings
    const clippedPolygons: Point[][] = [];
    let totalPerimeter = 0;

    for (const polygon of resultPolygon) {
      for (const ring of polygon) {
        const points = coordsToPoints(ring);
        if (points.length >= 3) {
          clippedPolygons.push(points);
          // Only add outer ring perimeter (index 0 of each polygon)
          if (polygon.indexOf(ring) === 0) {
            totalPerimeter += calculatePolygonPerimeter(points);
          }
        }
      }
    }

    return {
      points: clippedPolygons.length > 0 ? clippedPolygons : [measurement.geometry.points],
      area: netArea,
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
 * Calculates the overlapped area between a cutout and a measurement
 * Returns the area that is actually subtracted from the measurement
 *
 * SIGN CONVENTION: This function ALWAYS returns a POSITIVE number.
 * The UI is responsible for displaying it as negative (e.g., "-2.18 m²").
 * Never use this value with a negative sign in calculations.
 *
 * HOLE HANDLING: Martinez intersection() can return polygons with holes.
 * We correctly compute net overlap area as (outer - holes) for each polygon.
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

    // Use hole-aware area calculation for intersection result
    const overlapArea = multiPolygonNetArea(intersection);

    // DEV: Verify overlap invariants
    if (import.meta.env.DEV) {
      const cutoutArea = calculatePolygonArea(cutout.geometry.points);
      const measurementArea = calculatePolygonArea(measurement.geometry.points);

      if (overlapArea > cutoutArea + 0.001) {
        console.warn(
          `[Overlap Warning] Overlap (${overlapArea.toFixed(4)}) > Cutout area (${cutoutArea.toFixed(4)})`,
          { measurement: measurement.label, cutout: cutout.name }
        );
      }

      if (overlapArea > measurementArea + 0.001) {
        console.warn(
          `[Overlap Warning] Overlap (${overlapArea.toFixed(4)}) > Measurement area (${measurementArea.toFixed(4)})`,
          { measurement: measurement.label, cutout: cutout.name }
        );
      }
    }

    return Math.abs(overlapArea);
  } catch (error) {
    console.error('Error calculating cutout overlap:', error);
    // Fallback: use full cutout area (assume complete overlap)
    const fallbackArea = calculatePolygonArea(cutout.geometry.points);
    return Math.abs(fallbackArea);
  }
}
