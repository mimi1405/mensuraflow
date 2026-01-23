import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { translateSubcomponentType } from '../lib/translations';
import { CreditCard as Edit2, Check, X, Trash2, ChevronRight, ChevronLeft, Info } from 'lucide-react';
import type { FinishCatalogItem } from '../types';

interface PropertiesPanelProps {
  onDelete?: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function PropertiesPanel({ onDelete, isOpen, onToggle }: PropertiesPanelProps) {
  const { toolState, measurements, subcomponents, setMeasurements, setSelectedMeasurement } = useAppStore();
  const { selectedMeasurement } = toolState;
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editedLabel, setEditedLabel] = useState('');
  const [finishCatalog, setFinishCatalog] = useState<FinishCatalogItem[]>([]);

  useEffect(() => {
    loadFinishCatalog();
  }, []);

  const loadFinishCatalog = async () => {
    const { data } = await supabase.from('finish_catalog').select('*');
    setFinishCatalog(data || []);
  };

  const getObjectTypeDisplay = () => {
    if (!selectedMeasurement) return '';
    if (selectedMeasurement.object_type === 'area') return 'Fläche';
    if (selectedMeasurement.object_type === 'window') return 'Fenster';
    if (selectedMeasurement.object_type === 'door') return 'Türe';
    if (selectedMeasurement.object_type === 'line') return 'Linie';
    return selectedMeasurement.object_type;
  };

  const getSemanticRole = () => {
    if (!selectedMeasurement) return 'N/A';
    if (selectedMeasurement.object_type === 'area') {
      return <span className="text-green-400">Positive Fläche</span>;
    }
    if (selectedMeasurement.object_type === 'window' || selectedMeasurement.object_type === 'door') {
      return <span className="text-red-400">Abzug</span>;
    }
    if (selectedMeasurement.object_type === 'line') {
      if (selectedMeasurement.line_type === 'kantenschutz') {
        return <span className="text-pink-400">Kantenschutz</span>;
      }
      if (selectedMeasurement.line_type === 'dachrandabschluss') {
        return <span className="text-yellow-400">Dachrandabschluss</span>;
      }
      if (selectedMeasurement.line_type === 'perimeterdämmung') {
        return <span className="text-blue-400">Perimeterdämmung</span>;
      }
    }
    return 'N/A';
  };

  const getColorIndicator = () => {
    if (!selectedMeasurement) return 'bg-gray-500';
    if (selectedMeasurement.object_type === 'area') {
      return 'bg-green-500';
    }
    if (selectedMeasurement.object_type === 'window' || selectedMeasurement.object_type === 'door') {
      return 'bg-red-500';
    }
    if (selectedMeasurement.object_type === 'line') {
      if (selectedMeasurement.line_type === 'kantenschutz') {
        return 'bg-pink-500';
      }
      if (selectedMeasurement.line_type === 'dachrandabschluss') {
        return 'bg-yellow-500';
      }
      if (selectedMeasurement.line_type === 'perimeterdämmung') {
        return 'bg-blue-500';
      }
    }
    return 'bg-gray-500';
  };

  const startEditingLabel = () => {
    if (!selectedMeasurement) return;
    setEditedLabel(selectedMeasurement.label);
    setIsEditingLabel(true);
  };

  const cancelEditingLabel = () => {
    setIsEditingLabel(false);
    setEditedLabel('');
  };

  const saveLabel = async () => {
    if (!selectedMeasurement || !editedLabel.trim()) {
      cancelEditingLabel();
      return;
    }

    const { error } = await supabase
      .from('measurements')
      .update({ label: editedLabel.trim() })
      .eq('id', selectedMeasurement.id);

    if (!error) {
      const updatedMeasurement = { ...selectedMeasurement, label: editedLabel.trim() };
      const updatedMeasurements = measurements.map(m =>
        m.id === selectedMeasurement.id ? updatedMeasurement : m
      );
      setMeasurements(updatedMeasurements);
      setSelectedMeasurement(updatedMeasurement);
    }

    setIsEditingLabel(false);
    setEditedLabel('');
  };

  const measurementSubs = selectedMeasurement
    ? subcomponents.filter(sub => sub.parent_measurement_id === selectedMeasurement.id)
    : [];

  return (
    <>
      <div
        className={`border-l border-gray-300 flex flex-col transition-all duration-300 ${
          isOpen ? 'w-80' : 'w-0'
        } overflow-hidden`}
      >
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Eigenschaften</h2>
            {onDelete && selectedMeasurement && (
              <button
                onClick={onDelete}
                className="p-2 bg-red-600 hover:bg-red-700 rounded text-white"
                title="Delete (Del)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {!selectedMeasurement ? (
            <p className="text-gray-600">Messungselement selektieren um Eigenschaften anzuzeigen</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${getColorIndicator()}`}></div>
                <span className="text-sm text-gray-600">Farbindikator</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Objekttyp</label>
                <div className="text-gray-900 font-medium">{getObjectTypeDisplay()}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Name / Index</label>
                {isEditingLabel ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editedLabel}
                      onChange={(e) => setEditedLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveLabel();
                        if (e.key === 'Escape') cancelEditingLabel();
                      }}
                      className="flex-1 bg-gray-200 text-gray-900 px-2 py-1 rounded border border-gray-300"
                      autoFocus
                    />
                    <button onClick={saveLabel} className="p-1 hover:bg-gray-200 rounded">
                      <Check className="w-4 h-4 text-green-400" />
                    </button>
                    <button onClick={cancelEditingLabel} className="p-1 hover:bg-gray-200 rounded">
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 font-bold">{selectedMeasurement.label}</span>
                    <button onClick={startEditingLabel} className="p-1 hover:bg-gray-200 rounded">
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Semantische Rolle</label>
                <div className="font-medium">{getSemanticRole()}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Quantity</label>
                <div className="text-gray-900 font-bold text-lg">
                  {selectedMeasurement.computed_value.toFixed(4)} {selectedMeasurement.unit}
                </div>
              </div>

              {selectedMeasurement.floor_category && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Bodenkategorie</label>
                    <div className="text-gray-900 font-medium">
                      {selectedMeasurement.floor_category === 'ceiling' && 'Decke'}
                      {selectedMeasurement.floor_category === 'roomFloor' && 'Raumboden'}
                      {selectedMeasurement.floor_category === 'finish' && 'Deckbelag'}
                    </div>
                  </div>

                  {selectedMeasurement.floor_kind && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Bodenart</label>
                      <div className="text-gray-900 font-medium">
                        {selectedMeasurement.floor_kind === 'unterlagsboden' && 'Unterlagsboden (mehrschichtig)'}
                        {selectedMeasurement.floor_kind === 'ueberzugsboden' && 'Überzugsboden (einschichtig)'}
                      </div>
                    </div>
                  )}

                  {selectedMeasurement.finish_catalog_id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Deckbelag</label>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const catalogItem = finishCatalog.find(c => c.id === selectedMeasurement.finish_catalog_id);
                          return catalogItem ? (
                            <>
                              <div
                                className="w-4 h-4 rounded border border-gray-300"
                                style={{ backgroundColor: catalogItem.color || '#94a3b8' }}
                              />
                              <span className="text-gray-900 font-medium">{catalogItem.name}</span>
                              {catalogItem.code && (
                                <span className="text-gray-500 text-sm">({catalogItem.code})</span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-500">Unbekannt</span>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {selectedMeasurement.area_m2 !== undefined && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Geometrie</label>
                      <div className="text-gray-900 space-y-1">
                        <div>Fläche: {selectedMeasurement.area_m2.toFixed(4)} m²</div>
                        {selectedMeasurement.perimeter_m !== undefined && (
                          <div>Umfang: {selectedMeasurement.perimeter_m.toFixed(3)} m</div>
                        )}
                        {selectedMeasurement.width_m !== undefined && (
                          <div>Breite: {selectedMeasurement.width_m.toFixed(3)} m</div>
                        )}
                        {selectedMeasurement.length_m !== undefined && (
                          <div>Länge: {selectedMeasurement.length_m.toFixed(3)} m</div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedMeasurement.geometry.width && selectedMeasurement.geometry.height && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Dimensionen</label>
                  <div className="text-gray-900">
                    Breite: {selectedMeasurement.geometry.width.toFixed(3)} m
                    <br />
                    Höhe: {selectedMeasurement.geometry.height.toFixed(3)} m
                  </div>
                </div>
              )}

              {measurementSubs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Subkomponenten</label>
                  <div className="space-y-2">
                    {measurementSubs.map(sub => (
                      <div key={sub.id} className="bg-gray-200 p-2 rounded">
                        <div className="text-sm text-gray-600">
                          {translateSubcomponentType(sub.subcomponent_type)}
                        </div>
                        <div className="text-gray-900 font-medium">
                          {sub.computed_value.toFixed(4)} {sub.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Quelle</label>
                <div className="text-gray-900 capitalize">{selectedMeasurement.source}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onToggle}
        className="absolute right-0 top-1/2 -translate-y-1/2 border border-gray-200 rounded-l-md p-2 transition-colors z-10"
        style={{ right: isOpen ? '320px' : '0px' }}
        title={isOpen ? 'Close properties' : 'Open properties'}
      >
        {isOpen ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <div className="flex">
            <ChevronLeft className="w-4 h-4" />
            <Info className="w-4 h-4" />
          </div>
        )}
      </button>
    </>
  );
}
