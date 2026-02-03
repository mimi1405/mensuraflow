import { useState } from 'react';
import { Layers, Eye, EyeOff } from 'lucide-react';
import { DXFLayerVisibility } from '../types';

interface DXFLayerControlsProps {
  visibility: DXFLayerVisibility;
  onLayerToggle: (layer: string, visible: boolean) => void;
  onTypeToggle: (type: 'line' | 'lwpolyline' | 'arc' | 'circle', visible: boolean) => void;
}

export function DXFLayerControls({ visibility, onLayerToggle, onTypeToggle }: DXFLayerControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const geometryTypes = [
    { key: 'line' as const, label: 'Lines' },
    { key: 'lwpolyline' as const, label: 'Polylines' },
    { key: 'arc' as const, label: 'Arcs' },
    { key: 'circle' as const, label: 'Circles' },
  ];

  const layers = Object.keys(visibility.layers).sort();

  const isTypeVisible = (type: 'line' | 'lwpolyline' | 'arc' | 'circle') => {
    return visibility.types[type] !== false;
  };

  const isLayerVisible = (layer: string) => {
    return visibility.layers[layer] !== false;
  };

  return (
    <div className="fixed top-32 right-4 z-40">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white hover:bg-gray-50 text-gray-900 p-3 rounded-lg shadow-lg border border-gray-200 transition-all"
        title="DXF Layer Controls"
      >
        <Layers className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute top-0 right-16 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">DXF Visibility</h3>
            <p className="text-xs text-gray-500 mt-0.5">Control layer and geometry visibility</p>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Geometry Types</h4>
              <div className="space-y-2">
                {geometryTypes.map(({ key, label }) => {
                  const visible = isTypeVisible(key);
                  return (
                    <button
                      key={key}
                      onClick={() => onTypeToggle(key, !visible)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm text-gray-900">{label}</span>
                      {visible ? (
                        <Eye className="w-4 h-4 text-blue-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {layers.length > 0 && (
              <div className="px-4 py-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">DXF Layers</h4>
                <div className="space-y-1">
                  {layers.map(layer => {
                    const visible = isLayerVisible(layer);
                    return (
                      <button
                        key={layer}
                        onClick={() => onLayerToggle(layer, !visible)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-xs text-gray-900 truncate" title={layer}>
                          {layer}
                        </span>
                        {visible ? (
                          <Eye className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {layers.length === 0 && (
              <div className="px-4 py-3 text-center">
                <p className="text-sm text-gray-500">No DXF layers found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
