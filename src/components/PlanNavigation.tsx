import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Plan } from '../types';
import { ChevronDown, ChevronRight, Trash2, ChevronLeft, ChevronRightIcon, FolderKanban, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UpdateDXFDialog } from './UpdateDXFDialog';

interface PlanNavigationProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function PlanNavigation({ isOpen, onToggle }: PlanNavigationProps) {
  const { plans, currentPlan, setCurrentPlan, currentProject, setPlans, measurements, setMeasurements } = useAppStore();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['floor-plans', 'elevations', 'sections'])
  );
  const [updateDialogPlan, setUpdateDialogPlan] = useState<Plan | null>(null);

  if (!currentProject) {
    return null;
  }

  const handleDeletePlan = async (plan: Plan, e: React.MouseEvent) => {
    e.stopPropagation();

    const confirmDelete = window.confirm(
      `Sicher, dass Sie "${plan.name}" löschen wollen? Dies wird alle dazugehörigen Messungen unwiderruflich löschen.`
    );

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', plan.id);

      if (error) throw error;

      const updatedPlans = plans.filter(p => p.id !== plan.id);
      setPlans(updatedPlans);

      const updatedMeasurements = measurements.filter(m => m.plan_id !== plan.id);
      setMeasurements(updatedMeasurements);

      if (currentPlan?.id === plan.id) {
        setCurrentPlan(updatedPlans.length > 0 ? updatedPlans[0] : null);
      }

      alert('Plan erfolgreich gelöscht.');
    } catch (error) {
      console.error('Fehler beim löschen des Plans:', error);
      alert('Fehler beim löschen des Plans! Bitte versuchen Sie es erneut.');
    }
  };

  const floorPlans = plans.filter(p => p.type === 'ground');
  const elevationPlans = plans.filter(p => ['north', 'south', 'east', 'west'].includes(p.type));
  const sectionPlans = plans.filter(p => p.type === 'section');

  const groupedByFloor = floorPlans.reduce((acc, plan) => {
    if (!acc[plan.floor_number]) {
      acc[plan.floor_number] = [];
    }
    acc[plan.floor_number].push(plan);
    return acc;
  }, {} as Record<number, Plan[]>);

  const floors = Object.keys(groupedByFloor)
    .map(Number)
    .sort((a, b) => b - a);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getFloorName = (floorNum: number, floorPlan: Plan) => {
    if (floorPlan.floor_name) return floorPlan.floor_name;

    if (floorNum < 0) return `Stockwerk ${Math.abs(floorNum)}`;
    if (floorNum === 0) return 'Keller';
    if (floorNum === 1) return 'Erdgeschoss';
    if (floorNum === 2) return '1. Stock';
    if (floorNum === 3) return '2. Stock';
    return `Floor ${floorNum}`;
  };

  const getElevationLabel = (type: string) => {
    const labels: Record<string, string> = {
      north: 'Nord',
      south: 'Süd',
      east: 'Ost',
      west: 'West'
    };
    return labels[type] || type;
  };

  const isExpanded = (section: string) => expandedSections.has(section);

  return (
    <>
      <div
        className={`border-r border-gray-300 flex flex-col transition-all duration-300 ${
          isOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <button
              onClick={() => toggleSection('floor-plans')}
              className="w-full flex items-center gap-1 px-2 py-1.5 rounded text-left text-xs uppercase font-semibold tracking-wide"
            >
              {isExpanded('floor-plans') ? (
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
              )}
              <span>Grundrisse</span> <FolderKanban className="w-4" />
              <span className="ml-auto">({floorPlans.length})</span>
            </button>

            {isExpanded('floor-plans') && (
              <div className="ml-3 mt-1">
                {floors.length > 0 ? (
                  floors.map(floorNum => {
                    const floorPlan = groupedByFloor[floorNum][0];
                    const isActive = currentPlan?.id === floorPlan.id;
                    const floorName = getFloorName(floorNum, floorPlan);

                    return (
                      <div key={floorNum} className="relative group">
                        <button
                          onClick={() => setCurrentPlan(floorPlan)}
                          className={`w-full pl-4 pr-16 py-1.5 text-left text-sm rounded transition-colors flex items-center gap-2 ${
                            isActive
                              ? 'bg-gray-100'
                              : ''
                          }`}
                        >
                          <span className="text-xs">└</span>
                          <span className="truncate">{floorPlan.name || floorName}</span>
                        </button>
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">                        
                          <button
                            type="button"
                            onClick={(e) => handleDeletePlan(floorPlan, e)}
                            className="p-1 rounded hover:bg-red-100 text-red-600"
                            title="Delete plan"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="pl-4 py-1.5 text-xs">No floor plans</div>
                )}
              </div>
            )}

            <button
              onClick={() => toggleSection('elevations')}
              className="w-full flex items-center gap-1 px-2 py-1.5 rounded text-left text-xs uppercase font-semibold tracking-wide mt-2"
            >
              {isExpanded('elevations') ? (
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
              )}
              <span>Ansichten</span> <FolderKanban className="w-4" />
              <span className="ml-auto">({elevationPlans.length})</span>
            </button>

            {isExpanded('elevations') && (
              <div className="ml-3 mt-1">
                {['north', 'south', 'east', 'west'].map(direction => {
                  const plan = elevationPlans.find(p => p.type === direction);
                  const isActive = currentPlan?.id === plan?.id;

                  return (
                    <div key={direction} className="relative group">
                      <button
                        onClick={() => plan && setCurrentPlan(plan)}
                        disabled={!plan}
                        className={`w-full pl-4 pr-16 py-1.5 text-left text-sm rounded transition-colors flex items-center gap-2 ${
                          isActive
                            ? 'bg-gray-100'
                            : plan
                            ? ''
                            : ''
                        }`}
                      >
                        <span className="text-gray-500 text-xs">└</span>
                        <span className="truncate">
                          {getElevationLabel(direction)}
                          {plan && plan.name !== `${direction} plan` && ` - ${plan.name}`}
                        </span>
                      </button>
                      {plan && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">                        
                          <button
                            type="button"
                            onClick={(e) => handleDeletePlan(plan, e)}
                            className="p-1 rounded hover:bg-red-100 text-red-600"
                            title="Plan löschen"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => toggleSection('sections')}
              className="w-full flex items-center gap-1 px-2 py-1.5 rounded text-left text-xs uppercase font-semibold tracking-wide mt-2"
            >
              {isExpanded('sections') ? (
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
              )}
              <span>Schnitte</span> <FolderKanban className="w-4" />
              <span className="ml-auto">({sectionPlans.length})</span>
            </button>

            {isExpanded('sections') && (
              <div className="ml-3 mt-1">
                {sectionPlans.length > 0 ? (
                  sectionPlans.map(plan => {
                    const isActive = currentPlan?.id === plan.id;

                    return (
                      <div key={plan.id} className="relative group">
                        <button
                          onClick={() => setCurrentPlan(plan)}
                          className={`w-full pl-4 pr-16 py-1.5 text-left text-sm rounded transition-colors flex items-center gap-2 ${
                            isActive
                              ? ''
                              : ''
                          }`}
                        >
                          <span className="text-xs">└</span>
                          <span className="truncate">{plan.name}</span>
                        </button>
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => handleDeletePlan(plan, e)}
                            className="p-1 rounded hover:bg-red-100 text-red-600"
                            title="Delete plan"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="pl-4 py-1.5 text-xs">No sections</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onToggle}
        className="absolute left-0 top-1/2 -translate-y-1/2 border border-gray-200 rounded-r-md p-2 transition-colors z-10"
        style={{ left: isOpen ? '256px' : '0px' }}
        title={isOpen ? 'Seitenleiste schliessen' : 'Seitenleiste öffnen'}
      >
        {isOpen ? (
          <ChevronLeft className="w-4 h-4" />
        ) : <div className="flex items-center justify-center">
            <ChevronRightIcon className="w-4 h-4 stroke-black" />
            <FolderKanban className="w-4 h-4 stroke-black" />
        </div>
        }
      </button>

      {updateDialogPlan && (
        <UpdateDXFDialog
          plan={updateDialogPlan}
          onClose={() => setUpdateDialogPlan(null)}
          onSuccess={() => {
            alert('DXF file updated successfully!');
          }}
        />
      )}
    </>
  );
}
