/**
 * Cutout Sign Convention Enforcement
 *
 * Purpose: Documents and enforces sign conventions throughout the cutout system.
 *
 * CRITICAL SIGN CONVENTIONS:
 *
 * 1. calculateCutoutOverlapArea(measurement, cutout) MUST return a POSITIVE number (>= 0)
 *    - This represents the area of intersection
 *    - Never negative, never null
 *
 * 2. applyCutoutsToMeasurement(...) MUST return:
 *    - area: POSITIVE number representing NET area (original - cutouts)
 *    - This is the final value stored as computed_value
 *
 * 3. totalCutouts aggregation MUST be POSITIVE:
 *    - totalCutouts = sum(Math.abs(overlapArea)) for each cutout
 *    - Never negative
 *
 * 4. Net area calculation:
 *    - net = original - totalCutouts
 *    - NEVER: net = original - (negative value)
 *    - NEVER: net = original + anything
 *
 * 5. UI Display:
 *    - Cutouts shown as NEGATIVE through STRING FORMATTING ONLY
 *    - Example: `-${overlapArea.toFixed(4)} m²`
 *    - NEVER store or calculate with negative overlap values
 *
 * 6. Invariants (must hold at all times):
 *    - totalCutouts >= 0
 *    - net <= original
 *    - net = original - totalCutouts (within epsilon tolerance)
 */

/**
 * Validates that an overlap area value follows sign conventions
 * DEV ONLY: Throws error if conventions are violated
 */
export function validateOverlapArea(overlapArea: number, context?: string): void {
  if (import.meta.env.DEV) {
    if (overlapArea < -0.0001) {
      const msg = `Sign convention violation: overlap area is negative (${overlapArea})`;
      console.error(`❌ ${msg}`, context ? `Context: ${context}` : '');
      throw new Error(msg);
    }
  }
}

/**
 * Validates that a net area calculation follows sign conventions
 * DEV ONLY: Logs warnings if conventions are violated
 */
export function validateNetArea(
  netArea: number,
  originalArea: number,
  totalCutouts: number,
  context?: string
): void {
  if (!import.meta.env.DEV) return;

  const epsilon = 0.001;

  console.group(`[Sign Convention Check] ${context || 'Net Area'}`);

  // Check 1: totalCutouts must be positive
  if (totalCutouts < -epsilon) {
    console.error(`❌ totalCutouts is negative: ${totalCutouts}`);
  } else {
    console.log(`✓ totalCutouts >= 0: ${totalCutouts.toFixed(4)}`);
  }

  // Check 2: net must be <= original
  if (netArea > originalArea + epsilon) {
    console.error(`❌ net > original: ${netArea.toFixed(4)} > ${originalArea.toFixed(4)}`);
    console.error(`  Difference: ${(netArea - originalArea).toFixed(4)} m²`);
    console.error(`  This means cutouts are being ADDED instead of SUBTRACTED!`);
  } else {
    console.log(`✓ net <= original: ${netArea.toFixed(4)} <= ${originalArea.toFixed(4)}`);
  }

  // Check 3: net should equal original - totalCutouts
  const expectedNet = originalArea - totalCutouts;
  const diff = Math.abs(netArea - expectedNet);
  if (diff > epsilon) {
    console.warn(`⚠️ net ≠ original - totalCutouts`);
    console.warn(`  net: ${netArea.toFixed(4)}`);
    console.warn(`  expected: ${expectedNet.toFixed(4)}`);
    console.warn(`  difference: ${diff.toFixed(4)}`);
  } else {
    console.log(`✓ net = original - totalCutouts: ${netArea.toFixed(4)} = ${originalArea.toFixed(4)} - ${totalCutouts.toFixed(4)}`);
  }

  console.groupEnd();
}
