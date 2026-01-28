/**
 * Cutout Target Selection Modal
 *
 * This modal allows users to select which measurements should have the cutout applied:
 * - Default option: Only the originally selected measurement
 * - Multi-select list: Other measurements in the current plan that spatially intersect the cutout
 *
 * Measurements are spatially filtered to only show objects that overlap with the cutout area.
 * After selection, the cutout is created and assigned to the chosen measurements.
 */

import { X, Check } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Measurement, Point } from '../types';
import * as martinez from 'martinez-polygon-clipping';

interface CutoutTargetModalProps {
  measurements: Measurement[];
  cutoutPoints: Point[];
  sourceMeasurementId: string | null;
  onApply: (measurementIds: string[]) => void;
  onCancel: () => void;
}

function calculateBBox(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY };
}

function bboxesOverlap(
  bbox1: { minX: number; minY: number; maxX: number; maxY: number },
  bbox2: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
  return !(
    bbox1.maxX < bbox2.minX ||
    bbox1.minX > bbox2.maxX ||
    bbox1.maxY < bbox2.minY ||
    bbox1.minY > bbox2.maxY
  );
}

function polygonsIntersect(points1: Point[], points2: Point[]): boolean {
  try {
    const poly1 = [points1.map(p => [p.x, p.y])];
    const poly2 = [points2.map(p => [p.x, p.y])];

    const intersection = martinez.intersection(poly1 as any, poly2 as any);
    return intersection !== null && intersection.length > 0;
  } catch (error) {
    console.warn('Polygon intersection test failed, using bbox only:', error);
    return true;
  }
}

export function CutoutTargetModal({
  measurements,
  cutoutPoints,
  sourceMeasurementId,
  onApply,
  onCancel
}: CutoutTargetModalProps) {
  const [selectedMeasurementIds, setSelectedMeasurementIds] = useState<string[]>(
    sourceMeasurementId ? [sourceMeasurementId] : []
  );
  const [filterType, setFilterType] = useState<'all' | 'areas' | 'floors' | 'lines'>('all');

  const sourceMeasurement = useMemo(
    () => measurements.find(m => m.id === sourceMeasurementId),
    [measurements, sourceMeasurementId]
  );

  const spatiallyFilteredMeasurements = useMemo(() => {
    if (cutoutPoints.length < 3) return measurements;

    const cutoutBBox = calculateBBox(cutoutPoints);

    return measurements.filter(m => {
      if (m.object_type === 'line') return false;

      if (m.geometry.points.length < 3) return false;

      const measurementBBox = calculateBBox(m.geometry.points);

      if (!bboxesOverlap(cutoutBBox, measurementBBox)) {
        return false;
      }

      return polygonsIntersect(cutoutPoints, m.geometry.points);
    });
  }, [measurements, cutoutPoints]);

  const filteredMeasurements = useMemo(() => {
    let filtered = spatiallyFilteredMeasurements;

    switch (filterType) {
      case 'areas':
        filtered = spatiallyFilteredMeasurements.filter(m =>
          m.object_type === 'area' || m.object_type === 'window' || m.object_type === 'door'
        );
        break;
      case 'floors':
        filtered = spatiallyFilteredMeasurements.filter(m => m.floor_category != null);
        break;
      case 'lines':
        filtered = spatiallyFilteredMeasurements.filter(m => m.object_type === 'line');
        break;
    }

    return filtered;
  }, [spatiallyFilteredMeasurements, filterType]);

  const groupedMeasurements = useMemo(() => {
    const groups: Record<string, Measurement[]> = {};

    for (const measurement of filteredMeasurements) {
      let key = 'Other';

      if (measurement.floor_category) {
        const categoryLabels = {
          ceiling: 'Ceiling',
          roomFloor: 'Room Floors',
          finish: 'Finishes'
        };
        key = categoryLabels[measurement.floor_category];
      } else {
        const typeLabels = {
          area: 'Areas',
          window: 'Windows',
          door: 'Doors',
          line: 'Lines'
        };
        key = typeLabels[measurement.object_type] || 'Other';
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(measurement);
    }

    return groups;
  }, [filteredMeasurements]);

  const toggleMeasurement = (id: string) => {
    if (selectedMeasurementIds.includes(id)) {
      setSelectedMeasurementIds(selectedMeasurementIds.filter(mid => mid !== id));
    } else {
      setSelectedMeasurementIds([...selectedMeasurementIds, id]);
    }
  };

  const toggleGroup = (group: Measurement[]) => {
    const groupIds = group.map(m => m.id);
    const allSelected = groupIds.every(id => selectedMeasurementIds.includes(id));

    if (allSelected) {
      setSelectedMeasurementIds(selectedMeasurementIds.filter(id => !groupIds.includes(id)));
    } else {
      const newIds = [...selectedMeasurementIds];
      for (const id of groupIds) {
        if (!newIds.includes(id)) {
          newIds.push(id);
        }
      }
      setSelectedMeasurementIds(newIds);
    }
  };

  const handleApply = () => {
    if (selectedMeasurementIds.length === 0) {
      alert('Please select at least one measurement to apply the cutout.');
      return;
    }
    onApply(selectedMeasurementIds);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Apply Cutout To</h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {sourceMeasurement && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Source Measurement</h3>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">{sourceMeasurement.label || 'Untitled'}</span>
                <span className="text-xs text-gray-500">({sourceMeasurement.object_type})</span>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Select Additional Measurements</h3>
            <p className="text-sm text-gray-600 mb-3">
              Choose other measurements that should have this cutout applied.
            </p>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 text-sm rounded ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('areas')}
                className={`px-3 py-1.5 text-sm rounded ${
                  filterType === 'areas'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Areas
              </button>
              <button
                onClick={() => setFilterType('floors')}
                className={`px-3 py-1.5 text-sm rounded ${
                  filterType === 'floors'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Floor Layers
              </button>
              <button
                onClick={() => setFilterType('lines')}
                className={`px-3 py-1.5 text-sm rounded ${
                  filterType === 'lines'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Lines
              </button>
            </div>

            <div className="space-y-3">
              {Object.entries(groupedMeasurements).map(([groupName, groupMeasurements]) => {
                const allSelected = groupMeasurements.every(m =>
                  selectedMeasurementIds.includes(m.id)
                );
                const someSelected = groupMeasurements.some(m =>
                  selectedMeasurementIds.includes(m.id)
                );

                return (
                  <div key={groupName} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleGroup(groupMeasurements)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-900">{groupName} ({groupMeasurements.length})</span>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        allSelected
                          ? 'bg-blue-600 border-blue-600'
                          : someSelected
                          ? 'bg-blue-200 border-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {allSelected && <Check className="w-3 h-3 text-white" />}
                        {someSelected && !allSelected && <div className="w-2 h-0.5 bg-blue-600" />}
                      </div>
                    </button>

                    <div className="border-t border-gray-200">
                      {groupMeasurements.map((measurement) => (
                        <button
                          key={measurement.id}
                          onClick={() => toggleMeasurement(measurement.id)}
                          className="w-full flex items-center justify-between p-3 pl-8 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex-1">
                            <span className="text-sm text-gray-900">
                              {measurement.label || 'Untitled'}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({measurement.computed_value.toFixed(2)} {measurement.unit})
                            </span>
                          </div>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            selectedMeasurementIds.includes(measurement.id)
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300'
                          }`}>
                            {selectedMeasurementIds.includes(measurement.id) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <span className="text-sm text-gray-600">
            {selectedMeasurementIds.length} measurement{selectedMeasurementIds.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-900 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={selectedMeasurementIds.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Cutout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
