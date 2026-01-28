/**
 * Cutout Geometry - Main Entry Point (Router Module)
 *
 * This module serves as the main entry point for all cutout geometry operations.
 * It re-exports functionality from specialized sub-modules to maintain backward
 * compatibility while keeping the codebase organized and maintainable.
 *
 * Module Structure:
 * ├── cutout/
 * │   ├── polygonMath.ts           - Basic polygon calculations (area, perimeter, centroid)
 * │   ├── ringNormalization.ts     - Ring normalization and coordinate conversion
 * │   ├── holeDetection.ts         - Winding-based hole detection and net area
 * │   ├── cutoutOperations.ts      - Main cutout application and overlap calculation
 * │   ├── cutoutNaming.ts          - Cutout name generation
 * │   └── cutoutVerification.ts    - Development-only testing and verification
 *
 * By splitting the original monolithic file into focused modules, we achieve:
 * - Better separation of concerns
 * - Easier testing and maintenance
 * - Clearer dependencies between components
 * - Improved code readability
 *
 * All original exports are preserved, so existing code continues to work without changes.
 */

// Re-export polygon math functions
export {
  calculatePolygonArea,
  calculatePolygonPerimeter,
  calculateCentroid
} from './cutout/polygonMath';

// Re-export cutout operations
export {
  applyCutoutsToMeasurement,
  calculateCutoutOverlapArea
} from './cutout/cutoutOperations';

// Re-export cutout naming utility
export {
  generateCutoutName
} from './cutout/cutoutNaming';

// Re-export verification functions (dev only)
export {
  verifyCutoutInvariants,
  verifyCutoutMath
} from './cutout/cutoutVerification';

// Note: Internal functions (normalizeRing, pointsToCoords, signedRingArea, etc.)
// are not exported as they are implementation details used only within the cutout modules.
