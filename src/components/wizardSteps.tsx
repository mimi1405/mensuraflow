/**
 * Project Wizard Step Components
 *
 * This module contains the UI rendering for each wizard step:
 * - Step 1: Project information (name, description)
 * - Step 2: Plan upload interface with multiple plan types
 * - Step 3: Review and confirmation before saving
 *
 * Each step is a pure presentational component that receives props
 * and triggers callbacks for user interactions.
 */

import { ChevronLeft, ChevronRight, Check, X, FileText } from 'lucide-react';
import { UploadedPlan, PLAN_TYPE_OPTIONS } from '../lib/wizardTypes';
import { PlanType } from '../types';
import { PlanUploadCard } from './PlanUploadCard';

export interface Step1Props {
  projectName: string;
  projectDescription: string;
  onProjectNameChange: (name: string) => void;
  onProjectDescriptionChange: (description: string) => void;
  onNext: () => void;
  onCancel: () => void;
}

export function WizardStep1({
  projectName,
  projectDescription,
  onProjectNameChange,
  onProjectDescriptionChange,
  onNext,
  onCancel,
}: Step1Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Create Your Project</h2>
        <p className="text-gray-600">Let's start by naming your project</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Name *
        </label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          placeholder="e.g., Residential Building A"
          className="w-full bg-white text-gray-900 px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description (optional)
        </label>
        <textarea
          value={projectDescription}
          onChange={(e) => onProjectDescriptionChange(e.target.value)}
          placeholder="Add notes about the project..."
          rows={4}
          className="w-full bg-white text-gray-900 px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-900 font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export interface Step2Props {
  uploadedPlans: UploadedPlan[];
  isUploading: boolean;
  onAddPlan: (e: React.ChangeEvent<HTMLInputElement>, planType: PlanType, floorNumber?: number, floorName?: string, customName?: string) => void;
  onRemovePlan: (index: number) => void;
  onBack: () => void;
  onNext: () => void;
}

export function WizardStep2({
  uploadedPlans,
  isUploading,
  onAddPlan,
  onRemovePlan,
  onBack,
  onNext,
}: Step2Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Upload Plans</h2>
        <p className="text-gray-600">Add your DXF files for different views and floors</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">Plan Types:</p>
            <ul className="list-disc list-inside space-y-0.5 text-gray-600">
              <li>Floor Plans: Upload for each floor level</li>
              <li>Elevations: North, South, East, West views</li>
              <li>Sections: Cross-sectional views</li>
            </ul>
          </div>
        </div>
      </div>

      {uploadedPlans.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Uploaded Plans ({uploadedPlans.length})</h3>
          <div className="space-y-2">
            {uploadedPlans.map((plan, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{plan.name}</p>
                    <p className="text-xs text-gray-500">{plan.file.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemovePlan(index)}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlanUploadCard
          title="Floor Plans"
          description="Upload plans for each floor"
          planType="ground"
          onUpload={onAddPlan}
          requiresFloor
        />

        {!uploadedPlans.some(p => p.type === 'north') && (
          <PlanUploadCard
            title="North Elevation"
            description="View from the north side"
            planType="north"
            onUpload={onAddPlan}
          />
        )}

        {!uploadedPlans.some(p => p.type === 'south') && (
          <PlanUploadCard
            title="South Elevation"
            description="View from the south side"
            planType="south"
            onUpload={onAddPlan}
          />
        )}

        {!uploadedPlans.some(p => p.type === 'east') && (
          <PlanUploadCard
            title="East Elevation"
            description="View from the east side"
            planType="east"
            onUpload={onAddPlan}
          />
        )}

        {!uploadedPlans.some(p => p.type === 'west') && (
          <PlanUploadCard
            title="West Elevation"
            description="View from the west side"
            planType="west"
            onUpload={onAddPlan}
          />
        )}

        <PlanUploadCard
          title="Section"
          description="Cross-sectional view"
          planType="section"
          onUpload={onAddPlan}
        />
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-900 font-medium transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isUploading}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
        >
          Review
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export interface Step3Props {
  projectName: string;
  projectDescription: string;
  uploadedPlans: UploadedPlan[];
  isSaving: boolean;
  onBack: () => void;
  onFinish: () => void;
}

export function WizardStep3({
  projectName,
  projectDescription,
  uploadedPlans,
  isSaving,
  onBack,
  onFinish,
}: Step3Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Review & Finish</h2>
        <p className="text-gray-600">Review your project setup before starting</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Project Name</h3>
          <p className="text-lg font-semibold text-gray-900">{projectName}</p>
        </div>

        {projectDescription && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
            <p className="text-gray-700">{projectDescription}</p>
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Plans ({uploadedPlans.length})</h3>

        {uploadedPlans.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No plans uploaded yet</p>
            <p className="text-sm text-gray-400 mt-1">You can add plans later from the editor</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(
              uploadedPlans.reduce((acc, plan) => {
                const type = PLAN_TYPE_OPTIONS.find(p => p.value === plan.type)?.label || plan.type;
                if (!acc[type]) acc[type] = [];
                acc[type].push(plan);
                return acc;
              }, {} as Record<string, UploadedPlan[]>)
            ).map(([type, plans]) => (
              <div key={type} className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">{type} ({plans.length})</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  {plans.map((plan, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      {plan.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-900 font-medium transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={onFinish}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
        >
          <Check className="w-5 h-5" />
          {isSaving ? 'Setting up...' : 'Finish & Start Measuring'}
        </button>
      </div>
    </div>
  );
}
