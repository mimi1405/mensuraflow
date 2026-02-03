import { useState } from 'react';
import { Settings, Eye, EyeOff, Maximize2 } from 'lucide-react';
import { DXFRenderSettings } from '../types';

interface PlanRenderSettingsProps {
  settings: DXFRenderSettings;
  onChange: (settings: DXFRenderSettings) => void;
  onFit: () => void;
}

export function PlanRenderSettings({ settings, onChange, onFit }: PlanRenderSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [layerSearch, setLayerSearch] = useState('');

  const layers = Object.keys(settings.layers).sort();
  const types = Object.keys(settings.types).sort();
  const filteredLayers = layers.filter(l =>
    l.toLowerCase().includes(layerSearch.toLowerCase())
  );

  const handleRenderModeToggle = () => {
    onChange({
      ...settings,
      renderMode: settings.renderMode === 'simplified' ? 'raw' : 'simplified'
    });
  };

  const handleLayerToggle = (layer: string) => {
    onChange({
      ...settings,
      layers: { ...settings.layers, [layer]: !settings.layers[layer] }
    });
  };

  const handleTypeToggle = (type: string) => {
    onChange({
      ...settings,
      types: { ...settings.types, [type]: !settings.types[type] }
    });
  };

  const handleSpaceToggle = (space: 'model' | 'paper') => {
    onChange({
      ...settings,
      spaces: {
        ...settings.spaces,
        [space]: !settings.spaces?.[space]
      }
    });
  };

  const handleAllLayers = (visible: boolean) => {
    onChange({
      ...settings,
      layers: Object.fromEntries(layers.map(l => [l, visible]))
    });
  };

  const handleAllTypes = (visible: boolean) => {
    onChange({
      ...settings,
      types: Object.fromEntries(types.map(t => [t, visible]))
    });
  };

  return (
    <div className="fixed top-20 right-4 z-40">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white hover:bg-gray-50 text-gray-900 p-3 rounded-lg shadow-lg border border-gray-200 transition-all"
        title="Render Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute top-0 right-16 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">DXF Render Settings</h3>
            <p className="text-xs text-gray-500 mt-0.5">Control how DXF is rendered</p>
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">Render Mode</h4>
              </div>
              <button
                onClick={handleRenderModeToggle}
                className={`w-full px-3 py-2 rounded transition-colors text-sm font-medium ${
                  settings.renderMode === 'simplified'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {settings.renderMode === 'simplified' ? 'Simplified (Fast)' : 'Raw (Experimental)'}
              </button>
              <p className="text-xs text-gray-500 mt-1">
                {settings.renderMode === 'simplified'
                  ? 'Uses normalized geometry for measurements'
                  : 'Shows all raw DXF entities including TEXT'
                }
              </p>
            </div>

            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">Spaces</h4>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => handleSpaceToggle('model')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-900">Model Space</span>
                  {settings.spaces?.model !== false ? (
                    <Eye className="w-4 h-4 text-blue-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={() => handleSpaceToggle('paper')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-900">Paper Space</span>
                  {settings.spaces?.paper ? (
                    <Eye className="w-4 h-4 text-blue-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">Entity Types</h4>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAllTypes(true)}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    All On
                  </button>
                  <button
                    onClick={() => handleAllTypes(false)}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    All Off
                  </button>
                </div>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {types.map(type => (
                  <button
                    key={type}
                    onClick={() => handleTypeToggle(type)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-xs font-mono text-gray-900">{type}</span>
                    {settings.types[type] !== false ? (
                      <Eye className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">Layers ({filteredLayers.length})</h4>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAllLayers(true)}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    All On
                  </button>
                  <button
                    onClick={() => handleAllLayers(false)}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    All Off
                  </button>
                </div>
              </div>
              {layers.length > 5 && (
                <input
                  type="text"
                  value={layerSearch}
                  onChange={(e) => setLayerSearch(e.target.value)}
                  placeholder="Search layers..."
                  className="w-full px-3 py-2 mb-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredLayers.map(layer => (
                  <button
                    key={layer}
                    onClick={() => handleLayerToggle(layer)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-xs text-gray-900 truncate" title={layer}>
                      {layer}
                    </span>
                    {settings.layers[layer] !== false ? (
                      <Eye className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <button
              onClick={onFit}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
              <span className="text-sm font-medium">Fit to View</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
