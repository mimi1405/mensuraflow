/**
 * Cutout Shape Selection Modal
 *
 * This modal allows users to choose the shape type for their cutout:
 * - Rectangle: For simple rectangular cutouts
 * - Polygon: For custom polygonal cutouts
 *
 * After selection, the drawing mode is activated with the chosen shape type.
 */

import { X, Square, Pentagon } from 'lucide-react';
import { useState } from 'react';

interface CutoutShapeModalProps {
  onSelectShape: (shape: 'rectangle' | 'polygon') => void;
  onCancel: () => void;
}

export function CutoutShapeModal({ onSelectShape, onCancel }: CutoutShapeModalProps) {
  const [selectedShape, setSelectedShape] = useState<'rectangle' | 'polygon'>('rectangle');

  const handleContinue = () => {
    onSelectShape(selectedShape);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Choose Cutout Shape</h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Select the shape you want to draw for the cutout area:
          </p>

          <div className="space-y-3">
            <button
              onClick={() => setSelectedShape('rectangle')}
              className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors ${
                selectedShape === 'rectangle'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                selectedShape === 'rectangle' ? 'bg-blue-600' : 'bg-gray-100'
              }`}>
                <Square className={`w-6 h-6 ${
                  selectedShape === 'rectangle' ? 'text-white' : 'text-gray-600'
                }`} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-medium text-gray-900">Rectangle</h3>
                <p className="text-sm text-gray-600">Draw a rectangular cutout area</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedShape === 'rectangle'
                  ? 'border-blue-600 bg-blue-600'
                  : 'border-gray-300'
              }`}>
                {selectedShape === 'rectangle' && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
            </button>

            <button
              onClick={() => setSelectedShape('polygon')}
              className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors ${
                selectedShape === 'polygon'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                selectedShape === 'polygon' ? 'bg-blue-600' : 'bg-gray-100'
              }`}>
                <Pentagon className={`w-6 h-6 ${
                  selectedShape === 'polygon' ? 'text-white' : 'text-gray-600'
                }`} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-medium text-gray-900">Polygon</h3>
                <p className="text-sm text-gray-600">Draw a custom polygonal cutout area</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedShape === 'polygon'
                  ? 'border-blue-600 bg-blue-600'
                  : 'border-gray-300'
              }`}>
                {selectedShape === 'polygon' && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
            <p className="text-xs text-gray-700">
              {selectedShape === 'rectangle'
                ? 'Click two opposite corners to define the rectangular cutout area.'
                : 'Click multiple points to define the polygon. Press Enter when done.'}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-900 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
