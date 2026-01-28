import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { Measurement } from '../types';
import { calculateMeasurementValue } from '../lib/calculations';
import { calculatePolygonGeometry } from '../utils/geometryHelpers';
import { generateObjectName } from '../utils/nameGenerator';

/**
 * Boden (Floor) Mode Handlers Hook
 *
 * Manages floor-specific functionality including:
 * - Applying finish catalog items to room floors
 * - Removing finishes from rooms
 * - Automatic mode switching based on plan type
 */
export function useBodenHandlers(loadMeasurements: () => Promise<void>) {
  const {
    currentPlan,
    toolState,
    measurements,
    enableBodenMode,
    disableBodenMode,
    setSelectedMeasurement
  } = useAppStore();

  useEffect(() => {
    if (toolState.activeTool === 'boden' && currentPlan?.type === 'ground') {
      enableBodenMode();
    } else if (toolState.activeTool !== 'boden' && toolState.bodenMode.enabled && !toolState.bodenMode.isArmed) {
      disableBodenMode();
    }
  }, [toolState.activeTool, currentPlan?.type, toolState.bodenMode.enabled, toolState.bodenMode.isArmed, enableBodenMode, disableBodenMode]);

  const handleApplyFinish = async (catalogId: string) => {
    if (!toolState.selectedMeasurement || !currentPlan) return;
    if (toolState.selectedMeasurement.floor_category !== 'roomFloor') return;

    const roomMeasurement = toolState.selectedMeasurement;
    const geo = calculatePolygonGeometry(roomMeasurement.geometry.points);

    const finishName = generateObjectName('area', measurements, undefined, 'finish');

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

  return {
    handleApplyFinish,
    handleRemoveFinish
  };
}
