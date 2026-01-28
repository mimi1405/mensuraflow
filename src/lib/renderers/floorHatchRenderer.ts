/**
 * Floor Hatch Renderer
 *
 * Purpose: Renders floor-specific layers with hatch patterns (ceiling, roomFloor, finish).
 * Each layer can be toggled independently and uses custom hatch patterns for visual distinction.
 * Supports custom colors for finish layers based on catalog selections.
 */

import { Measurement, FinishCatalogItem } from '../../types';
import { getHatchStyle, renderHatchPattern } from '../hatchPatterns';

/**
 * Renders floor hatch patterns (ceiling, roomFloor, finish layers)
 */
export const renderFloorHatches = (
  ctx: CanvasRenderingContext2D,
  measurements: Measurement[],
  layerVisibility: { ceiling: boolean; roomFloor: boolean; finish: boolean },
  selectedMeasurementId: string | undefined,
  finishCatalog: FinishCatalogItem[]
) => {
  const floorMeasurements = measurements.filter(m => m.floor_category);

  const ceilings = floorMeasurements.filter(m => m.floor_category === 'ceiling');
  const roomFloors = floorMeasurements.filter(m => m.floor_category === 'roomFloor');
  const finishes = floorMeasurements.filter(m => m.floor_category === 'finish');

  const renderLayer = (layerMeasurements: Measurement[]) => {
    for (const measurement of layerMeasurements) {
      const isSelected = selectedMeasurementId === measurement.id;

      let customColor: string | undefined;
      if (measurement.floor_category === 'finish' && measurement.finish_catalog_id) {
        const catalogItem = finishCatalog.find(c => c.id === measurement.finish_catalog_id);
        customColor = catalogItem?.color;
      }

      const style = getHatchStyle(
        measurement.floor_category!,
        measurement.floor_kind,
        customColor
      );

      if (isSelected) {
        style.opacity = Math.min(1, style.opacity + 0.2);
      }

      renderHatchPattern(ctx, measurement.geometry.points, style);
    }
  };

  if (layerVisibility.ceiling) renderLayer(ceilings);
  if (layerVisibility.roomFloor) renderLayer(roomFloors);
  if (layerVisibility.finish) renderLayer(finishes);
};
