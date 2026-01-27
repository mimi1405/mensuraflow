import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { Point, Measurement, MeasurementObjectType, LineType } from '../types';
import { calculateMeasurementValue, generateWindowDoorSubcomponents } from '../lib/calculations';
import { calculatePolygonGeometry } from '../utils/geometryHelpers';
import { generateObjectName } from '../utils/nameGenerator';

/**
 * Measurements Management Hook
 *
 * Handles all measurement CRUD operations including:
 * - Loading measurements and subcomponents from database
 * - Creating new measurements with proper geometry calculation
 * - Handling special cases (windows, doors, boden mode)
 * - Managing measurement lifecycle
 */
export function useMeasurements() {
  const {
    currentPlan,
    toolState,
    measurements,
    setMeasurements,
    setSubcomponents,
    setCutouts
  } = useAppStore();

  useEffect(() => {
    if (currentPlan) {
      loadMeasurements();
    }
  }, [currentPlan?.id]);

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

    const { data: cutoutsData } = await supabase
      .from('cutouts')
      .select('*')
      .eq('plan_id', currentPlan.id);

    if (cutoutsData) {
      setCutouts(cutoutsData);
    }
  };

  const completeMeasurement = async (points: Point[], lineType?: LineType) => {
    if (!currentPlan || points.length < 2) return;

    const objectType: MeasurementObjectType =
      toolState.activeTool === 'window' ? 'window' :
      toolState.activeTool === 'door' ? 'door' :
      toolState.activeTool === 'line' ? 'line' : 'area';

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

    if (isBodenArmed && bodenMode.intent) {
      console.debug('[CompleteMeasurement] Boden armed with intent:', bodenMode.intent);
      floorCategory = bodenMode.intent;

      if (bodenMode.intent === 'roomFloor') {
        floorKind = bodenMode.floorKind;
        console.debug('[CompleteMeasurement] Setting floorKind:', floorKind);
      }
    }

    const objectName = generateObjectName(objectType, measurements, lineType, floorCategory);

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

      const { setActiveTool } = useAppStore.getState();
      setActiveTool('boden');
    }

    await loadMeasurements();
  };

  return {
    loadMeasurements,
    completeMeasurement
  };
}
