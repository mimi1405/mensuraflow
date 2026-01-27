/**
 * Application Store - Main Router
 *
 * This is the central store that combines all feature slices.
 * It acts as a router, merging state and actions from:
 * - projectSlice: Project and plan management
 * - measurementSlice: Measurement and subcomponent management
 * - toolSlice: Tool state and selection management
 * - bodenSlice: Boden (floor) mode workflow
 * - cutoutSlice: Cutout creation and management
 *
 * This structure maintains backward compatibility while providing
 * better code organization and maintainability.
 */

import { create } from 'zustand';
import { AppState } from './storeTypes';
import { createProjectSlice } from './projectSlice';
import { createMeasurementSlice } from './measurementSlice';
import { createToolSlice } from './toolSlice';
import { createBodenSlice } from './bodenSlice';
import { createCutoutSlice } from './cutoutSlice';

export const useAppStore = create<AppState>()((...a) => ({
  ...createProjectSlice(...a),
  ...createMeasurementSlice(...a),
  ...createToolSlice(...a),
  ...createBodenSlice(...a),
  ...createCutoutSlice(...a),
}));
