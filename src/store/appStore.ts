import { create } from 'zustand';
import { Project, Plan, Measurement, MeasurementSubcomponent, SectionParameter, ToolState, Point, LineType, FloorKind, BodenMode } from '../types';

interface AppState {
  currentProject: Project | null;
  currentPlan: Plan | null;
  plans: Plan[];
  measurements: Measurement[];
  subcomponents: MeasurementSubcomponent[];
  sectionParameters: SectionParameter[];
  toolState: ToolState;

  setCurrentProject: (project: Project | null) => void;
  setCurrentPlan: (plan: Plan | null) => void;
  setPlans: (plans: Plan[]) => void;
  setMeasurements: (measurements: Measurement[]) => void;
  setSubcomponents: (subcomponents: MeasurementSubcomponent[]) => void;
  setSectionParameters: (params: SectionParameter[]) => void;

  setActiveTool: (tool: ToolState['activeTool']) => void;
  setCurrentPoints: (points: Point[]) => void;
  addCurrentPoint: (point: Point) => void;
  removeLastPoint: () => void;
  clearCurrentPoints: () => void;
  setSelectedMeasurement: (measurement: Measurement | null) => void;
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
}

export const useAppStore = create<AppState>((set) => ({
  currentProject: null,
  currentPlan: null,
  plans: [],
  measurements: [],
  subcomponents: [],
  sectionParameters: [],
  toolState: {
    activeTool: 'select',
    currentPoints: [],
    hoveredEntity: null,
    selectedMeasurement: null,
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
    toolState: { ...state.toolState, selectedMeasurement: measurement }
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
  }
}));
