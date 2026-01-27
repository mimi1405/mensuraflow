import { Point } from '../types';

/**
 * Geometry Helper Functions
 *
 * Utility functions for geometric calculations including:
 * - Polygon area and perimeter calculation
 * - Point-in-polygon testing
 * - Bounding box calculations
 */

export interface PolygonGeometry {
  area: number;
  perimeter: number;
  width: number;
  length: number;
}

export function calculatePolygonGeometry(points: Point[]): PolygonGeometry {
  let area = 0;
  let perimeter = 0;

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
    const dx = points[j].x - points[i].x;
    const dy = points[j].y - points[i].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }

  area = Math.abs(area / 2);

  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));

  const width = maxX - minX;
  const length = maxY - minY;

  return { area, perimeter, width, length };
}

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y))
      && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
