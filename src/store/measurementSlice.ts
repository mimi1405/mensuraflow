/**
 * Measurement Slice
 *
 * Manages measurement-related state, including:
 * - All measurements in the current plan
 * - Measurement subcomponents (windows, doors, openings)
 * - Section parameters for measurements
 */

import { StateCreator } from 'zustand';
import { AppState } from './storeTypes';
import { Measurement, MeasurementSubcomponent, SectionParameter } from '../types';

export interface MeasurementSlice {
  measurements: Measurement[];
  subcomponents: MeasurementSubcomponent[];
  sectionParameters: SectionParameter[];

  setMeasurements: (measurements: Measurement[]) => void;
  setSubcomponents: (subcomponents: MeasurementSubcomponent[]) => void;
  setSectionParameters: (params: SectionParameter[]) => void;
}

export const createMeasurementSlice: StateCreator<AppState, [], [], MeasurementSlice> = (set) => ({
  measurements: [],
  subcomponents: [],
  sectionParameters: [],

  setMeasurements: (measurements) => set({ measurements }),
  setSubcomponents: (subcomponents) => set({ subcomponents }),
  setSectionParameters: (params) => set({ sectionParameters: params }),
});
