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
 * Normalizes a ring of points for consistent Martinez processing:
 * - Removes consecutive duplicate points
 * - Ensures at least 3 unique vertices
 * - Ensures the ring is closed (first point equals last)
 */
function normalizeRing(points: Point[]): Point[] {
  if (points.length === 0) return [];

  // Remove consecutive duplicates
  const unique: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = unique[unique.length - 1];
    const curr = points[i];
    const epsilon = 1e-10;
    if (Math.abs(curr.x - prev.x) > epsilon || Math.abs(curr.y - prev.y) > epsilon) {
      unique.push(curr);
    }
  }

  // Check if we have at least 3 unique points
  if (unique.length < 3) return [];

  // Ensure the ring is closed (first equals last)
  const first = unique[0];
  const last = unique[unique.length - 1];
  const epsilon = 1e-10;
  const isClosed = Math.abs(first.x - last.x) < epsilon && Math.abs(first.y - last.y) < epsilon;

  if (!isClosed) {
    unique.push({ ...first });
  }

  return unique;
}

/**
 * Converts points array to martinez format (array of coordinates)
 * Normalizes the ring before conversion
 */
function pointsToCoords(points: Point[]): number[][] {
  const normalized = normalizeRing(points);
  return normalized.map(p => [p.x, p.y]);
}

/**
 * Converts martinez coordinates back to Point array
 */
function coordsToPoints(coords: number[][]): Point[] {
  return coords.map(coord => ({ x: coord[0], y: coord[1] }));
}

/**
 * Calculates the SIGNED area of a polygon using the shoelace formula
 * Positive = counter-clockwise winding, Negative = clockwise winding
 * This is used internally for hole detection in MultiPolygons
 */
function signedRingArea(points: Point[]): number {
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
 * Calculates the net area of a polygon with holes using winding-based detection
 *
 * Martinez MultiPolygon format: each polygon is an array of rings.
 * We CANNOT assume rings[0] is the outer ring - we must detect by:
 * 1. The ring with largest absolute area is the outer ring
 * 2. Rings with opposite winding from outer are holes
 *
 * Returns the correct net area: outer - sum(holes)
 */
function polygonNetArea(rings: Point[][]): number {
  if (rings.length === 0) return 0;
  if (rings.length === 1) return Math.abs(signedRingArea(rings[0]));

  // Calculate signed area for each ring
  const ringAreas = rings.map(ring => ({
    ring,
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

  // Start with outer ring area
  let netArea = outerRing.absArea;

  // Subtract holes (rings with opposite winding)
  for (let i = 0; i < ringAreas.length; i++) {
    if (i === outerIdx) continue;

    const ringWinding = Math.sign(ringAreas[i].signedArea);

    // If winding is opposite to outer, it's a hole
    if (ringWinding !== 0 && outerWinding !== 0 && ringWinding !== outerWinding) {
      netArea -= ringAreas[i].absArea;
    } else {
      // Same winding as outer - it's another outer contour, add it
      netArea += ringAreas[i].absArea;
    }
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
function multiPolygonNetArea(multiPolygon: number[][][][]): number {
  if (!multiPolygon || multiPolygon.length === 0) return 0;

  let totalArea = 0;
  for (const polygon of multiPolygon) {
    // Convert coordinate rings to Point rings
    const rings = polygon.map(ring => coordsToPoints(ring));
    totalArea += polygonNetArea(rings);
  }

  return Math.abs(totalArea);
}

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

/**
 * DEV ONLY: Verifies cutout invariants for a single measurement with cutouts
 * Logs warnings when invariants are violated
 */
export function verifyCutoutInvariants(
  measurement: Measurement,
  cutout: Cutout,
  allCutouts: Cutout[]
): void {
  const epsilon = 0.001; // 1mm² tolerance

  const originalArea = calculatePolygonArea(measurement.geometry.points);
  const cutoutArea = calculatePolygonArea(cutout.geometry.points);
  const overlapArea = calculateCutoutOverlapArea(measurement, cutout);

  // Invariant 1: Overlap <= cutout area
  if (overlapArea > cutoutArea + epsilon) {
    console.error(
      `[Cutout Invariant Violation] Overlap (${overlapArea.toFixed(4)}) > Cutout area (${cutoutArea.toFixed(4)})`,
      { measurement: measurement.label, cutout: cutout.name }
    );
  }

  // Invariant 2: Overlap <= measurement area
  if (overlapArea > originalArea + epsilon) {
    console.error(
      `[Cutout Invariant Violation] Overlap (${overlapArea.toFixed(4)}) > Measurement area (${originalArea.toFixed(4)})`,
      { measurement: measurement.label, cutout: cutout.name }
    );
  }

  // Invariant 3: Net area <= original area
  const applicableCutouts = allCutouts.filter(c => measurement.cutout_ids?.includes(c.id));
  if (applicableCutouts.length > 0) {
    const result = applyCutoutsToMeasurement(measurement, applicableCutouts);
    if (result.area > originalArea + epsilon) {
      console.error(
        `[Cutout Invariant Violation] Net area (${result.area.toFixed(4)}) > Original area (${originalArea.toFixed(4)})`,
        { measurement: measurement.label }
      );
    }
  }
}

/**
 * DEV ONLY: Comprehensive verification function to test cutout area calculations
 * Tests that cutout math follows expected invariants:
 * 1. Net area <= original area
 * 2. Net area = original - overlap (for full overlap)
 * 3. Holes are subtracted correctly
 * 4. Overlap <= min(cutout area, measurement area)
 */
export function verifyCutoutMath(): void {
  console.group('[Cutout Verification] Testing area calculations');

  const epsilon = 0.0001;
  let allTestsPass = true;

  // Test 1: Rectangle with fully contained cutout
  const rect10x10: Measurement = {
    id: 'test-1',
    plan_id: 'test',
    label: 'Test Rectangle 10x10',
    object_type: 'area',
    unit: 'm²',
    computed_value: 100,
    geometry: {
      type: 'polygon',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 }
      ]
    },
    cutout_ids: ['cutout-1'],
    created_at: new Date().toISOString()
  };

  const cutout2x1: Cutout = {
    id: 'cutout-1',
    plan_id: 'test',
    name: 'Test Cutout 2x1',
    geometry: {
      shape: 'rectangle',
      points: [
        { x: 2, y: 2 },
        { x: 4, y: 2 },
        { x: 4, y: 3 },
        { x: 2, y: 3 }
      ]
    },
    created_at: new Date().toISOString()
  };

  const originalArea = calculatePolygonArea(rect10x10.geometry.points);
  const cutoutArea = calculatePolygonArea(cutout2x1.geometry.points);
  const overlapArea = calculateCutoutOverlapArea(rect10x10, cutout2x1);
  const result = applyCutoutsToMeasurement(rect10x10, [cutout2x1]);

  console.log('Test 1: Fully contained cutout');
  console.log(`  Original area: ${originalArea.toFixed(4)} m²`);
  console.log(`  Cutout area: ${cutoutArea.toFixed(4)} m²`);
  console.log(`  Overlap area: ${overlapArea.toFixed(4)} m²`);
  console.log(`  Net area after cutout: ${result.area.toFixed(4)} m²`);
  console.log(`  Expected net: ${(originalArea - cutoutArea).toFixed(4)} m²`);

  const test1Pass = Math.abs(result.area - (originalArea - cutoutArea)) < epsilon;
  console.log(`  ${test1Pass ? '✓' : '✗'} Net area matches expected (original - cutout)`);
  allTestsPass = allTestsPass && test1Pass;

  // Test 2: Verify net <= original invariant
  const test2Pass = result.area <= originalArea + epsilon;
  console.log(`  ${test2Pass ? '✓' : '✗'} Net area <= original area`);
  allTestsPass = allTestsPass && test2Pass;

  // Test 3: Verify overlap = cutout area (for full containment)
  const test3Pass = Math.abs(overlapArea - cutoutArea) < epsilon;
  console.log(`  ${test3Pass ? '✓' : '✗'} Overlap equals cutout area (full containment)`);
  allTestsPass = allTestsPass && test3Pass;

  // Test 4: Verify overlap <= cutout area
  const test4Pass = overlapArea <= cutoutArea + epsilon;
  console.log(`  ${test4Pass ? '✓' : '✗'} Overlap <= cutout area`);
  allTestsPass = allTestsPass && test4Pass;

  // Test 5: Verify overlap <= measurement area
  const test5Pass = overlapArea <= originalArea + epsilon;
  console.log(`  ${test5Pass ? '✓' : '✗'} Overlap <= measurement area`);
  allTestsPass = allTestsPass && test5Pass;

  console.log('');

  // Test 6: Partial overlap
  const partialCutout: Cutout = {
    id: 'cutout-2',
    plan_id: 'test',
    name: 'Test Cutout Partial',
    geometry: {
      shape: 'rectangle',
      points: [
        { x: 8, y: 8 },
        { x: 12, y: 8 },
        { x: 12, y: 12 },
        { x: 8, y: 12 }
      ]
    },
    created_at: new Date().toISOString()
  };

  const partialOverlap = calculateCutoutOverlapArea(rect10x10, partialCutout);
  const expectedPartialOverlap = 4; // 2x2 overlap

  console.log('Test 2: Partial overlap cutout');
  console.log(`  Cutout extends outside measurement`);
  console.log(`  Overlap area: ${partialOverlap.toFixed(4)} m²`);
  console.log(`  Expected overlap: ${expectedPartialOverlap.toFixed(4)} m²`);

  const test6Pass = Math.abs(partialOverlap - expectedPartialOverlap) < epsilon;
  console.log(`  ${test6Pass ? '✓' : '✗'} Partial overlap calculated correctly`);
  allTestsPass = allTestsPass && test6Pass;

  const test7Pass = partialOverlap <= calculatePolygonArea(partialCutout.geometry.points) + epsilon;
  console.log(`  ${test7Pass ? '✓' : '✗'} Overlap <= cutout area`);
  allTestsPass = allTestsPass && test7Pass;

  console.log('');

  if (allTestsPass) {
    console.log('✅ All cutout math verification tests PASSED');
  } else {
    console.error('❌ Some cutout math verification tests FAILED');
  }

  console.groupEnd();
}

// Auto-run verification in development mode
if (import.meta.env.DEV) {
  // Run once after module loads
  setTimeout(() => verifyCutoutMath(), 1000);
}
