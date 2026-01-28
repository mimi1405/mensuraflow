/**
 * Boden Mode Slice
 *
 * Manages the "Boden" (floor) feature workflow, including:
 * - Enabling/disabling Boden mode
 * - Managing the multi-step floor creation process (ceiling → rooms → finish)
 * - Room selection and floor kind configuration
 * - Intent arming/disarming for drawing operations
 */

import { StateCreator } from 'zustand';
import { AppState } from './storeTypes';
import { FloorKind } from '../types';

export interface BodenSlice {
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

export const createBodenSlice: StateCreator<AppState, [], [], BodenSlice> = (set) => ({
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
});
