/**
 * Tool Slice
 *
 * Manages tool state and user interactions, including:
 * - Active tool selection (select, area, line, window, door, etc.)
 * - Drawing points for current operation
 * - Selected and hovered measurements/cutouts
 * - Pending line type configuration
 */

import { StateCreator } from 'zustand';
import { AppState } from './storeTypes';
import { ToolState, Point, Measurement, LineType, Cutout } from '../types';

export interface ToolSlice {
  toolState: ToolState;

  setActiveTool: (tool: ToolState['activeTool']) => void;
  setCurrentPoints: (points: Point[]) => void;
  addCurrentPoint: (point: Point) => void;
  removeLastPoint: () => void;
  clearCurrentPoints: () => void;
  setSelectedMeasurement: (measurement: Measurement | null) => void;
  setSelectedCutout: (cutout: Cutout | null) => void;
  setHoveredMeasurement: (measurement: Measurement | null) => void;
  setPendingLineType: (lineType: LineType | null) => void;
}

export const createToolSlice: StateCreator<AppState, [], [], ToolSlice> = (set) => ({
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
});
