/**
 * Project & Plan Slice
 *
 * Manages project and plan state, including:
 * - Current project selection
 * - Current plan selection
 * - List of all plans in the current project
 */

import { StateCreator } from 'zustand';
import { AppState } from './storeTypes';
import { Project, Plan } from '../types';

export interface ProjectSlice {
  currentProject: Project | null;
  currentPlan: Plan | null;
  plans: Plan[];

  setCurrentProject: (project: Project | null) => void;
  setCurrentPlan: (plan: Plan | null) => void;
  setPlans: (plans: Plan[]) => void;
}

export const createProjectSlice: StateCreator<AppState, [], [], ProjectSlice> = (set) => ({
  currentProject: null,
  currentPlan: null,
  plans: [],

  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentPlan: (plan) => set({ currentPlan: plan }),
  setPlans: (plans) => set({ plans }),
});
