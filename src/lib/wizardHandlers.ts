/**
 * Project Wizard Business Logic Handlers
 *
 * This module contains all business logic for the project wizard:
 * - Project creation and validation
 * - Plan file upload handling
 * - DXF parsing and database operations
 * - Plan management (add, remove)
 * - Helper utilities for plan organization
 */

import { supabase } from './supabase';
import { parseDXFFile } from './dxfParser';
import { UploadedPlan, PLAN_TYPE_OPTIONS } from './wizardTypes';
import { PlanType } from '../types';

export interface HandleStep1NextParams {
  projectName: string;
  projectDescription: string;
  projectId: string;
  setProjectId: (id: string) => void;
  setCurrentStep: (step: number) => void;
}

export const handleStep1Next = async ({
  projectName,
  projectDescription,
  projectId,
  setProjectId,
  setCurrentStep,
}: HandleStep1NextParams) => {
  if (!projectName.trim()) {
    alert('Please enter a project name');
    return;
  }

  if (!projectId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: projectName.trim(),
        description: projectDescription.trim(),
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      alert('Failed to create project');
      console.error(error);
      return;
    }

    setProjectId(data.id);
  }

  setCurrentStep(2);
};

export interface HandleAddPlanParams {
  file: File;
  planType: PlanType;
  floorNumber?: number;
  floorName?: string;
  customName?: string;
  uploadedPlans: UploadedPlan[];
  setUploadedPlans: (plans: UploadedPlan[]) => void;
}

export const handleAddPlan = ({
  file,
  planType,
  floorNumber,
  floorName,
  customName,
  uploadedPlans,
  setUploadedPlans,
}: HandleAddPlanParams) => {
  const defaultName = planType === 'ground'
    ? `Floor ${floorNumber || 1}${floorName ? ` - ${floorName}` : ''}`
    : PLAN_TYPE_OPTIONS.find(p => p.value === planType)?.label || planType;

  const displayName = customName?.trim() || defaultName;

  setUploadedPlans([...uploadedPlans, {
    type: planType,
    floorNumber,
    floorName,
    customName,
    file,
    name: displayName
  }]);
};

export interface HandleRemovePlanParams {
  index: number;
  uploadedPlans: UploadedPlan[];
  setUploadedPlans: (plans: UploadedPlan[]) => void;
}

export const handleRemovePlan = ({
  index,
  uploadedPlans,
  setUploadedPlans,
}: HandleRemovePlanParams) => {
  setUploadedPlans(uploadedPlans.filter((_, i) => i !== index));
};

export interface HandleFinishParams {
  uploadedPlans: UploadedPlan[];
  projectId: string;
  setIsSaving: (saving: boolean) => void;
  setCurrentProject: (project: any) => void;
  setPlans: (plans: any[]) => void;
  setCurrentPlan: (plan: any) => void;
  onComplete: () => void;
}

export const handleFinish = async ({
  uploadedPlans,
  projectId,
  setIsSaving,
  setCurrentProject,
  setPlans,
  setCurrentPlan,
  onComplete,
}: HandleFinishParams) => {
  if (uploadedPlans.length === 0) {
    const confirmSkip = window.confirm('You haven\'t uploaded any plans. Are you sure you want to continue?');
    if (!confirmSkip) return;
  }

  setIsSaving(true);

  try {
    const savedPlans = [];

    for (const plan of uploadedPlans) {
      const dxfData = await parseDXFFile(plan.file);

      const planData = {
        project_id: projectId,
        name: plan.name,
        type: plan.type,
        floor_number: plan.floorNumber || 1,
        floor_name: plan.floorName || '',
        dxf_data: dxfData,
        dxf_units: dxfData.units,
        unit_scale: 1.0
      };

      const { data, error } = await supabase
        .from('plans')
        .insert(planData)
        .select()
        .single();

      if (error) throw error;
      if (data) savedPlans.push(data);
    }

    const { data: projectData } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectData) {
      setCurrentProject(projectData);
    }

    setPlans(savedPlans);
    if (savedPlans.length > 0) {
      setCurrentPlan(savedPlans[0]);
    }

    onComplete();
  } catch (error) {
    console.error('Error saving plans:', error);
    alert('Failed to save plans. Please try again.');
  } finally {
    setIsSaving(false);
  }
};

export const getPlanTypeCounts = (uploadedPlans: UploadedPlan[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  uploadedPlans.forEach(plan => {
    const key = plan.type === 'ground' ? `ground-${plan.floorNumber}` : plan.type;
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
};
