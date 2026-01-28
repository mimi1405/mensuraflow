# Cutout Sign Convention Documentation

## Problem Statement

After implementing the hole-aware Martinez fix, a sign-convention bug was discovered where applying cutouts would **increase** the measurement net area instead of decreasing it.

**Example of the bug:**
- Original measurement: 118 m²
- Cutout area: 20 m²
- Expected net: 98 m² (118 - 20)
- **Actual net: 138 m²** (118 + 20) ❌

This indicated a double-negation bug where cutouts were being added instead of subtracted.

## Root Cause

The issue could occur if:
1. Overlap areas are stored as negative values
2. The net calculation uses: `net = original - (negative overlap)`
3. This results in: `net = original + positive overlap` (double negation)

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
