# Index-Based Hole Detection Fix

## Summary

Fixed critical bug where holes in Martinez polygon results were being **ADDED** instead of **SUBTRACTED**, causing net area calculations to exceed original area (impossible scenario).

**Before Fix:**
- Original: 117.7 m²
- Cutout with hole: 20.0 m²
- **Result: 137.7 m²** ❌ (hole added instead of subtracted)

**After Fix:**
- Original: 117.7 m²
- Cutout with hole: 20.0 m²
- **Result: 97.7 m²** ✓ (hole correctly subtracted)

## Root Cause

The previous implementation used **winding direction** (CW vs CCW) to classify rings as holes:

```typescript
// OLD APPROACH (BROKEN)
const outerWinding = Math.sign(signedRingArea(outerRing));
for (let i = 0; i < rings.length; i++) {
  const ringWinding = Math.sign(signedRingArea(rings[i]));
  if (ringWinding !== outerWinding) {
    netArea -= ringArea; // Subtract as hole
  } else {
    netArea += ringArea; // Add as outer - BUG HERE!
  }
}
```

**Problem:** Martinez does NOT guarantee consistent winding for holes. Some holes have the SAME winding as the outer ring, causing them to be misclassified as outer contours and ADDED to the net area.

## Solution

Martinez polygon-clipping **GUARANTEES** ring ordering:
- `rings[0]` = outer ring (ALWAYS)
- `rings[1..]` = holes (ALWAYS, regardless of winding)

New implementation uses **index-based** hole detection:

```typescript
// NEW APPROACH (CORRECT)
export function polygonNetArea(rings: Point[][]): number {
  if (rings.length === 0) return 0;
  if (rings.length === 1) return Math.abs(signedRingArea(rings[0]));

  // rings[0] is ALWAYS the outer ring
  const outerArea = Math.abs(signedRingArea(rings[0]));
  let netArea = outerArea;

  // rings[1..] are ALWAYS holes - subtract them
  for (let i = 1; i < rings.length; i++) {
    const holeArea = Math.abs(signedRingArea(rings[i]));
    netArea -= holeArea; // Always subtract
  }

  return Math.max(0, netArea);
}
```

## Changes Made

### 1. `holeDetection.ts` - Core Fix
- **Removed:** Winding-based hole detection (unreliable)
- **Added:** Index-based hole detection (reliable)
- **Simplified:** From 90 lines to 66 lines
- **Result:** Holes at `rings[1..]` are ALWAYS subtracted

### 2. `cutoutOperations.ts` - Enhanced Logging
- Added Martinez result structure logging
- Shows polygon count and ring count per polygon
- Logs: `"Polygon 0: 2 rings (1 outer + 1 holes)"`
- Enhanced invariant checks with more specific error messages
- Added warning for large deviations from expected net area

### 3. `SIGN_CONVENTIONS.md` - Updated Documentation
- Added section on winding-based bug
- Documented Martinez ring ordering guarantee
- Added code examples showing correct vs incorrect approaches
- Explained root cause and solution

### 4. `INDEX_BASED_FIX.md` - This Document
- Summary of the fix for future reference
- Clear before/after examples
- Explains why winding-based approach failed

## Validation

The fix ensures these invariants hold:

### Invariant 1: Net ≤ Original
```
if (netArea > originalArea + epsilon) {
  console.error("Holes are being ADDED instead of SUBTRACTED!");
}
```

### Invariant 2: Net ≥ 0
```
if (netArea < -epsilon) {
  console.error("Net area is negative!");
}
```

### Invariant 3: Expected Net (for fully contained cutout)
```
expectedNet = original - cutout
if (|netArea - expectedNet| > 0.1) {
  console.warn("Large deviation from expected");
}
```

## Debug Output

When applying cutouts in development mode, you'll now see:

```
[Cutout Debug] Measurement-1
  Martinez diff result: 1 polygon(s)
    Polygon 0: 2 rings (1 outer + 1 holes)
  Original area: 117.7037 m²
  Total cutout area: 19.9993 m²
  Net area returned: 97.7044 m²
  Expected net (approx): 97.7044 m²
  ✓ Invariant: net <= original
  ✓ Invariant: net >= 0

[Hole Detection] Analyzing 2 rings (INDEX-BASED):
  Ring 0 (OUTER): area=117.7037 m²
  Ring 1 (HOLE): area=19.9993 m² - SUBTRACTING
  Final net area: 97.7044 m²
```

## Testing

To verify the fix:

1. **Create a measurement** (e.g., 10×10 m = 100 m²)
2. **Create a cutout** (e.g., 2×2 m = 4 m²) fully inside the measurement
3. **Apply the cutout**
4. **Check the result:**
   - ✓ Net area should be ~96 m² (100 - 4)
   - ✗ If net area is ~104 m² (100 + 4), the bug is back

5. **Check browser console** for:
   - `✓ Invariant: net <= original`
   - `Ring 1 (HOLE): area=4.0000 m² - SUBTRACTING`

## Acceptance Criteria ✓

- [x] Holes are always subtracted (never added)
- [x] Net area never exceeds original area
- [x] Index-based detection (no winding dependency)
- [x] Comprehensive logging in dev mode
- [x] All invariants checked and logged
- [x] Build succeeds without errors
- [x] Documentation updated

## Future Considerations

**DO NOT revert to winding-based hole detection.** While winding is useful for other purposes (e.g., understanding polygon orientation), Martinez's ring ordering guarantee is the ONLY reliable way to detect holes in the result.

If Martinez ever changes this convention (unlikely), we would need to:
1. Update this code
2. Add extensive test cases
3. Document the new detection method

For now, **INDEX-BASED is the correct and only reliable approach**.
