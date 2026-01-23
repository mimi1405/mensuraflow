import { useState } from 'react';
import { Eye, EyeOff, Layers } from 'lucide-react';

interface FloorLayerControlsProps {
  onVisibilityChange: (layer: 'ceiling' | 'roomFloor' | 'finish', visible: boolean) => void;
  visibilityState: {
    ceiling: boolean;
    roomFloor: boolean;
    finish: boolean;
  };
}

export function FloorLayerControls({ onVisibilityChange, visibilityState }: FloorLayerControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-10">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-white border border-gray-300 rounded-lg p-2 shadow-lg hover:bg-gray-50 transition-colors"
        title="Layer Controls"
      >
        <Layers className="w-5 h-5 text-gray-700" />
      </button>

      {isExpanded && (
        <div className="absolute top-12 right-0 bg-white border border-gray-300 rounded-lg shadow-xl p-3 min-w-[200px]">
          <div className="text-sm font-semibold text-gray-900 mb-2">Boden Ebenen</div>
          <div className="space-y-2">
            <button
              onClick={() => onVisibilityChange('ceiling', !visibilityState.ceiling)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 transition-colors"
            >
              {visibilityState.ceiling ? (
                <Eye className="w-4 h-4 text-blue-600" />
              ) : (
                <EyeOff className="w-4 h-4 text-gray-400" />
              )}
              <span className={`text-sm ${visibilityState.ceiling ? 'text-gray-900' : 'text-gray-400'}`}>
                Decke
              </span>
            </button>

            <button
              onClick={() => onVisibilityChange('roomFloor', !visibilityState.roomFloor)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 transition-colors"
            >
              {visibilityState.roomFloor ? (
                <Eye className="w-4 h-4 text-blue-600" />
              ) : (
                <EyeOff className="w-4 h-4 text-gray-400" />
              )}
              <span className={`text-sm ${visibilityState.roomFloor ? 'text-gray-900' : 'text-gray-400'}`}>
                Räume
              </span>
            </button>

            <button
              onClick={() => onVisibilityChange('finish', !visibilityState.finish)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 transition-colors"
            >
              {visibilityState.finish ? (
                <Eye className="w-4 h-4 text-blue-600" />
              ) : (
                <EyeOff className="w-4 h-4 text-gray-400" />
              )}
              <span className={`text-sm ${visibilityState.finish ? 'text-gray-900' : 'text-gray-400'}`}>
                Deckbelag
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
