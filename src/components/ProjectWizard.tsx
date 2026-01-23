import { useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Upload, X, FileText } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { parseDXFFile } from '../lib/dxfParser';
import { PlanType } from '../types';

interface UploadedPlan {
  type: PlanType;
  floorNumber?: number;
  floorName?: string;
  customName?: string;
  file: File;
  name: string;
}

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

  const planTypeOptions: { value: PlanType; label: string; requiresFloor: boolean }[] = [
    { value: 'ground', label: 'Floor Plan', requiresFloor: true },
    { value: 'north', label: 'North Elevation', requiresFloor: false },
    { value: 'south', label: 'South Elevation', requiresFloor: false },
    { value: 'east', label: 'East Elevation', requiresFloor: false },
    { value: 'west', label: 'West Elevation', requiresFloor: false },
    { value: 'section', label: 'Section', requiresFloor: false },
  ];

  const handleStep1Next = async () => {
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

  const handleAddPlan = async (e: React.ChangeEvent<HTMLInputElement>, planType: PlanType, floorNumber?: number, floorName?: string, customName?: string) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];

    const defaultName = planType === 'ground'
      ? `Floor ${floorNumber || 1}${floorName ? ` - ${floorName}` : ''}`
      : planTypeOptions.find(p => p.value === planType)?.label || planType;

    const displayName = customName?.trim() || defaultName;

    setUploadedPlans([...uploadedPlans, {
      type: planType,
      floorNumber,
      floorName,
      customName,
      file,
      name: displayName
    }]);

    e.target.value = '';
  };

  const handleRemovePlan = (index: number) => {
    setUploadedPlans(uploadedPlans.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
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

  const getPlanTypeCounts = () => {
    const counts: Record<string, number> = {};
    uploadedPlans.forEach(plan => {
      const key = plan.type === 'ground' ? `ground-${plan.floorNumber}` : plan.type;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  };

  const renderStep1 = () => (
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
          onChange={(e) => setProjectName(e.target.value)}
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
          onChange={(e) => setProjectDescription(e.target.value)}
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
          onClick={handleStep1Next}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
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
                  onClick={() => handleRemovePlan(index)}
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
          onUpload={handleAddPlan}
          requiresFloor
        />

        {!uploadedPlans.some(p => p.type === 'north') && (
          <PlanUploadCard
            title="North Elevation"
            description="View from the north side"
            planType="north"
            onUpload={handleAddPlan}
          />
        )}

        {!uploadedPlans.some(p => p.type === 'south') && (
          <PlanUploadCard
            title="South Elevation"
            description="View from the south side"
            planType="south"
            onUpload={handleAddPlan}
          />
        )}

        {!uploadedPlans.some(p => p.type === 'east') && (
          <PlanUploadCard
            title="East Elevation"
            description="View from the east side"
            planType="east"
            onUpload={handleAddPlan}
          />
        )}

        {!uploadedPlans.some(p => p.type === 'west') && (
          <PlanUploadCard
            title="West Elevation"
            description="View from the west side"
            planType="west"
            onUpload={handleAddPlan}
          />
        )}

        <PlanUploadCard
          title="Section"
          description="Cross-sectional view"
          planType="section"
          onUpload={handleAddPlan}
        />
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className="flex items-center gap-2 px-6 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-900 font-medium transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={() => setCurrentStep(3)}
          disabled={isUploading}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
        >
          Review
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
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
                const type = planTypeOptions.find(p => p.value === plan.type)?.label || plan.type;
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
          onClick={() => setCurrentStep(2)}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-900 font-medium transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={handleFinish}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
        >
          <Check className="w-5 h-5" />
          {isSaving ? 'Setting up...' : 'Finish & Start Measuring'}
        </button>
      </div>
    </div>
  );

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
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>
      </div>
    </div>
  );
}

interface PlanUploadCardProps {
  title: string;
  description: string;
  planType: PlanType;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, planType: PlanType, floorNumber?: number, floorName?: string, customName?: string) => void;
  requiresFloor?: boolean;
}

function PlanUploadCard({ title, description, planType, onUpload, requiresFloor }: PlanUploadCardProps) {
  const [floorNumber, setFloorNumber] = useState(1);
  const [floorName, setFloorName] = useState('');
  const [customName, setCustomName] = useState('');
  const [uploadKey, setUploadKey] = useState(0);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpload(e, planType, requiresFloor ? floorNumber : undefined, requiresFloor ? floorName : undefined, customName);
    setCustomName('');
    setUploadKey(prev => prev + 1);
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900">{title}</h4>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <Upload className="w-5 h-5 text-gray-400" />
      </div>

      {requiresFloor && (
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">Floor Number</label>
          <input
            type="number"
            value={floorNumber}
            onChange={(e) => setFloorNumber(parseInt(e.target.value) || 1)}
            placeholder="1 = Ground, 2+ = Upper, negative = Below"
            className="w-full text-sm bg-white px-3 py-1.5 rounded border border-gray-300"
          />
        </div>
      )}

      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">Friendly Name (optional)</label>
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder={title}
          className="w-full text-sm bg-white px-3 py-1.5 rounded border border-gray-300"
        />
      </div>

      <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer transition-colors text-sm font-medium">
        <Upload className="w-4 h-4" />
        Upload
        <input
          key={uploadKey}
          type="file"
          accept=".dxf"
          onChange={handleUpload}
          className="hidden"
        />
      </label>
    </div>
  );
}
