/**
 * Cutout Verification and Testing (Development Only)
 *
 * Purpose: Provides comprehensive testing and invariant verification for cutout operations:
 * - Runtime invariant checking (overlap ≤ cutout area, net ≤ original, etc.)
 * - Automated test suite that runs on dev server start
 * - Detailed logging of invariant violations
 *
 * These functions only run in development mode and help catch bugs early.
 * They should have zero impact on production builds.
 */

import { Measurement, Cutout } from '../../types';
import { calculatePolygonArea } from './polygonMath';
import { applyCutoutsToMeasurement, calculateCutoutOverlapArea } from './cutoutOperations';

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
    category: '',
    unit: 'm²',
    computed_value: 100,
    geometry: {
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 }
      ]
    },
    is_positive: true,
    source: 'dxf',
    cutout_ids: ['cutout-1'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
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
