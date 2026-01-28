import { useEffect } from 'react';
import { Point, Measurement } from '../types';

/**
 * Keyboard Shortcuts Hook
 *
 * Manages all keyboard event handlers for the application including:
 * - Enter: Complete measurement
 * - Escape: Cancel current operation
 * - Ctrl/Cmd+Z: Undo last point
 * - Ctrl/Cmd+C: Copy measurement
 * - Ctrl/Cmd+V: Paste measurement
 * - Delete: Delete selected measurement
 */
interface UseKeyboardShortcutsProps {
  activeTool: string;
  currentPoints: Point[];
  selectedMeasurement: Measurement | null;
  copiedMeasurement: Measurement | null;
  isPlacingCopy: boolean;
  cutoutModalStep: 'none' | 'shape' | 'scope';
  onCompleteMeasurement: (points: Point[]) => Promise<void>;
  onFinishCutoutDrawing: (points: Point[]) => void;
  onClearPoints: () => void;
  onRemoveLastPoint: () => void;
  onCopyMeasurement: () => void;
  onPasteMeasurement: () => void;
  onDeleteMeasurement: () => void;
  onCancelCutout: () => void;
  onCancelPlacing: () => void;
}

export function useKeyboardShortcuts({
  activeTool,
  currentPoints,
  selectedMeasurement,
  copiedMeasurement,
  isPlacingCopy,
  cutoutModalStep,
  onCompleteMeasurement,
  onFinishCutoutDrawing,
  onClearPoints,
  onRemoveLastPoint,
  onCopyMeasurement,
  onPasteMeasurement,
  onDeleteMeasurement,
  onCancelCutout,
  onCancelPlacing
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (activeTool === 'cutout' && currentPoints.length >= 3) {
          onFinishCutoutDrawing(currentPoints);
        } else if (currentPoints.length >= 2) {
          await onCompleteMeasurement(currentPoints);
          if (activeTool !== 'line') {
            onClearPoints();
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (cutoutModalStep !== 'none') {
          onCancelCutout();
        } else if (isPlacingCopy) {
          onCancelPlacing();
        } else if (activeTool === 'cutout') {
          onCancelCutout();
        } else {
          onClearPoints();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && currentPoints.length > 0) {
        e.preventDefault();
        onRemoveLastPoint();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedMeasurement) {
        e.preventDefault();
        onCopyMeasurement();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedMeasurement) {
        e.preventDefault();
        onPasteMeasurement();
      } else if (e.key === 'Delete' && selectedMeasurement) {
        e.preventDefault();
        onDeleteMeasurement();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentPoints,
    activeTool,
    selectedMeasurement,
    copiedMeasurement,
    isPlacingCopy,
    cutoutModalStep,
    onCompleteMeasurement,
    onFinishCutoutDrawing,
    onClearPoints,
    onRemoveLastPoint,
    onCopyMeasurement,
    onPasteMeasurement,
    onDeleteMeasurement,
    onCancelCutout,
    onCancelPlacing
  ]);
}
