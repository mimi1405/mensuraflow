import { create } from 'zustand';
import { Project, Plan, Measurement, MeasurementSubcomponent, SectionParameter, ToolState, Point, LineType, FloorKind, BodenMode, Cutout } from '../types';

interface AppState {
  currentProject: Project | null;
  currentPlan: Plan | null;
  plans: Plan[];
  measurements: Measurement[];
  subcomponents: MeasurementSubcomponent[];
  sectionParameters: SectionParameter[];
  cutouts: Cutout[];
  toolState: ToolState;

  cutoutDraft: {
    shape_kind: 'rectangle' | 'polygon' | null;
    points: Point[];
    created_from_measurement_id: string | null;
  };
  cutoutModalStep: 'none' | 'shape' | 'scope';
  cutoutScopeSelection: string[];

  setCurrentProject: (project: Project | null) => void;
  setCurrentPlan: (plan: Plan | null) => void;
  setPlans: (plans: Plan[]) => void;
  setMeasurements: (measurements: Measurement[]) => void;
  setSubcomponents: (subcomponents: MeasurementSubcomponent[]) => void;
  setSectionParameters: (params: SectionParameter[]) => void;
  setCutouts: (cutouts: Cutout[]) => void;
  addCutout: (cutout: Cutout) => void;
  removeCutout: (id: string) => void;
  assignCutoutToMeasurements: (cutoutId: string, measurementIds: string[]) => void;
  unassignCutoutFromMeasurement: (cutoutId: string, measurementId: string) => void;

  setActiveTool: (tool: ToolState['activeTool']) => void;
  setCurrentPoints: (points: Point[]) => void;
  addCurrentPoint: (point: Point) => void;
  removeLastPoint: () => void;
  clearCurrentPoints: () => void;
  setSelectedMeasurement: (measurement: Measurement | null) => void;
  setSelectedCutout: (cutout: Cutout | null) => void;
  setHoveredMeasurement: (measurement: Measurement | null) => void;
  setPendingLineType: (lineType: LineType | null) => void;

  enableBodenMode: () => void;
  disableBodenMode: () => void;
  setBodenPanelOpen: (open: boolean) => void;
  armBodenIntent: (intent: 'ceiling' | 'roomFloor', geometryKind: 'polygon' | 'rectangle') => void;
  disarmBodenIntent: () => void;
  advanceBodenToRooms: () => void;
  setBodenFloorKind: (kind: FloorKind) => void;
  setBodenSelectedRoom: (roomId: string | null) => void;
  resetBodenMode: () => void;

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

export const useAppStore = create<AppState>((set) => ({
  currentProject: null,
  currentPlan: null,
  plans: [],
  measurements: [],
  subcomponents: [],
  sectionParameters: [],
  cutouts: [],
  toolState: {
    activeTool: 'select',
    currentPoints: [],
    hoveredEntity: null,
    selectedMeasurement: null,
    selectedCutout: null,
    hoveredMeasurement: null,
    pendingLineType: null,
    bodenMode: {
      enabled: false,
      step: 'ceiling',
      geometryKind: 'polygon',
      floorKind: 'unterlagsboden',
      isArmed: false,
      intent: null,
      panelOpen: false,
      selectedRoomId: null
    }
  },

  cutoutDraft: {
    shape_kind: null,
    points: [],
    created_from_measurement_id: null
  },
  cutoutModalStep: 'none',
  cutoutScopeSelection: [],

  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentPlan: (plan) => set({ currentPlan: plan }),
  setPlans: (plans) => set({ plans }),
  setMeasurements: (measurements) => set({ measurements }),
  setSubcomponents: (subcomponents) => set({ subcomponents }),
  setSectionParameters: (params) => set({ sectionParameters: params }),

  setActiveTool: (tool) => set((state) => ({
    toolState: { ...state.toolState, activeTool: tool }
  })),

  setCurrentPoints: (points) => set((state) => ({
    toolState: { ...state.toolState, currentPoints: points }
  })),

  addCurrentPoint: (point) => set((state) => ({
    toolState: { ...state.toolState, currentPoints: [...state.toolState.currentPoints, point] }
  })),

  removeLastPoint: () => set((state) => ({
    toolState: {
      ...state.toolState,
      currentPoints: state.toolState.currentPoints.slice(0, -1)
    }
  })),

  clearCurrentPoints: () => set((state) => ({
    toolState: { ...state.toolState, currentPoints: [] }
  })),

  setSelectedMeasurement: (measurement) => set((state) => ({
    toolState: { ...state.toolState, selectedMeasurement: measurement, selectedCutout: null }
  })),

  setSelectedCutout: (cutout) => set((state) => ({
    toolState: { ...state.toolState, selectedCutout: cutout, selectedMeasurement: null }
  })),

  setHoveredMeasurement: (measurement) => set((state) => ({
    toolState: { ...state.toolState, hoveredMeasurement: measurement }
  })),

  setPendingLineType: (lineType) => set((state) => ({
    toolState: { ...state.toolState, pendingLineType: lineType }
  })),

  enableBodenMode: () => {
    console.debug('[BodenMode] Enabling Boden mode');
    set((state) => {
      if (state.toolState.bodenMode.enabled) {
        console.debug('[BodenMode] Already enabled, keeping current state');
        return state;
      }
      return {
        toolState: {
          ...state.toolState,
          bodenMode: {
            ...state.toolState.bodenMode,
            enabled: true,
            panelOpen: true,
            step: 'ceiling'
          }
        }
      };
    });
  },

  disableBodenMode: () => {
    console.debug('[BodenMode] Disabling Boden mode');
    set((state) => ({
      toolState: {
        ...state.toolState,
        bodenMode: {
          enabled: false,
          step: 'ceiling',
          geometryKind: 'polygon',
          floorKind: 'unterlagsboden',
          isArmed: false,
          intent: null,
          panelOpen: false,
          selectedRoomId: null
        }
      }
    }));
  },

  setBodenPanelOpen: (open) => set((state) => ({
    toolState: {
      ...state.toolState,
      bodenMode: { ...state.toolState.bodenMode, panelOpen: open }
    }
  })),

  armBodenIntent: (intent, geometryKind) => {
    console.debug('[BodenMode] Arming intent:', intent, 'with geometry:', geometryKind);
    set((state) => ({
      toolState: {
        ...state.toolState,
        bodenMode: {
          ...state.toolState.bodenMode,
          isArmed: true,
          intent,
          geometryKind
        }
      }
    }));
  },

  disarmBodenIntent: () => {
    console.debug('[BodenMode] Disarming intent');
    set((state) => ({
      toolState: {
        ...state.toolState,
        bodenMode: {
          ...state.toolState.bodenMode,
          isArmed: false,
          intent: null
        }
      }
    }));
  },

  advanceBodenToRooms: () => {
    console.debug('[BodenMode] Advancing to rooms step');
    set((state) => ({
      toolState: {
        ...state.toolState,
        bodenMode: {
          ...state.toolState.bodenMode,
          step: 'rooms'
        }
      }
    }));
  },

  setBodenFloorKind: (kind) => set((state) => ({
    toolState: {
      ...state.toolState,
      bodenMode: { ...state.toolState.bodenMode, floorKind: kind }
    }
  })),

  setBodenSelectedRoom: (roomId) => {
    console.debug('[BodenMode] Setting selected room:', roomId);
    set((state) => ({
      toolState: {
        ...state.toolState,
        bodenMode: { ...state.toolState.bodenMode, selectedRoomId: roomId }
      }
    }));
  },

  resetBodenMode: () => {
    console.debug('[BodenMode] Resetting Boden mode');
    set((state) => ({
      toolState: {
        ...state.toolState,
        bodenMode: {
          enabled: false,
          step: 'ceiling',
          geometryKind: 'polygon',
          floorKind: 'unterlagsboden',
          isArmed: false,
          intent: null,
          panelOpen: false,
          selectedRoomId: null
        }
      }
    }));
  },

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

  unassignCutoutFromMeasurement: (cutoutId, measurementId) => set((state) => ({
    measurements: state.measurements.map(m =>
      m.id === measurementId
        ? {
            ...m,
            cutout_ids: m.cutout_ids?.filter(cid => cid !== cutoutId)
          }
        : m
    )
  })),

  setCutoutShapeKind: (kind) => set((state) => ({
    toolState: { ...state.toolState, cutoutShapeKind: kind }
  })),

  setCutoutSourceMeasurement: (measurementId) => set((state) => ({
    toolState: { ...state.toolState, cutoutSourceMeasurementId: measurementId }
  })),

  startCutoutFromMeasurement: (measurementId) => {
    console.debug('[Cutout] Starting cutout flow, measurementId:', measurementId);

    const state = useAppStore.getState();

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
    const state = useAppStore.getState();

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

    for (const targetId of targetIds) {
      const measurement = state.measurements.find(m => m.id === targetId);
      if (!measurement) continue;

      const updatedCutoutIds = [...(measurement.cutout_ids || []), cutoutWithId.id];

      const measurementWithCutouts = {
        ...measurement,
        cutout_ids: updatedCutoutIds
      };

      const clippedResult = applyCutoutsToMeasurement(measurementWithCutouts, allCutouts);
      const newComputedValue = clippedResult.area;

      console.debug(`[Cutout] Recalculating measurement ${targetId}: ${measurement.computed_value} -> ${newComputedValue}`);

      const { error: updateError } = await supabase
        .from('measurements')
        .update({
          cutout_ids: updatedCutoutIds,
          computed_value: newComputedValue
        })
        .eq('id', targetId);

      if (updateError) {
        console.error(`[Cutout] Error updating measurement ${targetId}:`, updateError);
      }
    }

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
  }
}));
