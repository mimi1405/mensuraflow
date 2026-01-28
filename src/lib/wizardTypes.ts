/**
 * Project Wizard Types and Constants
 *
 * This module contains:
 * - Type definitions for wizard data structures
 * - Plan type configuration options
 * - Shared interfaces used across wizard components
 */

import { PlanType } from '../types';

export interface UploadedPlan {
  type: PlanType;
  floorNumber?: number;
  floorName?: string;
  customName?: string;
  file: File;
  name: string;
}

export interface PlanTypeOption {
  value: PlanType;
  label: string;
  requiresFloor: boolean;
}

export const PLAN_TYPE_OPTIONS: PlanTypeOption[] = [
  { value: 'ground', label: 'Floor Plan', requiresFloor: true },
  { value: 'north', label: 'North Elevation', requiresFloor: false },
  { value: 'south', label: 'South Elevation', requiresFloor: false },
  { value: 'east', label: 'East Elevation', requiresFloor: false },
  { value: 'west', label: 'West Elevation', requiresFloor: false },
  { value: 'section', label: 'Section', requiresFloor: false },
];

export interface WizardState {
  currentStep: number;
  projectName: string;
  projectDescription: string;
  projectId: string;
  uploadedPlans: UploadedPlan[];
  isUploading: boolean;
  isSaving: boolean;
}

export interface WizardActions {
  setCurrentStep: (step: number) => void;
  setProjectName: (name: string) => void;
  setProjectDescription: (description: string) => void;
  setProjectId: (id: string) => void;
  setUploadedPlans: (plans: UploadedPlan[]) => void;
  setIsUploading: (uploading: boolean) => void;
  setIsSaving: (saving: boolean) => void;
}
