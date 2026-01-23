import { Download } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { calculatePlanTotals } from '../lib/calculations';
import { generateExcelExport } from '../lib/exportExcel';

export function SummaryPanel() {
  const { currentPlan, plans, measurements, subcomponents } = useAppStore();

  if (!currentPlan) {
    return (
      <div className="p-4 bg-gray-100 border border-gray-300 rounded">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Zusammenfassung</h3>
        <p className="text-gray-600">Kein Plan ausgewählt</p>
      </div>
    );
  }

  const planMeasurements = measurements.filter(m => m.plan_id === currentPlan.id);
  const planSubcomponents = subcomponents.filter(sub =>
    planMeasurements.some(m => m.id === sub.parent_measurement_id)
  );

  const totals = calculatePlanTotals(planMeasurements, planSubcomponents);

  const filteredLines = Object.entries(totals.lines).filter(([type]) =>
    type === 'kantenschutz' || type === 'dachrandabschluss' || type === 'perimeterdämmung'
  );

  const translateLineType = (type: string): string => {
    if (type === 'kantenschutz') return 'Kantenschutz';
    if (type === 'dachrandabschluss') return 'Dachrandabschluss';
    if (type === 'perimeterdämmung') return 'Perimeterdämmung';
    return type;
  };

  const handleExport = async () => {
    if (!currentPlan) return;

    await generateExcelExport(currentPlan, planMeasurements, planSubcomponents, plans, measurements);
  };

  return (
    <div className="p-4 bg-gray-100 border border-gray-300 rounded">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Zusammenfassung - {currentPlan.name}</h3>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          disabled={!currentPlan}
        >
          <Download className="w-4 h-4" />
          Exportieren
        </button>
      </div>

      <div className="space-y-3">
        <div className="bg-gray-200 p-3 rounded">
          <div className="text-sm text-gray-600">Bruttofläche</div>
          <div className="text-xl font-bold text-green-400">
            {totals.positiveAreas.toFixed(2)} m²
          </div>
        </div>

        <div className="bg-gray-200 p-3 rounded">
          <div className="text-sm text-gray-600">Abzugsfläche</div>
          <div className="text-xl font-bold text-red-400">
            {totals.abzugAreas.toFixed(2)} m²
          </div>
        </div>

        <div className="bg-gray-200 p-3 rounded">
          <div className="text-sm text-gray-600">Nettofläche</div>
          <div className="text-2xl font-bold text-gray-900">
            {totals.netArea.toFixed(2)} m²
          </div>
        </div>

        {filteredLines.length > 0 && (
          <div className="bg-gray-200 p-3 rounded">
            <div className="text-sm text-gray-600 mb-2">Linien</div>
            {filteredLines.map(([type, length]) => (
              <div key={type} className="flex justify-between text-gray-900">
                <span>{translateLineType(type)} Laufmetersumme</span>
                <span className="font-semibold">{length.toFixed(2)} m</span>
              </div>
            ))}
          </div>
        )}

        {(totals.windows > 0 || totals.doors > 0) && (
          <div className="bg-gray-200 p-3 rounded">
            <div className="text-sm text-gray-600 mb-2">Öffnungen</div>
            {totals.windows > 0 && (
              <div className="flex justify-between text-gray-900">
                <span>Fenster</span>
                <span className="font-semibold">{totals.windows}</span>
              </div>
            )}
            {totals.doors > 0 && (
              <div className="flex justify-between text-gray-900">
                <span>Türen</span>
                <span className="font-semibold">{totals.doors}</span>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-600 mt-4">
          Gesamtanzahl Messungen: {planMeasurements.length}
        </div>
      </div>
    </div>
  );
}
