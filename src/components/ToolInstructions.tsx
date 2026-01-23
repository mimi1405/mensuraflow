import { useAppStore } from '../store/appStore';
import { Info } from 'lucide-react';

export function ToolInstructions() {
  const { toolState } = useAppStore();

  const getInstructions = () => {
    switch (toolState.activeTool) {
      case 'select':
        return 'Click on measurements to select and view their properties';
      case 'area':
        return 'Click to add points for a polygon area (positive surface). Press Enter to complete, Escape to cancel';
      case 'rectangle':
        return 'Click two diagonal corners to create a rectangle (positive surface)';
      case 'line':
        return 'Click to add points for a line. You will select the line type (Kantenschutz or Dachrandabschluss) after completion';
      case 'window':
        return 'Click two diagonal corners to create a window (Abzug - opening). Subcomponents are auto-generated';
      case 'door':
        return 'Click two diagonal corners to create a door (Abzug - opening). Subcomponents are auto-generated';
      case 'pan':
        return 'Click and drag to pan the view. Use mouse wheel to zoom';
      default:
        return 'Select a tool to begin';
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-300 px-4 py-2 rounded flex items-start gap-3">
      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div>
        <div className="text-blue-900 text-sm">
          {getInstructions()}
        </div>
        {toolState.currentPoints.length > 0 && (
          <div className="text-blue-700 text-xs mt-1">
            Points: {toolState.currentPoints.length}
          </div>
        )}
      </div>
    </div>
  );
}
