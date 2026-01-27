import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { Point, Measurement } from '../types';
import { calculateMeasurementValue, generateWindowDoorSubcomponents } from '../lib/calculations';
import { generateCopyName } from '../utils/nameGenerator';

/**
 * Copy/Paste Functionality Hook
 *
 * Manages copying and pasting measurements with:
 * - Clipboard state management
 * - Placement mode handling
 * - Automatic name generation for copies
 * - Geometry transformation (translation to new position)
 * - Subcomponent copying for windows/doors
 */
export function useCopyPaste(loadMeasurements: () => Promise<void>) {
  const [copiedMeasurement, setCopiedMeasurement] = useState<Measurement | null>(null);
  const [isPlacingCopy, setIsPlacingCopy] = useState(false);
  const [placementPosition, setPlacementPosition] = useState<Point | null>(null);

  const { currentPlan, measurements, toolState, setSubcomponents, setSelectedMeasurement } = useAppStore();

  const handleCopyMeasurement = () => {
    if (toolState.selectedMeasurement) {
      setCopiedMeasurement(toolState.selectedMeasurement);
    }
  };

  const handlePasteMeasurement = () => {
    if (!copiedMeasurement || !currentPlan) return;
    setIsPlacingCopy(true);
  };

  const handleCursorMove = (point: Point) => {
    if (isPlacingCopy) {
      setPlacementPosition(point);
    }
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

    const newLabel = generateCopyName(copiedMeasurement.label, measurements);

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
      computed_value: 0
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

  const cancelPlacing = () => {
    setIsPlacingCopy(false);
    setPlacementPosition(null);
  };

  return {
    copiedMeasurement,
    isPlacingCopy,
    placementPosition,
    handleCopyMeasurement,
    handlePasteMeasurement,
    handleCursorMove,
    handlePlaceCopy,
    cancelPlacing
  };
}
