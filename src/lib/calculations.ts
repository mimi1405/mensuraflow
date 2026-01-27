import { Measurement, MeasurementSubcomponent, CalculationResult, Point, Cutout } from '../types';
import { calculatePolygonArea, calculateLineLength } from './dxfParser';
import { applyCutoutsToMeasurement } from './cutoutGeometry';

export function calculateMeasurementValue(measurement: Measurement, cutouts: Cutout[] = []): number {
  const { object_type, geometry } = measurement;

  switch (object_type) {
    case 'area':
      if (measurement.cutout_ids && measurement.cutout_ids.length > 0 && cutouts.length > 0) {
        const clipped = applyCutoutsToMeasurement(measurement, cutouts);
        return clipped.area;
      }
      return calculatePolygonArea(geometry.points);

    case 'line':
      if (geometry.points.length < 2) return 0;
      let totalLength = 0;
      for (let i = 0; i < geometry.points.length - 1; i++) {
        totalLength += calculateLineLength(geometry.points[i], geometry.points[i + 1]);
      }
      return totalLength;

    case 'window':
    case 'door':
      return 0;

    default:
      return 0;
  }
}

export function generateWindowDoorSubcomponents(
  measurement: Measurement
): MeasurementSubcomponent[] {
  const { geometry } = measurement;

  if (!geometry.width || !geometry.height) {
    const bbox = getBoundingBox(geometry.points);
    geometry.width = bbox.maxX - bbox.minX;
    geometry.height = bbox.maxY - bbox.minY;
  }

  const width = geometry.width;
  const height = geometry.height;
  const openingArea = width * height;

  const subcomponents: Partial<MeasurementSubcomponent>[] = [
    {
      subcomponent_type: 'opening',
      computed_value: openingArea,
      unit: 'm²',
      parameters: { width, height }
    },
    {
      subcomponent_type: 'sturz',
      computed_value: width,
      unit: 'm',
      parameters: { width }
    },
    {
      subcomponent_type: 'brüstung',
      computed_value: width,
      unit: 'm',
      parameters: { width }
    },
    {
      subcomponent_type: 'leibung_left',
      computed_value: height,
      unit: 'm',
      parameters: { height }
    },
    {
      subcomponent_type: 'leibung_right',
      computed_value: height,
      unit: 'm',
      parameters: { height }
    }
  ];

  return subcomponents as MeasurementSubcomponent[];
}

function getBoundingBox(points: Point[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

export function calculatePlanTotals(
  measurements: Measurement[],
  subcomponents: MeasurementSubcomponent[]
): CalculationResult {
  let positiveAreas = 0;
  let abzugAreas = 0;
  const lines: { [type: string]: number } = {};
  let windows = 0;
  let doors = 0;

  // Process measurements
  for (const measurement of measurements) {
    if (measurement.object_type === 'area') {
      if (measurement.is_positive) {
        positiveAreas += measurement.computed_value;
      } else {
        abzugAreas += measurement.computed_value;
      }
    } else if (measurement.object_type === 'line') {
      const lineType = measurement.line_type || 'other';
      lines[lineType] = (lines[lineType] || 0) + measurement.computed_value;
    } else if (measurement.object_type === 'window') {
      windows++;
    } else if (measurement.object_type === 'door') {
      doors++;
    }
  }

  // Process subcomponents
  for (const sub of subcomponents) {
    if (sub.subcomponent_type === 'opening' && sub.unit === 'm²') {
      // Opening subcomponents are always abzug (deductions)
      abzugAreas += sub.computed_value;
    } else if (sub.unit === 'm') {
      // Linear subcomponents (sturz, brüstung, leibungen)
      const category = sub.subcomponent_type || 'other';
      lines[category] = (lines[category] || 0) + sub.computed_value;
    }
  }

  const netArea = positiveAreas - abzugAreas;

  return {
    planId: '',
    planName: '',
    positiveAreas,
    abzugAreas,
    netArea,
    lines,
    windows,
    doors
  };
}

export function convertToMeters(value: number, unit: string, unitScale: number = 1): number {
  switch (unit.toLowerCase()) {
    case 'mm':
      return value * unitScale / 1000;
    case 'cm':
      return value * unitScale / 100;
    case 'm':
      return value * unitScale;
    case 'inches':
      return value * unitScale * 0.0254;
    case 'feet':
      return value * unitScale * 0.3048;
    default:
      return value * unitScale;
  }
}
