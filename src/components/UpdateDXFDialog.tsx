import { useState } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';
import { Plan } from '../types';
import { parseDXFFile } from '../lib/dxfParser';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

interface UpdateDXFDialogProps {
  plan: Plan;
  onClose: () => void;
  onSuccess: () => void;
}

export function UpdateDXFDialog({ plan, onClose, onSuccess }: UpdateDXFDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setPlans, plans, setCurrentPlan } = useAppStore();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.dxf')) {
      setError('Please select a valid DXF file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const dxfData = await parseDXFFile(file);

      const { data: updatedPlan, error: updateError } = await supabase
        .from('plans')
        .update({
          dxf_data: dxfData,
          dxf_units: dxfData.units,
          updated_at: new Date().toISOString(),
        })
        .eq('id', plan.id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (updatedPlan) {
        const updatedPlans = plans.map(p => p.id === plan.id ? updatedPlan : p);
        setPlans(updatedPlans);
        setCurrentPlan(updatedPlan);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating DXF:', err);
      setError(err instanceof Error ? err.message : 'Failed to update DXF file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Update DXF File</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 mb-4">
            Upload a new DXF file to replace the existing data for <strong>{plan.name}</strong>.
            This will re-parse the file with improved support for blocks and layouts.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <label className="cursor-pointer">
              <span className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Choose DXF file
              </span>
              <input
                type="file"
                accept=".dxf"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500 mt-2">or drag and drop</p>
          </div>

          {isUploading && (
            <div className="mt-4 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600 mt-2">Parsing DXF file...</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-900 font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
