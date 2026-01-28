/**
 * Index-Based Hole Detection and Net Area Calculation
 *
 * Purpose: Implements robust area calculation for Martinez MultiPolygon results
 * using the guaranteed ring ordering convention.
 *
 * CRITICAL INSIGHT: Martinez polygon-clipping GUARANTEES ring order:
 * - rings[0] is ALWAYS the outer ring
 * - rings[1..n] are ALWAYS holes
 *
 * Winding direction is UNRELIABLE - Martinez does not guarantee consistent
 * winding for holes. Some holes may have the same winding as the outer ring.
 *
 * This module uses INDEX-BASED hole detection (not winding-based) to fix
 * the bug where holes with same winding were incorrectly added as outer rings.
 */

import { Point } from '../../types';
import { signedRingArea } from './polygonMath';
import { coordsToPoints } from './ringNormalization';

/**
 * Calculates the net area of a polygon with holes using INDEX-BASED detection
 *
 * Martinez MultiPolygon format guarantees:
 * - rings[0] = outer ring (ALWAYS)
 * - rings[1..n] = holes (ALWAYS)
 *
 * Net area = |area(rings[0])| - sum(|area(rings[i])| for i > 0)
 *
 * Returns POSITIVE net area (clamped to >= 0)
 */
export function polygonNetArea(rings: Point[][]): number {
  if (rings.length === 0) return 0;
  if (rings.length === 1) return Math.abs(signedRingArea(rings[0]));

  // rings[0] is ALWAYS the outer ring (by Martinez convention)
  const outerArea = Math.abs(signedRingArea(rings[0]));

  // DEV: Log ring analysis
  if (import.meta.env.DEV) {
    console.log(`  [Hole Detection] Analyzing ${rings.length} rings (INDEX-BASED):`);
    console.log(`    Ring 0 (OUTER): area=${outerArea.toFixed(4)} m²`);
  }

  // Start with outer ring area
  let netArea = outerArea;

  // rings[1..] are ALWAYS holes - subtract them
  for (let i = 1; i < rings.length; i++) {
    const holeArea = Math.abs(signedRingArea(rings[i]));

    if (import.meta.env.DEV) {
      console.log(`    Ring ${i} (HOLE): area=${holeArea.toFixed(4)} m² - SUBTRACTING`);
    }

    netArea -= holeArea;
  }

  if (import.meta.env.DEV) {
    console.log(`    Final net area: ${netArea.toFixed(4)} m²`);
  }

  // Net area must be non-negative (clamp to avoid floating point errors)
  return Math.max(0, netArea);
}

/**
 * Calculates the total net area of a Martinez MultiPolygon result
 *
 * MultiPolygon format: number[][][][] where:
 * - multiPolygon[i] = polygon (array of rings)
 * - multiPolygon[i][0] = outer ring coordinates (ALWAYS)
 * - multiPolygon[i][1..n] = hole ring coordinates (ALWAYS)
 *
 * For each polygon:
 * - Net area = |area(rings[0])| - sum(|area(rings[i])| for i > 0)
 *
 * Returns the sum of all polygon net areas (ALWAYS POSITIVE)
 */
export function multiPolygonNetArea(multiPolygon: number[][][][]): number {
  if (!multiPolygon || multiPolygon.length === 0) return 0;

  let totalArea = 0;
  for (const polygon of multiPolygon) {
    // Convert coordinate rings to Point rings
    const rings = polygon.map(ring => coordsToPoints(ring));
    const netArea = polygonNetArea(rings);

    if (import.meta.env.DEV && rings.length > 1) {
      console.log(`  [MultiPolygon] Polygon with ${rings.length} rings: net=${netArea.toFixed(4)} m²`);
    }

    totalArea += netArea;
  }

  return Math.abs(totalArea);
}
