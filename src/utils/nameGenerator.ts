import { Measurement, MeasurementObjectType, LineType } from '../types';

/**
 * Name Generation Utilities
 *
 * Handles automatic naming and numbering of measurements based on type:
 * - A# for areas
 * - F# for windows (Fenster)
 * - T# for doors (Türe)
 * - D# for ceilings (Decke)
 * - R# for room floors (Raum)
 * - DB# for finishes (Deckbelag)
 * - KS#, DR#, PD# for line types
 */

export function generateObjectName(
  objectType: MeasurementObjectType,
  measurements: Measurement[],
  lineType?: LineType,
  floorCategory?: string
): string {
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
}

export function generateCopyName(originalLabel: string, existingMeasurements: Measurement[]): string {
  const baseName = originalLabel;
  const match = baseName.match(/^(.+?)(-\d+)?$/);
  const basePrefix = match ? match[1] : baseName;

  const existingSuffixes = existingMeasurements
    .filter(m => m.label.startsWith(basePrefix + '-'))
    .map(m => {
      const suffixMatch = m.label.match(new RegExp(`^${basePrefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}-(\\d+)$`));
      return suffixMatch ? parseInt(suffixMatch[1]) : 0;
    })
    .filter(n => n > 0);

  const nextSuffix = existingSuffixes.length > 0 ? Math.max(...existingSuffixes) + 1 : 1;
  return `${basePrefix}-${nextSuffix}`;
}
