# Cutout Sign Convention Documentation

## Problem Statement

Two related bugs were discovered in the cutout system:

### Bug 1: Sign Convention (Fixed)
After implementing hole-aware Martinez handling, a sign-convention bug was discovered where applying cutouts would **increase** the measurement net area instead of decreasing it.

**Example of the bug:**
- Original measurement: 118 m²
- Cutout area: 20 m²
- Expected net: 98 m² (118 - 20)
- **Actual net: 138 m²** (118 + 20) ❌

This indicated a double-negation bug where cutouts were being added instead of subtracted.

### Bug 2: Winding-Based Hole Detection (Fixed)
The hole detection logic used winding direction (CW/CCW) to classify rings as holes vs outer contours. This was unreliable because **Martinez does not guarantee consistent winding** for holes - some holes can have the same winding as the outer ring.

**Example of the bug:**
- Martinez returns: `[[outerRing (117.7 m²)], [holeRing (20.0 m²)]]`
- Winding check: both rings are CCW (same winding)
- **Incorrect result:** hole treated as outer contour → 117.7 + 20.0 = 137.7 m² ❌
- **Correct result:** hole subtracted → 117.7 - 20.0 = 97.7 m² ✓

## Root Causes

### Bug 1: Double Negation
The issue could occur if:
1. Overlap areas are stored as negative values
2. The net calculation uses: `net = original - (negative overlap)`
3. This results in: `net = original + positive overlap` (double negation)

### Bug 2: Unreliable Winding Detection
Martinez polygon-clipping library:
1. Does NOT guarantee ring orientation/winding
2. Can return holes with same winding as outer rings
3. Using winding to detect holes causes misclassification

## Solution: Index-Based Hole Detection

Martinez polygon-clipping **GUARANTEES** ring ordering within each polygon:
- **`rings[0]`** = outer ring (ALWAYS)
- **`rings[1..]`** = holes (ALWAYS)

This is documented in the Martinez library and is a reliable convention we can depend on.

### Implementation

```typescript
// ✓ CORRECT (Index-based)
export function polygonNetArea(rings: Point[][]): number {
  const outerArea = Math.abs(signedRingArea(rings[0]));
  let netArea = outerArea;

  // rings[1..] are ALWAYS holes - subtract them
  for (let i = 1; i < rings.length; i++) {
    const holeArea = Math.abs(signedRingArea(rings[i]));
    netArea -= holeArea;
  }

  return Math.max(0, netArea);
}

// ✗ WRONG (Winding-based - DO NOT USE)
export function polygonNetAreaWrong(rings: Point[][]): number {
  // Find outer ring by largest area
  let outerIdx = 0;
  let maxArea = Math.abs(signedRingArea(rings[0]));
  for (let i = 1; i < rings.length; i++) {
    const area = Math.abs(signedRingArea(rings[i]));
    if (area > maxArea) {
      maxArea = area;
      outerIdx = i;
    }
  }

  // Detect holes by winding - UNRELIABLE!
  const outerWinding = Math.sign(signedRingArea(rings[outerIdx]));
  let netArea = maxArea;

  for (let i = 0; i < rings.length; i++) {
    if (i === outerIdx) continue;
    const winding = Math.sign(signedRingArea(rings[i]));
    if (winding !== outerWinding) {
      netArea -= Math.abs(signedRingArea(rings[i]));
    } else {
      netArea += Math.abs(signedRingArea(rings[i])); // BUG: Adding holes!
    }
  }

  return netArea;
}
```

## Enforced Sign Conventions

### 1. Overlap Area Calculation

**Function:** `calculateCutoutOverlapArea(measurement, cutout)`

**MUST return:** Positive number `>= 0`

```typescript
// ✓ CORRECT
const overlap = calculateCutoutOverlapArea(measurement, cutout); // returns 20.41
return Math.abs(overlap); // Always positive

// ✗ WRONG
return -overlap; // Never negate!
```

### 2. Net Area Calculation

**Function:** `applyCutoutsToMeasurement(measurement, cutouts)`

**MUST return:** `{ area: positive number, ... }`

The returned `area` represents the NET remaining area after subtracting cutouts:
- Net area = Original area - Sum of overlaps
- Net area ≤ Original area (always)
- Net area ≥ 0 (always)

```typescript
// ✓ CORRECT
const netArea = multiPolygonNetArea(resultPolygon); // Positive value
return { area: netArea, ... }; // Store as positive

// ✗ WRONG
return { area: originalArea + cutoutArea, ... }; // Never add!
```

### 3. Total Cutouts Aggregation

**Formula:** `totalCutouts = sum(Math.abs(overlapArea))`

```typescript
// ✓ CORRECT
const totalCutouts = appliedCutouts.reduce((sum, c) =>
  sum + Math.abs(calculateCutoutOverlapArea(measurement, c)), 0
);

// ✗ WRONG
const totalCutouts = appliedCutouts.reduce((sum, c) =>
  sum + (-calculateCutoutOverlapArea(measurement, c)), 0
); // Never negate before summing!
```

### 4. UI Display

**Display cutouts as negative through STRING FORMATTING ONLY:**

```typescript
// ✓ CORRECT (PropertiesPanel)
<span>-{overlapArea.toFixed(4)} m²</span> // Format with minus sign
<span>-{totalCutouts.toFixed(4)} m²</span> // Format with minus sign

// ✗ WRONG
const displayValue = -overlapArea; // Don't negate the value
<span>{displayValue.toFixed(4)} m²</span>
```

### 5. Database Storage

**ALWAYS store positive values:**

```typescript
// ✓ CORRECT
await supabase.from('measurements').update({
  computed_value: Math.abs(netArea) // Store positive net area
});

// ✗ WRONG
await supabase.from('measurements').update({
  computed_value: originalArea - (-totalCutouts) // Double negation!
});
```

## Invariant Checks (Development Mode)

The following invariants are enforced in development mode with detailed logging:

### Invariant 1: Total Cutouts ≥ 0

```typescript
if (totalCutouts < -epsilon) {
  console.error('❌ SIGN BUG: totalCutouts is negative');
}
```

### Invariant 2: Net ≤ Original

```typescript
if (netArea > originalArea + epsilon) {
  console.error('❌ SIGN BUG: Net area > Original area');
  console.error('  This means cutouts are being ADDED instead of SUBTRACTED!');
}
```

### Invariant 3: Net = Original - TotalCutouts

```typescript
const expectedNet = originalArea - totalCutouts;
if (Math.abs(netArea - expectedNet) > epsilon) {
  console.warn('⚠️ Net area calculation mismatch');
}
```

## Where Validations Are Applied

1. **cutoutOperations.ts** - `applyCutoutsToMeasurement()`
   - Logs Martinez diff results
   - Validates net area calculation
   - Detects hole vs outer ring classification

2. **holeDetection.ts** - `polygonNetArea()`
   - Logs ring analysis (holes vs outers)
   - Shows winding direction detection
   - Validates area subtraction logic

3. **cutoutSlice.ts** - `applyCutoutToTargets()`
   - Validates stored computed_value
   - Checks all three invariants
   - Logs expected vs actual values

4. **PropertiesPanel.tsx** - UI display
   - Validates displayed values
   - Ensures totalCutouts is positive
   - Confirms net = original - total

5. **signConventions.ts** - Validation utilities
   - Centralized validation functions
   - Reusable across the codebase
   - Documentation of conventions

## Expected Behavior

With a 20.41 m² cutout applied to a 118.46 m² measurement:

```
✓ UI shows "Original: 118.46 m²"
✓ UI shows "Ausschnitte: -20.41 m²" (formatted with minus)
✓ UI shows "Netto: 98.05 m²"
✓ Net area NEVER increases when applying a cutout
✓ Database stores: computed_value = 98.05 (positive)
```

## Debugging

If you encounter sign bugs, check the browser console for:

```
[Cutout Debug] <measurement-name>
  Original area: X.XXXX m²
  Total cutout area: Y.YYYY m²
  Net area returned: Z.ZZZZ m²
  Expected net (approx): (X-Y).ZZZZ m²
  ✓ Invariant: net <= original
  ✓ Invariant: net >= 0

[Hole Detection] Analyzing N rings:
  Outer ring (idx 0): area=X.XXXX, winding=CCW
  Ring 1: HOLE (area=Y.YYYY) - SUBTRACTING
  Final net area: Z.ZZZZ m²

[Sign Convention Check] PropertiesPanel: <measurement-name>
  ✓ totalCutouts >= 0: Y.YYYY
  ✓ net <= original: Z.ZZZZ <= X.XXXX
  ✓ net = original - totalCutouts
```

## Summary

**Golden Rules:**
1. Store everything as POSITIVE
2. Display negatives through FORMATTING only
3. Never do: `original - (negative value)`
4. Always do: `original - (positive value)`
5. Validate invariants in dev mode
6. Trust the logging to identify issues

When in doubt: **Positive storage, negative display**.
