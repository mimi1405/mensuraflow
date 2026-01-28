/**
 * Cutout Slice
 *
 * Manages cutout workflow and operations, including:
 * - Cutout creation flow (shape selection → drawing → scope selection → apply)
 * - Draft cutout state during creation
 * - Applying cutouts to target measurements with area recalculation
 * - Assignment and removal of cutouts from measurements
 */

import { StateCreator } from 'zustand';
import { AppState } from './storeTypes';
import { Cutout, Point } from '../types';

export interface CutoutSlice {
  cutouts: Cutout[];
  cutoutDraft: {
    shape_kind: 'rectangle' | 'polygon' | null;
    points: Point[];
    created_from_measurement_id: string | null;
  };
  cutoutModalStep: 'none' | 'shape' | 'scope';
  cutoutScopeSelection: string[];

  setCutouts: (cutouts: Cutout[]) => void;
  addCutout: (cutout: Cutout) => void;
  removeCutout: (id: string) => void;
  assignCutoutToMeasurements: (cutoutId: string, measurementIds: string[]) => void;
  unassignCutoutFromMeasurement: (cutoutId: string, measurementId: string) => Promise<void>;
  setCutoutShapeKind: (kind: 'rectangle' | 'polygon') => void;
  setCutoutSourceMeasurement: (measurementId: string | null) => void;
  startCutoutFromMeasurement: (measurementId?: string | null) => void;
  openCutoutShapeModal: () => void;
  setCutoutModalStep: (step: 'none' | 'shape' | 'scope') => void;
  selectCutoutShape: (shape: 'rectangle' | 'polygon') => void;
  finishCutoutDrawing: (points: Point[]) => void;
  setCutoutScopeSelection: (ids: string[]) => void;
  applyCutoutToTargets: (targetIds: string[]) => Promise<void>;
  cancelCutoutFlow: () => void;
}

export const createCutoutSlice: StateCreator<AppState, [], [], CutoutSlice> = (set, get) => ({
  cutouts: [],
  cutoutDraft: {
    shape_kind: null,
    points: [],
    created_from_measurement_id: null
  },
  cutoutModalStep: 'none',
  cutoutScopeSelection: [],

  setCutouts: (cutouts) => set({ cutouts }),

  addCutout: (cutout) => set((state) => ({
    cutouts: [...state.cutouts, cutout]
  })),

  removeCutout: (id) => set((state) => ({
    cutouts: state.cutouts.filter(c => c.id !== id),
    measurements: state.measurements.map(m => ({
      ...m,
      cutout_ids: m.cutout_ids?.filter(cid => cid !== id)
    }))
  })),

  assignCutoutToMeasurements: (cutoutId, measurementIds) => set((state) => ({
    measurements: state.measurements.map(m =>
      measurementIds.includes(m.id)
        ? {
            ...m,
            cutout_ids: [...(m.cutout_ids || []), cutoutId]
          }
        : m
    )
  })),

  unassignCutoutFromMeasurement: async (cutoutId, measurementId) => {
    const state = get();
    const measurement = state.measurements.find(m => m.id === measurementId);
    if (!measurement) return;

    const updatedCutoutIds = measurement.cutout_ids?.filter(cid => cid !== cutoutId) || [];

    const { supabase } = await import('../lib/supabase');
    const { applyCutoutsToMeasurement } = await import('../lib/cutoutGeometry');

    const measurementWithCutouts = {
      ...measurement,
      cutout_ids: updatedCutoutIds
    };

    // Recalculate net area with remaining cutouts
    // If no cutouts remain, this will return the original area
    const clippedResult = applyCutoutsToMeasurement(measurementWithCutouts, state.cutouts);
    const newComputedValue = Math.abs(clippedResult.area);

    // Calculate original area from geometry for validation
    const { calculatePolygonArea } = await import('../lib/cutoutGeometry');
    const originalArea = Math.abs(calculatePolygonArea(measurement.geometry.points));

    console.debug(`[Cutout] Removing cutout ${cutoutId} from measurement ${measurementId}:`);
    console.debug(`  - Original area (from geometry): ${originalArea}`);
    console.debug(`  - Current computed_value: ${measurement.computed_value}`);
    console.debug(`  - Restored computed_value: ${newComputedValue}`);
    console.debug(`  - Invariant check: ${measurement.computed_value} <= ${newComputedValue} <= ${originalArea}`);

    if (newComputedValue > originalArea + 0.0001) {
      console.error(`[Cutout] ERROR: Restored area (${newComputedValue}) is GREATER than original (${originalArea})!`);
    }

    const { error } = await supabase
      .from('measurements')
      .update({
        cutout_ids: updatedCutoutIds,
        computed_value: newComputedValue
      })
      .eq('id', measurementId);

    if (error) {
      console.error(`[Cutout] Error updating measurement ${measurementId}:`, error);
      return;
    }

    set((state) => ({
      measurements: state.measurements.map(m =>
        m.id === measurementId
          ? {
              ...m,
              cutout_ids: updatedCutoutIds,
              computed_value: newComputedValue
            }
          : m
      )
    }));
  },

  setCutoutShapeKind: (kind) => set((state) => ({
    toolState: { ...state.toolState, cutoutShapeKind: kind }
  })),

  setCutoutSourceMeasurement: (measurementId) => set((state) => ({
    toolState: { ...state.toolState, cutoutSourceMeasurementId: measurementId }
  })),

  startCutoutFromMeasurement: (measurementId) => {
    console.debug('[Cutout] Starting cutout flow, measurementId:', measurementId);

    const state = get();

    const sourceMeasurementId = measurementId || state.toolState.selectedMeasurement?.id;

    if (!sourceMeasurementId) {
      console.warn('[Cutout] No measurement selected - cannot start cutout');
      alert('Please select a measurement first before creating a cutout.');
      return;
    }

    set({
      cutoutDraft: {
        shape_kind: null,
        points: [],
        created_from_measurement_id: sourceMeasurementId
      },
      cutoutModalStep: 'shape',
      cutoutScopeSelection: [sourceMeasurementId],
      toolState: {
        ...state.toolState,
        activeTool: 'select'
      }
    });
  },

  openCutoutShapeModal: () => set({ cutoutModalStep: 'shape' }),

  setCutoutModalStep: (step) => set({ cutoutModalStep: step }),

  selectCutoutShape: (shape) => {
    console.debug('[Cutout] Selected shape:', shape);
    set((state) => ({
      cutoutDraft: { ...state.cutoutDraft, shape_kind: shape },
      cutoutModalStep: 'none',
      toolState: {
        ...state.toolState,
        activeTool: 'cutout',
        currentPoints: [],
        cutoutShapeKind: shape
      }
    }));
  },

  finishCutoutDrawing: (points) => {
    console.debug('[Cutout] Finished drawing with points:', points.length);
    set((state) => ({
      cutoutDraft: { ...state.cutoutDraft, points },
      cutoutModalStep: 'scope',
      toolState: {
        ...state.toolState,
        currentPoints: []
      }
    }));
  },

  setCutoutScopeSelection: (ids) => set({ cutoutScopeSelection: ids }),

  applyCutoutToTargets: async (targetIds) => {
    console.debug('[Cutout] Applying cutout to targets:', targetIds);
    const state = get();

    if (!state.cutoutDraft.shape_kind || state.cutoutDraft.points.length < 3) {
      console.error('[Cutout] Invalid cutout draft');
      return;
    }

    if (!state.currentPlan) {
      console.error('[Cutout] No current plan');
      return;
    }

    const { supabase } = await import('../lib/supabase');
    const { generateCutoutName, applyCutoutsToMeasurement } = await import('../lib/cutoutGeometry');

    const cutoutName = generateCutoutName(state.cutouts, state.currentPlan.id);

    const newCutout: Omit<Cutout, 'id' | 'created_at'> = {
      plan_id: state.currentPlan.id,
      name: cutoutName,
      geometry: {
        points: state.cutoutDraft.points,
        shape: state.cutoutDraft.shape_kind
      }
    };

    const { data: insertedCutout, error: cutoutError } = await supabase
      .from('cutouts')
      .insert(newCutout)
      .select()
      .single();

    if (cutoutError || !insertedCutout) {
      console.error('[Cutout] Error creating cutout:', cutoutError);
      alert('Failed to create cutout');
      return;
    }

    const cutoutWithId = insertedCutout as Cutout;
    const allCutouts = [...state.cutouts, cutoutWithId];

    const updatedMeasurements = [...state.measurements];

    for (const targetId of targetIds) {
      const measurement = state.measurements.find(m => m.id === targetId);
      if (!measurement) continue;

      const updatedCutoutIds = [...(measurement.cutout_ids || []), cutoutWithId.id];

      const measurementWithCutouts = {
        ...measurement,
        cutout_ids: updatedCutoutIds
      };

      // Calculate net area after applying cutouts
      // applyCutoutsToMeasurement returns the REMAINING area (NET area) which is always positive
      const clippedResult = applyCutoutsToMeasurement(measurementWithCutouts, allCutouts);
      const newComputedValue = Math.abs(clippedResult.area);

      // Calculate original area from geometry for validation
      const { calculatePolygonArea, calculateCutoutOverlapArea } = await import('../lib/cutoutGeometry');
      const originalArea = Math.abs(calculatePolygonArea(measurement.geometry.points));

      // Calculate total cutout overlap (must be positive)
      const totalCutoutOverlap = updatedCutoutIds
        .map(cid => {
          const cutout = allCutouts.find(c => c.id === cid);
          return cutout ? calculateCutoutOverlapArea(measurement, cutout) : 0;
        })
        .reduce((sum, area) => sum + Math.abs(area), 0);

      console.group(`[Cutout Store] Applying to ${measurement.label}`);
      console.log(`  Original area: ${originalArea.toFixed(4)} m²`);
      console.log(`  Total cutout overlap: ${totalCutoutOverlap.toFixed(4)} m²`);
      console.log(`  Net area returned: ${newComputedValue.toFixed(4)} m²`);
      console.log(`  Expected: ${originalArea.toFixed(4)} - ${totalCutoutOverlap.toFixed(4)} = ${(originalArea - totalCutoutOverlap).toFixed(4)} m²`);

      // CRITICAL INVARIANT CHECKS
      const epsilon = 0.001;

      // Invariant 1: totalCutoutOverlap must be >= 0
      if (totalCutoutOverlap < -epsilon) {
        console.error(`❌ SIGN BUG: totalCutoutOverlap is negative (${totalCutoutOverlap})`);
      }

      // Invariant 2: Net area must be <= original area
      if (newComputedValue > originalArea + epsilon) {
        console.error(`❌ SIGN BUG: Net area (${newComputedValue}) > Original (${originalArea})`);
        console.error(`  This means cutouts are being ADDED instead of SUBTRACTED!`);
      } else {
        console.log(`  ✓ Invariant: net <= original`);
      }

      // Invariant 3: Net area should equal original - totalOverlap (approximately)
      const expectedNet = originalArea - totalCutoutOverlap;
      if (Math.abs(newComputedValue - expectedNet) > epsilon) {
        console.warn(`⚠️ Net area calculation mismatch:`);
        console.warn(`  Actual: ${newComputedValue.toFixed(4)} m²`);
        console.warn(`  Expected: ${expectedNet.toFixed(4)} m²`);
        console.warn(`  Difference: ${(newComputedValue - expectedNet).toFixed(4)} m²`);
      } else {
        console.log(`  ✓ Invariant: net = original - overlap`);
      }

      console.groupEnd();

      const { error: updateError } = await supabase
        .from('measurements')
        .update({
          cutout_ids: updatedCutoutIds,
          computed_value: newComputedValue
        })
        .eq('id', targetId);

      if (updateError) {
        console.error(`[Cutout] Error updating measurement ${targetId}:`, updateError);
      } else {
        const index = updatedMeasurements.findIndex(m => m.id === targetId);
        if (index !== -1) {
          updatedMeasurements[index] = {
            ...updatedMeasurements[index],
            cutout_ids: updatedCutoutIds,
            computed_value: newComputedValue
          };
        }
      }
    }

    set((state) => ({
      cutouts: allCutouts,
      measurements: updatedMeasurements,
      cutoutDraft: {
        shape_kind: null,
        points: [],
        created_from_measurement_id: null
      },
      cutoutModalStep: 'none',
      cutoutScopeSelection: [],
      toolState: {
        ...state.toolState,
        activeTool: 'select',
        currentPoints: [],
        cutoutShapeKind: undefined
      }
    }));
  },

  cancelCutoutFlow: () => {
    console.debug('[Cutout] Cancelling cutout flow');
    set((state) => ({
      cutoutDraft: {
        shape_kind: null,
        points: [],
        created_from_measurement_id: null
      },
      cutoutModalStep: 'none',
      cutoutScopeSelection: [],
      toolState: {
        ...state.toolState,
        activeTool: 'select',
        currentPoints: [],
        cutoutShapeKind: undefined
      }
    }));
  },
});
