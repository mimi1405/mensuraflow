import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useAppStore } from './store/appStore';
import { Auth } from './components/Auth';
import { ProjectSelector } from './components/ProjectSelector';
import { PlanNavigation } from './components/PlanNavigation';
import { Toolbar } from './components/Toolbar';
import { DXFCanvas } from './components/DXFCanvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { SummaryPanel } from './components/SummaryPanel';
import { Onboarding } from './components/Onboarding';
import { ProjectWizard } from './components/ProjectWizard';
import { ToolInstructions } from './components/ToolInstructions';
import { LineTypeDialog } from './components/LineTypeDialog';
import { FinishCatalog } from './components/FinishCatalog';
import { BodenFloatingPanel } from './components/BodenFloatingPanel';
import { Point, Measurement, MeasurementObjectType, LineType } from './types';
import { calculateMeasurementValue, generateWindowDoorSubcomponents } from './lib/calculations';
import { LogOut } from 'lucide-react';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasProjects, setHasProjects] = useState<boolean | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showLineTypeDialog, setShowLineTypeDialog] = useState(false);
  const [copiedMeasurement, setCopiedMeasurement] = useState<Measurement | null>(null);
  const [isPlacingCopy, setIsPlacingCopy] = useState(false);
  const [placementPosition, setPlacementPosition] = useState<Point | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'messungen' | 'zusammenfassung' | 'einstellungen'>('messungen');

  const {
    currentProject,
    currentPlan,
    toolState,
    measurements,
    setMeasurements,
    setSubcomponents,
    addCurrentPoint,
    removeLastPoint,
    clearCurrentPoints,
    setPendingLineType,
    setSelectedMeasurement,
    setActiveTool,
    enableBodenMode,
    disableBodenMode,
    setBodenPanelOpen
  } = useAppStore();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('user_id', session.user.id)
          .limit(1);

        setHasProjects((projects?.length ?? 0) > 0);
      }

      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentPlan) {
      loadMeasurements();
    }
  }, [currentPlan?.id]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Enter' && toolState.currentPoints.length >= 2) {
        e.preventDefault();
        await completeMeasurement(toolState.currentPoints);
        if (toolState.activeTool !== 'line') {
          clearCurrentPoints();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (isPlacingCopy) {
          setIsPlacingCopy(false);
          setPlacementPosition(null);
        } else {
          clearCurrentPoints();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && toolState.currentPoints.length > 0) {
        e.preventDefault();
        removeLastPoint();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c' && toolState.selectedMeasurement) {
        e.preventDefault();
        handleCopyMeasurement();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedMeasurement) {
        e.preventDefault();
        handlePasteMeasurement();
      } else if (e.key === 'Delete' && toolState.selectedMeasurement) {
        e.preventDefault();
        handleDeleteMeasurement();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toolState.currentPoints, toolState.selectedMeasurement, copiedMeasurement, isPlacingCopy]);

  const loadMeasurements = async () => {
    if (!currentPlan) return;

    const { data: measurementsData } = await supabase
      .from('measurements')
      .select('*')
      .eq('plan_id', currentPlan.id);

    if (measurementsData) {
      setMeasurements(measurementsData);

      const measurementIds = measurementsData.map(m => m.id);
      if (measurementIds.length > 0) {
        const { data: subcomponentsData } = await supabase
          .from('measurement_subcomponents')
          .select('*')
          .in('parent_measurement_id', measurementIds);

        if (subcomponentsData) {
          setSubcomponents(subcomponentsData);
        }
      }
    }
  };

  const handlePointClick = async (point: Point) => {
    if (!currentPlan) return;

    if (isPlacingCopy) {
      await handlePlaceCopy(point);
      return;
    }

    if (toolState.activeTool === 'select' || toolState.activeTool === 'pan') {
      return;
    }

    addCurrentPoint(point);

    const shouldComplete = shouldCompleteMeasurement(toolState.activeTool, toolState.currentPoints.length + 1);

    if (shouldComplete) {
      await completeMeasurement([...toolState.currentPoints, point]);
      clearCurrentPoints();
    }
  };

  const handleCursorMove = (point: Point) => {
    if (isPlacingCopy) {
      setPlacementPosition(point);
    }
  };

  const shouldCompleteMeasurement = (tool: string, pointCount: number): boolean => {
    if (tool === 'rectangle' && pointCount === 2) return true;
    if ((tool === 'window' || tool === 'door') && pointCount === 2) return true;
    if (tool === 'line' && pointCount >= 2) return false;
    if (tool === 'area' && pointCount >= 3) return false;
    return false;
  };

  const handleCopyMeasurement = () => {
    if (toolState.selectedMeasurement) {
      setCopiedMeasurement(toolState.selectedMeasurement);
    }
  };

  const handlePasteMeasurement = () => {
    if (!copiedMeasurement || !currentPlan) return;
    setIsPlacingCopy(true);
  };

  const handlePlaceCopy = async (targetPosition: Point) => {
    if (!copiedMeasurement || !currentPlan || !targetPosition) return;

    const centroid = copiedMeasurement.geometry.points.reduce(
      (acc, p) => ({
        x: acc.x + p.x / copiedMeasurement.geometry.points.length,
        y: acc.y + p.y / copiedMeasurement.geometry.points.length
      }),
      { x: 0, y: 0 }
    );

    const deltaX = targetPosition.x - centroid.x;
    const deltaY = targetPosition.y - centroid.y;

    const newPoints = copiedMeasurement.geometry.points.map(p => ({
      x: p.x + deltaX,
      y: p.y + deltaY
    }));

    const newGeometry = {
      ...copiedMeasurement.geometry,
      points: newPoints
    };

    const baseName = copiedMeasurement.label;
    const match = baseName.match(/^(.+?)(-\d+)?$/);
    const basePrefix = match ? match[1] : baseName;

    const existingSuffixes = measurements
      .filter(m => m.label.startsWith(basePrefix + '-'))
      .map(m => {
        const suffixMatch = m.label.match(new RegExp(`^${basePrefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}-(\\d+)$`));
        return suffixMatch ? parseInt(suffixMatch[1]) : 0;
      })
      .filter(n => n > 0);

    const nextSuffix = existingSuffixes.length > 0 ? Math.max(...existingSuffixes) + 1 : 1;
    const newLabel = `${basePrefix}-${nextSuffix}`;

    const newMeasurement: Partial<Measurement> = {
      plan_id: currentPlan.id,
      object_type: copiedMeasurement.object_type,
      label: newLabel,
      category: copiedMeasurement.category,
      line_type: copiedMeasurement.line_type,
      geometry: newGeometry,
      is_positive: copiedMeasurement.is_positive,
      source: 'manual',
      unit: copiedMeasurement.unit,
      computed_value: 0,
      area_m2: copiedMeasurement.area_m2,
      perimeter_m: copiedMeasurement.perimeter_m,
      width_m: copiedMeasurement.width_m,
      length_m: copiedMeasurement.length_m,
      floor_category: copiedMeasurement.floor_category,
      floor_kind: copiedMeasurement.floor_kind,
      finish_catalog_id: copiedMeasurement.finish_catalog_id
    };

    newMeasurement.computed_value = calculateMeasurementValue(newMeasurement as Measurement);

    const { data: insertedMeasurement, error } = await supabase
      .from('measurements')
      .insert(newMeasurement)
      .select()
      .single();

    if (error) {
      console.error('Error pasting measurement:', error);
      return;
    }

    if (insertedMeasurement && (copiedMeasurement.object_type === 'window' || copiedMeasurement.object_type === 'door')) {
      const subcomponents = generateWindowDoorSubcomponents(
        insertedMeasurement as Measurement
      );

      const subcomponentsWithParent = subcomponents.map(sub => ({
        ...sub,
        parent_measurement_id: insertedMeasurement.id
      }));

      const { data: insertedSubs } = await supabase
        .from('measurement_subcomponents')
        .insert(subcomponentsWithParent)
        .select();

      if (insertedSubs) {
        setSubcomponents([...useAppStore.getState().subcomponents, ...insertedSubs]);
      }
    }

    await loadMeasurements();
    setSelectedMeasurement(insertedMeasurement as Measurement);
    setIsPlacingCopy(false);
    setPlacementPosition(null);
  };

  const calculatePolygonGeometry = (points: Point[]) => {
    let area = 0;
    let perimeter = 0;

    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }

    area = Math.abs(area / 2);

    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));

    const width = maxX - minX;
    const length = maxY - minY;

    return { area, perimeter, width, length };
  };

  const findParentRoomFloor = (finishPoints: Point[]): string | null => {
    const finishCentroid = {
      x: finishPoints.reduce((sum, p) => sum + p.x, 0) / finishPoints.length,
      y: finishPoints.reduce((sum, p) => sum + p.y, 0) / finishPoints.length
    };

    const roomFloors = measurements.filter(m => m.floor_category === 'roomFloor');

    for (const room of roomFloors) {
      if (isPointInPolygon(finishCentroid, room.geometry.points)) {
        return room.id;
      }
    }

    return null;
  };

  const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;

      const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const generateObjectName = (objectType: MeasurementObjectType, lineType?: LineType, floorCategory?: string): string => {
    let prefix = '';
    let filter: (m: Measurement) => boolean;

    if (floorCategory === 'ceiling') {
      prefix = 'D';
      filter = (m) => m.floor_category === 'ceiling';
    } else if (floorCategory === 'roomFloor') {
      prefix = 'R';
      filter = (m) => m.floor_category === 'roomFloor';
    } else if (floorCategory === 'finish') {
      prefix = 'DB';
      filter = (m) => m.floor_category === 'finish';
    } else if (objectType === 'area') {
      prefix = 'A';
      filter = (m) => m.object_type === 'area';
    } else if (objectType === 'window') {
      prefix = 'F';
      filter = (m) => m.object_type === 'window';
    } else if (objectType === 'door') {
      prefix = 'T';
      filter = (m) => m.object_type === 'door';
    } else if (objectType === 'line' && lineType === 'kantenschutz') {
      prefix = 'KS';
      filter = (m) => m.object_type === 'line' && m.line_type === 'kantenschutz';
    } else if (objectType === 'line' && lineType === 'dachrandabschluss') {
      prefix = 'DR';
      filter = (m) => m.object_type === 'line' && m.line_type === 'dachrandabschluss';
    } else if (objectType === 'line' && lineType === 'perimeterdämmung') {
      prefix = 'PD';
      filter = (m) => m.object_type === 'line' && m.line_type === 'perimeterdämmung';
    } else {
      prefix = 'OBJ';
      filter = () => true;
    }

    const existingObjects = measurements.filter(filter);
    const existingNumbers = existingObjects
      .map(m => {
        const match = m.label.match(new RegExp(`^${prefix}(\\d+)$`));
        return match ? parseInt(match[1]) : 0;
      })
      .filter(n => n > 0);

    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    return `${prefix}${nextNumber}`;
  };

  const completeMeasurement = async (points: Point[], lineType?: LineType) => {
    if (!currentPlan || points.length < 2) return;

    const objectType: MeasurementObjectType =
      toolState.activeTool === 'window' ? 'window' :
      toolState.activeTool === 'door' ? 'door' :
      toolState.activeTool === 'line' ? 'line' : 'area';

    if (objectType === 'line' && !lineType) {
      setShowLineTypeDialog(true);
      return;
    }

    const { bodenMode } = toolState;
    const isBodenArmed = bodenMode.enabled && bodenMode.isArmed && objectType === 'area';

    const geometry: any = { points };

    if (objectType === 'window' || objectType === 'door') {
      const width = Math.abs(points[1].x - points[0].x);
      const height = Math.abs(points[1].y - points[0].y);
      geometry.width = width;
      geometry.height = height;

      const rectPoints = [
        points[0],
        { x: points[1].x, y: points[0].y },
        points[1],
        { x: points[0].x, y: points[1].y }
      ];
      geometry.points = rectPoints;
    } else if (toolState.activeTool === 'rectangle') {
      const rectPoints = [
        points[0],
        { x: points[1].x, y: points[0].y },
        points[1],
        { x: points[0].x, y: points[1].y }
      ];
      geometry.points = rectPoints;
    }

    const isPositive = objectType === 'area' || objectType === 'line';

    let floorCategory: string | undefined;
    let floorKind: string | undefined;
    let finishCatalogId: string | undefined;
    let parentMeasurementId: string | undefined;
    let areaM2: number | undefined;
    let perimeterM: number | undefined;
    let widthM: number | undefined;
    let lengthM: number | undefined;

    if (objectType === 'area' && geometry.points.length >= 3) {
      const geo = calculatePolygonGeometry(geometry.points);
      areaM2 = geo.area;
      perimeterM = geo.perimeter;
      widthM = geo.width;
      lengthM = geo.length;
    }

    if (objectType === 'window' || objectType === 'door') {
      const width = geometry.width;
      const height = geometry.height;
      areaM2 = width * height;
    }

    if (isBodenArmed && bodenMode.intent) {
      console.debug('[CompleteMeasurement] Boden armed with intent:', bodenMode.intent);
      floorCategory = bodenMode.intent;

      if (bodenMode.intent === 'roomFloor') {
        floorKind = bodenMode.floorKind;
        console.debug('[CompleteMeasurement] Setting floorKind:', floorKind);
      }
    }

    const objectName = generateObjectName(objectType, lineType, floorCategory);

    const measurement: Partial<Measurement> = {
      plan_id: currentPlan.id,
      object_type: objectType,
      label: objectName,
      category: objectType === 'line' ? (lineType || 'kantenschutz') : objectType,
      line_type: objectType === 'line' ? lineType : undefined,
      floor_category: floorCategory as any,
      floor_kind: floorKind as any,
      finish_catalog_id: finishCatalogId,
      parent_measurement_id: parentMeasurementId,
      area_m2: areaM2,
      perimeter_m: perimeterM,
      width_m: widthM,
      length_m: lengthM,
      geometry,
      is_positive: isPositive,
      source: 'manual',
      unit: objectType === 'line' ? 'm' : 'm²',
      computed_value: 0
    };

    measurement.computed_value = calculateMeasurementValue(measurement as Measurement);

    const { data: insertedMeasurement, error } = await supabase
      .from('measurements')
      .insert(measurement)
      .select()
      .single();

    if (error) {
      console.error('Error creating measurement:', error);
      return;
    }

    if (insertedMeasurement && (objectType === 'window' || objectType === 'door')) {
      const subcomponents = generateWindowDoorSubcomponents(
        insertedMeasurement as Measurement
      );

      const subcomponentsWithParent = subcomponents.map(sub => ({
        ...sub,
        parent_measurement_id: insertedMeasurement.id
      }));

      const { data: insertedSubs } = await supabase
        .from('measurement_subcomponents')
        .insert(subcomponentsWithParent)
        .select();

      if (insertedSubs) {
        setSubcomponents([...useAppStore.getState().subcomponents, ...insertedSubs]);
      }
    }

    if (isBodenArmed && insertedMeasurement) {
      console.debug('[CompleteMeasurement] Boden measurement created, category:', floorCategory);

      const { disarmBodenIntent, advanceBodenToRooms } = useAppStore.getState();
      disarmBodenIntent();

      if (bodenMode.intent === 'ceiling') {
        advanceBodenToRooms();
      }

      setActiveTool('boden');
    }

    await loadMeasurements();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleLineTypeSelect = async (lineType: LineType) => {
    setShowLineTypeDialog(false);
    setPendingLineType(lineType);
    await completeMeasurement(toolState.currentPoints, lineType);
    clearCurrentPoints();
    setPendingLineType(null);
  };

  const handleLineTypeCancel = () => {
    setShowLineTypeDialog(false);
    clearCurrentPoints();
  };

  const handleDeleteMeasurement = async () => {
    if (!toolState.selectedMeasurement) return;

    const { error } = await supabase
      .from('measurements')
      .delete()
      .eq('id', toolState.selectedMeasurement.id);

    if (!error) {
      setSelectedMeasurement(null);
      await loadMeasurements();
    }
  };

  const handleApplyFinish = async (catalogId: string) => {
    if (!toolState.selectedMeasurement || !currentPlan) return;
    if (toolState.selectedMeasurement.floor_category !== 'roomFloor') return;

    const roomMeasurement = toolState.selectedMeasurement;
    const geo = calculatePolygonGeometry(roomMeasurement.geometry.points);

    const finishName = generateObjectName('area', undefined, 'finish');

    const finishMeasurement: Partial<Measurement> = {
      plan_id: currentPlan.id,
      object_type: 'area',
      label: finishName,
      category: 'area',
      floor_category: 'finish',
      finish_catalog_id: catalogId,
      parent_measurement_id: roomMeasurement.id,
      geometry: {
        points: [...roomMeasurement.geometry.points]
      },
      area_m2: geo.area,
      perimeter_m: geo.perimeter,
      width_m: geo.width,
      length_m: geo.length,
      is_positive: true,
      source: 'manual',
      unit: 'm²',
      computed_value: 0
    };

    finishMeasurement.computed_value = calculateMeasurementValue(finishMeasurement as Measurement);

    const { data: insertedFinish, error } = await supabase
      .from('measurements')
      .insert(finishMeasurement)
      .select()
      .single();

    if (error) {
      console.error('Error creating finish:', error);
      alert('Fehler beim Anwenden des Deckbelags: ' + error.message);
      return;
    }

    await loadMeasurements();
    setSelectedMeasurement(insertedFinish as Measurement);
  };

  const handleRemoveFinish = async () => {
    if (!toolState.selectedMeasurement) return;
    if (toolState.selectedMeasurement.floor_category !== 'roomFloor') return;

    const finishMeasurement = measurements.find(
      m => m.floor_category === 'finish' && m.parent_measurement_id === toolState.selectedMeasurement?.id
    );

    if (!finishMeasurement) return;

    if (!confirm('Deckbelag entfernen?')) return;

    const { error } = await supabase
      .from('measurements')
      .delete()
      .eq('id', finishMeasurement.id);

    if (!error) {
      await loadMeasurements();
    }
  };

  useEffect(() => {
    if (toolState.activeTool === 'boden' && currentPlan?.type === 'ground') {
      enableBodenMode();
    } else if (toolState.activeTool !== 'boden' && toolState.bodenMode.enabled && !toolState.bodenMode.isArmed) {
      disableBodenMode();
    }
  }, [toolState.activeTool, currentPlan?.type, toolState.bodenMode.enabled, toolState.bodenMode.isArmed, enableBodenMode, disableBodenMode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-900 text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (showWizard) {
    return (
      <ProjectWizard
        initialProjectName={currentProject?.name}
        initialProjectId={currentProject?.id}
        onComplete={() => {
          setShowWizard(false);
          setHasProjects(true);
        }}
        onCancel={() => setShowWizard(false)}
      />
    );
  }

  if (hasProjects === false && !currentProject) {
    return <Onboarding onGetStarted={() => setShowWizard(true)} />;
  }

  return (
    <div className="min-h-screen max-w-screen overflow-x-hidden bg-white text-gray-900 flex flex-col">
      <div className="bg-gray-100 border-b border-gray-300 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-gray-900">MensuraFlow</h1>
          <ProjectSelector onCreateNew={() => setShowWizard(true)} />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-900"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      {currentPlan && (
        <>
          <div className="bg-gray-50 border-b border-gray-300 px-6 flex gap-1">
            <button
              onClick={() => setActiveTab('messungen')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'messungen'
                  ? 'border-gray-900 text-gray-900 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Messen
            </button>
            <button
              onClick={() => setActiveTab('zusammenfassung')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'zusammenfassung'
                  ? 'border-gray-900 text-gray-900 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Daten
            </button>
            <button
              onClick={() => setActiveTab('einstellungen')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'einstellungen'
                  ? 'border-gray-900 text-gray-900 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Einstellungen
            </button>
          </div>
        </>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {currentPlan && activeTab === 'messungen' && (
          <PlanNavigation isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        )}

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {currentPlan ? (
            <>
              {activeTab === 'messungen' ? (
                <>
                  {!isPlacingCopy && toolState.activeTool !== 'boden' && (
                    <div className="flex-shrink-0 p-4">
                      <ToolInstructions />
                    </div>
                  )}

                  {isPlacingCopy && (
                    <div className="flex-shrink-0 p-4">
                      <div className="bg-blue-100 border border-blue-300 px-4 py-2 rounded">
                        <div className="text-blue-900 text-sm">
                          Click to place the copied object. Press Escape to cancel.
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex-shrink-0">
                    <Toolbar />
                  </div>

                  <div className="flex-1 px-4 pb-4 overflow-hidden">
                    <DXFCanvas
                      onPointClick={handlePointClick}
                      onCursorMove={handleCursorMove}
                      isPlacingCopy={isPlacingCopy}
                      copiedMeasurement={copiedMeasurement}
                      placementPosition={placementPosition}
                      onDuplicate={() => {
                        handleCopyMeasurement();
                        handlePasteMeasurement();
                      }}
                      onDelete={handleDeleteMeasurement}
                    />
                  </div>
                </>
              ) : activeTab === 'zusammenfassung' ? (
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="max-w-5xl mx-auto">
                    <SummaryPanel />
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-hidden">
                  <FinishCatalog />
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-2xl w-full px-6">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900">No Plan Selected</h2>
                <p className="text-gray-600 mb-8">
                  {currentProject
                    ? 'This project has no plans yet. Use the wizard to add plans to your project.'
                    : 'Select a project to view its plans'}
                </p>
                {currentProject && (
                  <button
                    onClick={() => setShowWizard(true)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Add Plans to Project
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {currentPlan && activeTab === 'messungen' && (
          <PropertiesPanel
            onDelete={handleDeleteMeasurement}
            isOpen={propertiesOpen}
            onToggle={() => setPropertiesOpen(!propertiesOpen)}
          />
        )}
      </div>

      <LineTypeDialog
        isOpen={showLineTypeDialog}
        onSelect={handleLineTypeSelect}
        onCancel={handleLineTypeCancel}
      />

      {toolState.bodenMode.panelOpen && currentPlan?.type === 'ground' && activeTab === 'messungen' && (
        <BodenFloatingPanel
          onApplyFinish={handleApplyFinish}
          onRemoveFinish={handleRemoveFinish}
        />
      )}
    </div>
  );
}

export default App;
