/**
 * Plan Upload Card Component
 *
 * This component provides a card interface for uploading individual DXF plan files.
 * Features:
 * - File input for DXF files
 * - Optional floor number input for floor plans
 * - Custom naming for uploaded plans
 * - Visual feedback and upload button
 */

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { PlanType } from '../types';

interface PlanUploadCardProps {
  title: string;
  description: string;
  planType: PlanType;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, planType: PlanType, floorNumber?: number, floorName?: string, customName?: string) => void;
  requiresFloor?: boolean;
}

export function PlanUploadCard({ title, description, planType, onUpload, requiresFloor }: PlanUploadCardProps) {
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
