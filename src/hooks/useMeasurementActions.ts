import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { Point, LineType } from '../types';

/**
 * Measurement Actions Hook
 *
 * Handles user interactions with measurements including:
 * - Point click handling for drawing
 * - Measurement deletion with cleanup
 * - Line type dialog management
 * - Cutout detection and cleanup
 */
export function useMeasurementActions(
  completeMeasurement: (points: Point[], lineType?: LineType) => Promise<void>,
  loadMeasurements: () => Promise<void>
) {
  const [showLineTypeDialog, setShowLineTypeDialog] = useState(false);

  const {
    currentPlan,
    toolState,
    measurements,
    addCurrentPoint,
    clearCurrentPoints,
    setPendingLineType,
    setSelectedMeasurement,
    finishCutoutDrawing
  } = useAppStore();

  const shouldCompleteMeasurement = (tool: string, pointCount: number): boolean => {
    if (tool === 'rectangle' && pointCount === 2) return true;
    if ((tool === 'window' || tool === 'door') && pointCount === 2) return true;
    if (tool === 'line' && pointCount >= 2) return false;
    if (tool === 'area' && pointCount >= 3) return false;
    return false;
  };

  const handlePointClick = async (point: Point) => {
    if (!currentPlan) return;

    if (toolState.activeTool === 'select' || toolState.activeTool === 'pan') {
      return;
    }

    if (toolState.activeTool === 'cutout' && toolState.cutoutShapeKind === 'rectangle') {
      addCurrentPoint(point);
      if (toolState.currentPoints.length + 1 === 2) {
        const rectPoints = [
          point,
          { x: toolState.currentPoints[0].x, y: point.y },
          toolState.currentPoints[0],
          { x: point.x, y: toolState.currentPoints[0].y }
        ];
        finishCutoutDrawing(rectPoints);
      }
      return;
    }

    addCurrentPoint(point);

    const shouldComplete = shouldCompleteMeasurement(toolState.activeTool, toolState.currentPoints.length + 1);

    if (shouldComplete) {
      const points = [...toolState.currentPoints, point];

      if (toolState.activeTool === 'line') {
        setShowLineTypeDialog(true);
      } else {
        await completeMeasurement(points);
        clearCurrentPoints();
      }
    }
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

    const deletedMeasurementId = toolState.selectedMeasurement.id;
    const cutoutIdsOnDeletedMeasurement = toolState.selectedMeasurement.cutout_ids || [];

    const { error } = await supabase
      .from('measurements')
      .delete()
      .eq('id', deletedMeasurementId);

    if (!error) {
      if (cutoutIdsOnDeletedMeasurement.length > 0) {
        const remainingMeasurements = measurements.filter(m => m.id !== deletedMeasurementId);

        const cutoutsToDelete: string[] = [];
        for (const cutoutId of cutoutIdsOnDeletedMeasurement) {
          const stillReferenced = remainingMeasurements.some(m =>
            m.cutout_ids?.includes(cutoutId)
          );

          if (!stillReferenced) {
            cutoutsToDelete.push(cutoutId);
          }
        }

        if (cutoutsToDelete.length > 0) {
          await supabase
            .from('cutouts')
            .delete()
            .in('id', cutoutsToDelete);
        }
      }

      setSelectedMeasurement(null);
      await loadMeasurements();
    }
  };

  return {
    showLineTypeDialog,
    handlePointClick,
    handleLineTypeSelect,
    handleLineTypeCancel,
    handleDeleteMeasurement
  };
}
