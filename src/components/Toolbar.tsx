import { Square, Move, Ruler, DoorOpen, MousePointer, Layers, TriangleRight, Scissors } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function Toolbar() {
  const { toolState, setActiveTool, currentPlan } = useAppStore();

  const isFloorPlan = currentPlan?.type === 'ground';

  const allTools = [
    { id: 'select', icon: MousePointer, label: 'Selektieren', showAlways: true },
    { id: 'area', icon: TriangleRight, label: 'Polygon Schraffur', showAlways: true },
    { id: 'rectangle', icon: Square, label: 'Rechteck Schraffur', showAlways: true },
    { id: 'line', icon: Ruler, label: 'Linienmessung', showAlways: true },
    { id: 'window', icon: Square, label: 'Fenster', showAlways: true },
    { id: 'door', icon: DoorOpen, label: 'Tür', showAlways: true },
    { id: 'boden', icon: Layers, label: 'Boden', showAlways: false },
    { id: 'cutout', icon: Scissors, label: 'Ausschnitt', showAlways: true },
    { id: 'pan', icon: Move, label: 'Pan', showAlways: true }
  ] as const;

  const tools = allTools.filter(tool => tool.showAlways || (tool.id === 'boden' && isFloorPlan));

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 border-b border-gray-300">
      {tools.map(tool => {
        const Icon = tool.icon;
        const isActive = toolState.activeTool === tool.id;

        return (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={tool.label}
          >
            <Icon className="w-5 h-5" />
            <span className="text-sm">{tool.label}</span>
          </button>
        );
      })}
    </div>
  );
}
