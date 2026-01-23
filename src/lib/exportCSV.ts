import { ExportRow, Measurement, MeasurementSubcomponent, Project, Plan } from '../types';
import { translateSubcomponentType } from './translations';

export function generateCSVExport(
  project: Project,
  plans: Plan[],
  measurementsByPlan: Map<string, Measurement[]>,
  subcomponentsByMeasurement: Map<string, MeasurementSubcomponent[]>
): string {
  const rows: ExportRow[] = [];

  for (const plan of plans) {
    const measurements = measurementsByPlan.get(plan.id) || [];

    for (const measurement of measurements) {
      const classification = measurement.is_positive ? 'Positive' : 'Abzug';
      const lineType = measurement.line_type || '';

      if (measurement.object_type === 'window' || measurement.object_type === 'door') {
        const subcomponents = subcomponentsByMeasurement.get(measurement.id) || [];

        for (const sub of subcomponents) {
          rows.push({
            Project: project.name,
            Plan: plan.name,
            ObjectID: measurement.id,
            ObjectLabel: measurement.label,
            ObjectType: measurement.object_type,
            LineType: '',
            Classification: 'Abzug',
            Subcomponent: translateSubcomponentType(sub.subcomponent_type),
            Unit: sub.unit,
            Value: parseFloat(sub.computed_value.toFixed(4)),
            Source: measurement.source
          });
        }
      } else {
        rows.push({
          Project: project.name,
          Plan: plan.name,
          ObjectID: measurement.id,
          ObjectLabel: measurement.label,
          ObjectType: measurement.object_type,
          LineType: lineType,
          Classification: classification,
          Subcomponent: '',
          Unit: measurement.unit,
          Value: parseFloat(measurement.computed_value.toFixed(4)),
          Source: measurement.source
        });
      }
    }
  }

  const headers = Object.keys(rows[0] || {
    Project: '',
    Plan: '',
    ObjectID: '',
    ObjectLabel: '',
    ObjectType: '',
    LineType: '',
    Classification: '',
    Subcomponent: '',
    Unit: '',
    Value: 0,
    Source: ''
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => headers.map(header => {
      const value = row[header as keyof ExportRow];
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    }).join(','))
  ].join('\n');

  return csvContent;
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
