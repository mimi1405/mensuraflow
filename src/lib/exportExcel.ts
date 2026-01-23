import * as XLSX from 'xlsx';
import { Measurement, MeasurementSubcomponent, Plan, FinishCatalogItem } from '../types';
import { translateSubcomponentType } from './translations';
import { supabase } from './supabase';

interface PlanSummaryRow {
  'Planname': string;
  'Bruttofläche (m²)': number;
  'Abzugsfläche (m²)': number;
  'Nettofläche (m²)': number;
  'Anzahl Fenster': number;
  'Anzahl Türen': number;
}

interface BruttoAreaRow {
  'ID': string;
  'Fläche (m²)': number;
  'Quelle': string;
}

interface OpeningRow {
  'ID': string;
  'Typ': string;
  'Breite (m)': number;
  'Höhe (m)': number;
  'Öffnung (m²)': number;
}

interface OpeningDetailRow {
  'Fenster-ID': string;
  'Detail': string;
  'Länge (m)': number;
}

interface LinearAddonRow {
  'Kategorie': string;
  'Gesamtlänge (m)': number;
}

interface BodenbemessungRow {
  'geschoss': string;
  'flaechenindex': string;
  'flaechenTyp': string;
  'm2summe': number;
  'umfang': number;
  'breite': number;
  'laenge': number;
}

export async function generateExcelExport(
  plan: Plan,
  measurements: Measurement[],
  subcomponents: MeasurementSubcomponent[],
  allPlans: Plan[] = [],
  allMeasurements: Measurement[] = []
): Promise<void> {
  const workbook = XLSX.utils.book_new();

  const sheet1Data = createPlanSummarySheet(plan, measurements, subcomponents);
  const sheet2Data = createBruttoAreasSheet(measurements);
  const sheet3Data = createOpeningsSheet(measurements);
  const sheet4Data = createOpeningDetailsSheet(measurements, subcomponents);
  const sheet5Data = createLinearAddonsSheet(measurements);

  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
  const ws3 = XLSX.utils.json_to_sheet(sheet3Data);
  const ws4 = XLSX.utils.json_to_sheet(sheet4Data);
  const ws5 = XLSX.utils.json_to_sheet(sheet5Data);

  formatWorksheet(ws1, sheet1Data.length);
  formatWorksheet(ws2, sheet2Data.length);
  formatWorksheet(ws3, sheet3Data.length);
  formatWorksheet(ws4, sheet4Data.length);
  formatWorksheet(ws5, sheet5Data.length);

  XLSX.utils.book_append_sheet(workbook, ws1, 'Planübersicht');
  XLSX.utils.book_append_sheet(workbook, ws2, 'Bruttoflächen');
  XLSX.utils.book_append_sheet(workbook, ws3, 'Öffnungen');
  XLSX.utils.book_append_sheet(workbook, ws4, 'Öffnungsdetails');
  XLSX.utils.book_append_sheet(workbook, ws5, 'Zusatzlängen');

  if (allPlans.length > 0 && allMeasurements.length > 0) {
    const sheet6Data = await createBodenbemessungSheet(allPlans, allMeasurements);
    if (sheet6Data.length > 0) {
      const ws6 = XLSX.utils.json_to_sheet(sheet6Data);
      formatWorksheet(ws6, sheet6Data.length);
      XLSX.utils.book_append_sheet(workbook, ws6, 'Bodenbemessung');
    }
  }

  XLSX.writeFile(workbook, `${plan.name}_Ausmass.xlsx`);
}

function formatWorksheet(ws: XLSX.WorkSheet, rowCount: number): void {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  for (let C = range.s.c; C <= range.e.c; ++C) {
    const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[headerCell]) continue;

    if (!ws[headerCell].s) ws[headerCell].s = {};
    ws[headerCell].s.font = { bold: true };
  }

  for (let R = 1; R <= rowCount; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddress];

      if (cell && typeof cell.v === 'number') {
        if (!cell.z) {
          cell.z = '#.##0,00';
        }
      }
    }
  }

  const cols: XLSX.ColInfo[] = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxWidth = 10;
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddress];
      if (cell && cell.v) {
        const cellWidth = String(cell.v).length;
        maxWidth = Math.max(maxWidth, cellWidth);
      }
    }
    cols.push({ wch: Math.min(maxWidth + 2, 50) });
  }
  ws['!cols'] = cols;
}

function createPlanSummarySheet(
  plan: Plan,
  measurements: Measurement[],
  subcomponents: MeasurementSubcomponent[]
): PlanSummaryRow[] {
  const bruttoAreas = measurements
    .filter(m => m.is_positive && m.object_type !== 'window' && m.object_type !== 'door' && m.object_type !== 'line')
    .reduce((sum, m) => sum + m.computed_value, 0);

  const windowsAndDoors = measurements.filter(
    m => m.object_type === 'window' || m.object_type === 'door'
  );

  const abzugAreas = subcomponents
    .filter(sub =>
      sub.subcomponent_type === 'opening' &&
      windowsAndDoors.some(m => m.id === sub.parent_measurement_id)
    )
    .reduce((sum, sub) => sum + sub.computed_value, 0);

  const nettoArea = bruttoAreas - abzugAreas;

  const numWindows = measurements.filter(m => m.object_type === 'window').length;
  const numDoors = measurements.filter(m => m.object_type === 'door').length;

  return [{
    'Planname': plan.name,
    'Bruttofläche (m²)': parseFloat(bruttoAreas.toFixed(4)),
    'Abzugsfläche (m²)': parseFloat(abzugAreas.toFixed(4)),
    'Nettofläche (m²)': parseFloat(nettoArea.toFixed(4)),
    'Anzahl Fenster': numWindows,
    'Anzahl Türen': numDoors
  }];
}

function createBruttoAreasSheet(measurements: Measurement[]): BruttoAreaRow[] {
  const bruttoMeasurements = measurements.filter(
    m => m.is_positive && m.object_type !== 'window' && m.object_type !== 'door' && m.object_type !== 'line'
  );

  return bruttoMeasurements.map((m, index) => ({
    'ID': `A${index + 1}`,
    'Fläche (m²)': parseFloat(m.computed_value.toFixed(4)),
    'Quelle': m.source
  }));
}

function createOpeningsSheet(measurements: Measurement[]): OpeningRow[] {
  const openings = measurements.filter(
    m => m.object_type === 'window' || m.object_type === 'door'
  );

  return openings.map((m, index) => {
    const width = m.geometry.width || 0;
    const height = m.geometry.height || 0;
    const openingArea = width * height;

    const typeGerman = m.object_type === 'window' ? 'Fenster' : 'Tür';

    return {
      'ID': `F${index + 1}`,
      'Typ': typeGerman,
      'Breite (m)': parseFloat(width.toFixed(4)),
      'Höhe (m)': parseFloat(height.toFixed(4)),
      'Öffnung (m²)': parseFloat(openingArea.toFixed(4))
    };
  });
}

function createOpeningDetailsSheet(
  measurements: Measurement[],
  subcomponents: MeasurementSubcomponent[]
): OpeningDetailRow[] {
  const openings = measurements.filter(
    m => m.object_type === 'window' || m.object_type === 'door'
  );

  const rows: OpeningDetailRow[] = [];

  openings.forEach((m, index) => {
    const parentId = `F${index + 1}`;
    const measurementSubs = subcomponents.filter(
      sub => sub.parent_measurement_id === m.id &&
      sub.subcomponent_type !== 'opening'
    );

    measurementSubs.forEach(sub => {
      rows.push({
        'Fenster-ID': parentId,
        'Detail': translateSubcomponentType(sub.subcomponent_type),
        'Länge (m)': parseFloat(sub.computed_value.toFixed(4))
      });
    });
  });

  return rows;
}

function createLinearAddonsSheet(measurements: Measurement[]): LinearAddonRow[] {
  const lines = measurements.filter(m => m.object_type === 'line');

  const linesByType = new Map<string, number>();

  lines.forEach(line => {
    const lineType = line.line_type || 'Sonstige';
    const currentTotal = linesByType.get(lineType) || 0;
    linesByType.set(lineType, currentTotal + line.computed_value);
  });

  const translateLineCategory = (type: string): string => {
    const typeMap: Record<string, string> = {
      'kantenschutz': 'Kantenschutz',
      'dachrandabschluss': 'Dachrandabschluss',
      'perimeterdämmung': 'Perimeterdämmung',
      'sturz': 'Sturz',
      'brüstung': 'Brüstung',
      'leibung_left': 'Leibung links',
      'leibung_right': 'Leibung rechts'
    };
    return typeMap[type.toLowerCase()] || type;
  };

  return Array.from(linesByType.entries()).map(([type, total]) => ({
    'Kategorie': translateLineCategory(type),
    'Gesamtlänge (m)': parseFloat(total.toFixed(4))
  }));
}

async function createBodenbemessungSheet(
  allPlans: Plan[],
  allMeasurements: Measurement[]
): Promise<BodenbemessungRow[]> {
  const groundPlans = allPlans.filter(p => p.type === 'ground');

  if (groundPlans.length === 0) {
    return [];
  }

  const { data: finishCatalog } = await supabase
    .from('finish_catalog')
    .select('*');

  const catalog = finishCatalog || [];
  const catalogMap = new Map(catalog.map(c => [c.id, c]));

  const rows: BodenbemessungRow[] = [];

  for (const plan of groundPlans) {
    const planMeasurements = allMeasurements.filter(
      m => m.plan_id === plan.id && m.object_type === 'area' && m.floor_category
    );

    const ceilings = planMeasurements.filter(m => m.floor_category === 'ceiling');
    const roomFloors = planMeasurements.filter(m => m.floor_category === 'roomFloor');
    const finishes = planMeasurements.filter(m => m.floor_category === 'finish');

    const sortedRoomFloors = [...roomFloors].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const ceiling of ceilings) {
      rows.push(createBodenbemessungRow(plan, ceiling, 'Decke', catalogMap));
    }

    for (const room of sortedRoomFloors) {
      let flaechenTyp = 'Raumboden';
      if (room.floor_kind === 'unterlagsboden') {
        flaechenTyp = 'Unterlagsboden (mehrschichtig)';
      } else if (room.floor_kind === 'ueberzugsboden') {
        flaechenTyp = 'Überzugsboden (einschichtig)';
      }

      rows.push(createBodenbemessungRow(plan, room, flaechenTyp, catalogMap));

      const roomFinishes = finishes
        .filter(f => f.parent_measurement_id === room.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      for (const finish of roomFinishes) {
        const catalogItem = catalogMap.get(finish.finish_catalog_id || '');
        const finishType = catalogItem
          ? `Deckbelag ${catalogItem.name}`
          : 'Deckbelag';

        rows.push(createBodenbemessungRow(plan, finish, finishType, catalogMap));
      }
    }
  }

  return rows;
}

function createBodenbemessungRow(
  plan: Plan,
  measurement: Measurement,
  flaechenTyp: string,
  catalogMap: Map<string, FinishCatalogItem>
): BodenbemessungRow {
  const flaechenindex = measurement.label || measurement.id;

  const m2summe = measurement.area_m2 !== undefined
    ? measurement.area_m2
    : measurement.computed_value;

  const umfang = measurement.perimeter_m || 0;
  const breite = measurement.width_m || 0;
  const laenge = measurement.length_m || 0;

  return {
    'geschoss': plan.floor_name || plan.name,
    'flaechenindex': flaechenindex,
    'flaechenTyp': flaechenTyp,
    'm2summe': parseFloat(m2summe.toFixed(4)),
    'umfang': parseFloat(umfang.toFixed(4)),
    'breite': parseFloat(breite.toFixed(4)),
    'laenge': parseFloat(laenge.toFixed(4))
  };
}
