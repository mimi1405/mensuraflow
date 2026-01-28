/**
 * Ring Normalization and Coordinate Conversion
 *
 * Purpose: Handles preparation of polygon rings for Martinez processing:
 * - Normalizes rings by removing duplicate points, validating vertex count, and ensuring closure
 * - Converts between application Point format and Martinez coordinate array format
 * - Ensures consistent input/output for polygon clipping operations
 *
 * This module is critical for preventing Martinez from producing degenerate polygons
 * that cause area miscalculations.
 */

import { Point } from '../../types';

const EPSILON = 1e-10;

/**
 * Normalizes a ring of points for consistent Martinez processing:
 * - Removes consecutive duplicate points
 * - Ensures at least 3 unique vertices
 * - Ensures the ring is closed (first point equals last)
 */
export function normalizeRing(points: Point[]): Point[] {
  if (points.length === 0) return [];

  // Remove consecutive duplicates
  const unique: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = unique[unique.length - 1];
    const curr = points[i];
    if (Math.abs(curr.x - prev.x) > EPSILON || Math.abs(curr.y - prev.y) > EPSILON) {
      unique.push(curr);
    }
  }

  // Check if we have at least 3 unique points
  if (unique.length < 3) return [];

  // Ensure the ring is closed (first equals last)
  const first = unique[0];
  const last = unique[unique.length - 1];
  const isClosed = Math.abs(first.x - last.x) < EPSILON && Math.abs(first.y - last.y) < EPSILON;

  if (!isClosed) {
    unique.push({ ...first });
  }

  return unique;
}

/**
 * Converts points array to martinez format (array of coordinates)
 * Normalizes the ring before conversion
 */
export function pointsToCoords(points: Point[]): number[][] {
  const normalized = normalizeRing(points);
  return normalized.map(p => [p.x, p.y]);
}

/**
 * Converts martinez coordinates back to Point array
 */
export function coordsToPoints(coords: number[][]): Point[] {
  return coords.map(coord => ({ x: coord[0], y: coord[1] }));
}
