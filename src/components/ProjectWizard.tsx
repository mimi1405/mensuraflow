/**
 * Project Wizard - Main Orchestrator Component
 *
 * This component coordinates the multi-step project creation wizard.
 * It manages state and delegates to specialized modules:
 * - wizardTypes: Type definitions and constants
 * - wizardHandlers: Business logic for project/plan operations
 * - wizardSteps: UI rendering for each step
 * - PlanUploadCard: Reusable plan upload component
 *
 * The wizard guides users through:
 * 1. Creating a project with name and description
 * 2. Uploading DXF plan files for various views
 * 3. Reviewing and confirming the setup
 */

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { UploadedPlan } from '../lib/wizardTypes';
import {
  handleStep1Next,
  handleAddPlan,
  handleRemovePlan,
  handleFinish,
} from '../lib/wizardHandlers';
import { WizardStep1, WizardStep2, WizardStep3 } from './wizardSteps';
import { PlanType } from '../types';

interface ProjectWizardProps {
  onComplete: () => void;
  onCancel: () => void;
  initialProjectName?: string;
  initialProjectId?: string;
}

export function ProjectWizard({ onComplete, onCancel, initialProjectName, initialProjectId }: ProjectWizardProps) {
  const [currentStep, setCurrentStep] = useState(initialProjectId ? 2 : 1);
  const [projectName, setProjectName] = useState(initialProjectName || '');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectId, setProjectId] = useState(initialProjectId || '');
  const [uploadedPlans, setUploadedPlans] = useState<UploadedPlan[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { setCurrentProject, setPlans, setCurrentPlan } = useAppStore();

  const onStep1Next = () => {
    handleStep1Next({
      projectName,
      projectDescription,
      projectId,
      setProjectId,
      setCurrentStep,
    });
  };

  const onAddPlan = (
    e: React.ChangeEvent<HTMLInputElement>,
    planType: PlanType,
    floorNumber?: number,
    floorName?: string,
    customName?: string
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    handleAddPlan({
      file,
      planType,
      floorNumber,
      floorName,
      customName,
      uploadedPlans,
      setUploadedPlans,
    });

    e.target.value = '';
  };

  const onRemovePlan = (index: number) => {
    handleRemovePlan({
      index,
      uploadedPlans,
      setUploadedPlans,
    });
  };

  const onFinish = () => {
    handleFinish({
      uploadedPlans,
      projectId,
      setIsSaving,
      setCurrentProject,
      setPlans,
      setCurrentPlan,
      onComplete,
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full">
        <div className="border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Project Setup</h1>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === currentStep
                      ? 'bg-blue-600 text-white'
                      : step < currentStep
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step < currentStep ? <Check className="w-4 h-4" /> : step}
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {['Project Info', 'Upload Plans', 'Review'].map((label, idx) => (
              <div key={idx} className="flex-1">
                <div className={`text-xs font-medium ${idx + 1 === currentStep ? 'text-blue-600' : 'text-gray-500'}`}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-8 py-8">
          {currentStep === 1 && (
            <WizardStep1
              projectName={projectName}
              projectDescription={projectDescription}
              onProjectNameChange={setProjectName}
              onProjectDescriptionChange={setProjectDescription}
              onNext={onStep1Next}
              onCancel={onCancel}
            />
          )}

          {currentStep === 2 && (
            <WizardStep2
              uploadedPlans={uploadedPlans}
              isUploading={isUploading}
              onAddPlan={onAddPlan}
              onRemovePlan={onRemovePlan}
              onBack={() => setCurrentStep(1)}
              onNext={() => setCurrentStep(3)}
            />
          )}

          {currentStep === 3 && (
            <WizardStep3
              projectName={projectName}
              projectDescription={projectDescription}
              uploadedPlans={uploadedPlans}
              isSaving={isSaving}
              onBack={() => setCurrentStep(2)}
              onFinish={onFinish}
            />
          )}
        </div>
      </div>
    </div>
  );
}
