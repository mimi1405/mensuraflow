/**
 * Winding-Based Hole Detection and Net Area Calculation
 *
 * Purpose: Implements robust area calculation for Martinez MultiPolygon results:
 * - Detects holes in polygons using winding direction (not ring order)
 * - Calculates net area by subtracting hole areas from outer ring areas
 * - Handles Martinez's unpredictable ring ordering
 *
 * Key insight: Martinez does NOT guarantee that rings[0] is the outer ring.
 * We must detect holes by comparing winding directions and identifying the
 * ring with the largest absolute area as the outer boundary.
 *
 * This is the core module that fixes the "cutout area ≠ subtracted area" bug.
 */

import { Point } from '../../types';
import { signedRingArea } from './polygonMath';
import { coordsToPoints } from './ringNormalization';

/**
 * Calculates the net area of a polygon with holes using winding-based detection
 *
 * Martinez MultiPolygon format: each polygon is an array of rings.
 * We CANNOT assume rings[0] is the outer ring - we must detect by:
 * 1. The ring with largest absolute area is the outer ring
 * 2. Rings with opposite winding from outer are holes
 *
 * Returns the correct net area: outer - sum(holes)
 */
export function polygonNetArea(rings: Point[][]): number {
  if (rings.length === 0) return 0;
  if (rings.length === 1) return Math.abs(signedRingArea(rings[0]));

  // Calculate signed area for each ring
  const ringAreas = rings.map((ring, idx) => ({
    ring,
    idx,
    signedArea: signedRingArea(ring),
    absArea: Math.abs(signedRingArea(ring))
  }));

  // Find the outer ring (largest absolute area)
  let outerIdx = 0;
  let maxAbsArea = ringAreas[0].absArea;
  for (let i = 1; i < ringAreas.length; i++) {
    if (ringAreas[i].absArea > maxAbsArea) {
      maxAbsArea = ringAreas[i].absArea;
      outerIdx = i;
    }
  }

  const outerRing = ringAreas[outerIdx];
  const outerWinding = Math.sign(outerRing.signedArea);

  // DEV: Log ring analysis
  if (import.meta.env.DEV) {
    console.log(`  [Hole Detection] Analyzing ${ringAreas.length} rings:`);
    console.log(`    Outer ring (idx ${outerIdx}): area=${outerRing.absArea.toFixed(4)}, winding=${outerWinding > 0 ? 'CCW' : 'CW'}`);
  }

  // Start with outer ring area
  let netArea = outerRing.absArea;

  // Subtract holes (rings with opposite winding)
  for (let i = 0; i < ringAreas.length; i++) {
    if (i === outerIdx) continue;

    const ringWinding = Math.sign(ringAreas[i].signedArea);

    // If winding is opposite to outer, it's a hole
    if (ringWinding !== 0 && outerWinding !== 0 && ringWinding !== outerWinding) {
      if (import.meta.env.DEV) {
        console.log(`    Ring ${i}: HOLE (area=${ringAreas[i].absArea.toFixed(4)}) - SUBTRACTING`);
      }
      netArea -= ringAreas[i].absArea;
    } else {
      // Same winding as outer - it's another outer contour, add it
      if (import.meta.env.DEV) {
        console.log(`    Ring ${i}: OUTER (area=${ringAreas[i].absArea.toFixed(4)}) - ADDING`);
      }
      netArea += ringAreas[i].absArea;
    }
  }

  if (import.meta.env.DEV) {
    console.log(`    Final net area: ${netArea.toFixed(4)} m²`);
  }

  // Net area must be non-negative
  return Math.max(0, netArea);
}

/**
 * Calculates the total net area of a Martinez MultiPolygon result
 *
 * MultiPolygon format: number[][][][] where:
 * - multiPolygon[i] = polygon (array of rings)
 * - multiPolygon[i][0] = outer ring coordinates
 * - multiPolygon[i][1..n] = hole ring coordinates
 *
 * Returns the sum of all polygon net areas (ALWAYS POSITIVE)
 */
export function multiPolygonNetArea(multiPolygon: number[][][][]): number {
  if (!multiPolygon || multiPolygon.length === 0) return 0;

  let totalArea = 0;
  for (const polygon of multiPolygon) {
    // Convert coordinate rings to Point rings
    const rings = polygon.map(ring => coordsToPoints(ring));
    totalArea += polygonNetArea(rings);
  }

  return Math.abs(totalArea);
}
