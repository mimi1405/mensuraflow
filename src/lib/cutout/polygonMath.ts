/**
 * Polygon Mathematical Utilities
 *
 * Purpose: Provides fundamental polygon geometry calculations including:
 * - Signed area calculation using the shoelace formula (for winding detection)
 * - Absolute area calculation
 * - Perimeter calculation
 * - Centroid calculation for label placement
 *
 * These are pure mathematical functions with no dependencies on Martinez or cutout logic.
 */

import { Point } from '../../types';

/**
 * Calculates the SIGNED area of a polygon using the shoelace formula
 * Positive = counter-clockwise winding, Negative = clockwise winding
 * This is used internally for hole detection in MultiPolygons
 */
export function signedRingArea(points: Point[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return area / 2;
}

/**
 * Calculates the area of a polygon using the shoelace formula
 * Returns absolute (positive) area
 */
export function calculatePolygonArea(points: Point[]): number {
  return Math.abs(signedRingArea(points));
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
