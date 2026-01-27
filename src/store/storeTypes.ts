/**
 * Store Type Definitions
 *
 * Central type definitions for the application store.
 * Defines the shape of the global state and all available actions.
 */

import { Project, Plan, Measurement, MeasurementSubcomponent, SectionParameter, ToolState, Point, LineType, FloorKind, Cutout } from '../types';

export interface AppState {
  // Project & Plan State
  currentProject: Project | null;
  currentPlan: Plan | null;
  plans: Plan[];

  // Measurement State
  measurements: Measurement[];
  subcomponents: MeasurementSubcomponent[];
  sectionParameters: SectionParameter[];

  // Cutout State
  cutouts: Cutout[];
  cutoutDraft: {
    shape_kind: 'rectangle' | 'polygon' | null;
    points: Point[];
    created_from_measurement_id: string | null;
  };
  cutoutModalStep: 'none' | 'shape' | 'scope';
  cutoutScopeSelection: string[];

  // Tool State
  toolState: ToolState;

  // Project & Plan Actions
  setCurrentProject: (project: Project | null) => void;
  setCurrentPlan: (plan: Plan | null) => void;
  setPlans: (plans: Plan[]) => void;

  // Measurement Actions
  setMeasurements: (measurements: Measurement[]) => void;
  setSubcomponents: (subcomponents: MeasurementSubcomponent[]) => void;
  setSectionParameters: (params: SectionParameter[]) => void;

  // Tool Actions
  setActiveTool: (tool: ToolState['activeTool']) => void;
  setCurrentPoints: (points: Point[]) => void;
  addCurrentPoint: (point: Point) => void;
  removeLastPoint: () => void;
  clearCurrentPoints: () => void;
  setSelectedMeasurement: (measurement: Measurement | null) => void;
  setSelectedCutout: (cutout: Cutout | null) => void;
  setHoveredMeasurement: (measurement: Measurement | null) => void;
  setPendingLineType: (lineType: LineType | null) => void;

  // Boden Mode Actions
  enableBodenMode: () => void;
  disableBodenMode: () => void;
  setBodenPanelOpen: (open: boolean) => void;
  armBodenIntent: (intent: 'ceiling' | 'roomFloor', geometryKind: 'polygon' | 'rectangle') => void;
  disarmBodenIntent: () => void;
  advanceBodenToRooms: () => void;
  setBodenFloorKind: (kind: FloorKind) => void;
  setBodenSelectedRoom: (roomId: string | null) => void;
  resetBodenMode: () => void;

  // Cutout Actions
  setCutouts: (cutouts: Cutout[]) => void;
  addCutout: (cutout: Cutout) => void;
  removeCutout: (id: string) => void;
  assignCutoutToMeasurements: (cutoutId: string, measurementIds: string[]) => void;
  unassignCutoutFromMeasurement: (cutoutId: string, measurementId: string) => void;
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
