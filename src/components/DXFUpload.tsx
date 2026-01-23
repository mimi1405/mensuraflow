import { useState } from 'react';
import { Upload } from 'lucide-react';
import { parseDXFFile } from '../lib/dxfParser';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { PlanType } from '../types';

export function DXFUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPlanType, setSelectedPlanType] = useState<PlanType>('ground');
  const [planName, setPlanName] = useState('');
  const [floorNumber, setFloorNumber] = useState(1);
  const { currentProject, plans, setPlans, setCurrentPlan } = useAppStore();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!currentProject) {
      alert('Please select a project first');
      return;
    }

    const file = e.target.files[0];
    setIsUploading(true);

    try {
      const dxfData = await parseDXFFile(file);

      const defaultName = selectedPlanType === 'ground'
        ? `Floor ${floorNumber}`
        : getPlanTypeLabel();

      const planData = {
        project_id: currentProject.id,
        name: planName || defaultName,
        type: selectedPlanType,
        floor_number: selectedPlanType === 'ground' ? floorNumber : 1,
        floor_name: '',
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

      if (data) {
        const updatedPlans = [...plans, data];
        setPlans(updatedPlans);
        setCurrentPlan(data);
        setPlanName('');

        const typeLabel = selectedPlanType === 'ground'
          ? `floor plan (Floor ${floorNumber})`
          : selectedPlanType === 'section'
          ? 'section'
          : `${selectedPlanType} elevation`;

        alert(`DXF uploaded successfully as ${typeLabel}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload DXF file. Please check the file format.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const getPlanTypeLabel = () => {
    if (selectedPlanType === 'ground') return 'Floor Plan';
    if (selectedPlanType === 'section') return 'Section';
    return `${selectedPlanType.charAt(0).toUpperCase() + selectedPlanType.slice(1)} Elevation`;
  };

  if (!currentProject) {
    return (
      <div className="p-4 bg-gray-100 border border-gray-300 rounded text-gray-600">
        Please select or create a project first
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-100 border border-gray-300 rounded">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload DXF Plan</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Plan Type
          </label>
          <select
            value={selectedPlanType}
            onChange={(e) => setSelectedPlanType(e.target.value as PlanType)}
            className="w-full bg-white text-gray-900 px-4 py-2 rounded border border-gray-300"
          >
            <option value="ground">Floor Plan</option>
            <option value="north">North Elevation</option>
            <option value="south">South Elevation</option>
            <option value="east">East Elevation</option>
            <option value="west">West Elevation</option>
            <option value="section">Section</option>
          </select>
        </div>

        {selectedPlanType === 'ground' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Floor Number
            </label>
            <input
              type="number"
              value={floorNumber}
              onChange={(e) => setFloorNumber(parseInt(e.target.value) || 1)}
              placeholder="1 = Ground, 2+ = Upper, negative = Below"
              className="w-full bg-white text-gray-900 px-4 py-2 rounded border border-gray-300"
            />
            <p className="text-xs text-gray-500 mt-1">Negative = Below ground, 1 = Ground, 2+ = Upper floors</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Friendly Name (optional)
          </label>
          <input
            type="text"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder={getPlanTypeLabel()}
            className="w-full bg-white text-gray-900 px-4 py-2 rounded border border-gray-300"
          />
        </div>

        <div>
          <label className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 transition-colors">
            <Upload className="w-5 h-5" />
            <span>{isUploading ? 'Uploading...' : 'Select DXF File'}</span>
            <input
              type="file"
              accept=".dxf"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
