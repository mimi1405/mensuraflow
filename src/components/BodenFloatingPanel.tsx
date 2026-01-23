import { useState, useEffect } from 'react';
import { X, CheckCircle, Plus } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import type { FinishCatalogItem } from '../types';

interface BodenFloatingPanelProps {
  onApplyFinish: (catalogId: string) => void;
  onRemoveFinish: () => void;
}

export function BodenFloatingPanel({ onApplyFinish, onRemoveFinish }: BodenFloatingPanelProps) {
  const {
    toolState,
    measurements,
    setBodenPanelOpen,
    armBodenIntent,
    advanceBodenToRooms,
    setBodenFloorKind,
    setActiveTool,
    clearCurrentPoints
  } = useAppStore();

  const [finishCatalog, setFinishCatalog] = useState<FinishCatalogItem[]>([]);
  const [selectedFinishId, setSelectedFinishId] = useState<string>('');
  const [ceilingGeometry, setCeilingGeometry] = useState<'polygon' | 'rectangle'>('polygon');
  const [roomGeometry, setRoomGeometry] = useState<'polygon' | 'rectangle'>('polygon');

  const { bodenMode } = toolState;

  useEffect(() => {
    loadFinishCatalog();
  }, []);

  const loadFinishCatalog = async () => {
    const { data } = await supabase
      .from('finish_catalog')
      .select('*')
      .order('name');
    setFinishCatalog(data || []);
    if (data && data.length > 0 && !selectedFinishId) {
      setSelectedFinishId(data[0].id);
    }
  };

  const ceilingMeasurements = measurements.filter(m => m.floor_category === 'ceiling');
  const roomMeasurements = measurements.filter(m => m.floor_category === 'roomFloor');
  const hasCeiling = ceilingMeasurements.length > 0;

  const selectedRoom = bodenMode.selectedRoomId
    ? measurements.find(m => m.id === bodenMode.selectedRoomId && m.floor_category === 'roomFloor')
    : null;

  const selectedRoomFinish = selectedRoom
    ? measurements.find(m => m.floor_category === 'finish' && m.parent_measurement_id === selectedRoom.id)
    : null;

  useEffect(() => {
    if (hasCeiling && bodenMode.step === 'ceiling' && !bodenMode.isArmed) {
      advanceBodenToRooms();
    }
  }, [hasCeiling, bodenMode.step, bodenMode.isArmed, advanceBodenToRooms]);

  const handleClose = () => {
    setBodenPanelOpen(false);
  };

  const handleDrawCeiling = () => {
    console.debug('[BodenPanel] Starting ceiling drawing with geometry:', ceilingGeometry);

    armBodenIntent('ceiling', ceilingGeometry);

    if (ceilingGeometry === 'polygon') {
      setActiveTool('area');
    } else {
      setActiveTool('rectangle');
    }

    clearCurrentPoints();
  };

  const handleRedrawCeiling = async () => {
    if (confirm('Decke neu zeichnen? Die vorhandene Decke wird entfernt.')) {
      for (const m of ceilingMeasurements) {
        await supabase.from('measurements').delete().eq('id', m.id);
      }
      window.location.reload();
    }
  };

  const handleDrawRoom = () => {
    console.debug('[BodenPanel] Starting room drawing with geometry:', roomGeometry);

    armBodenIntent('roomFloor', roomGeometry);

    if (roomGeometry === 'polygon') {
      setActiveTool('area');
    } else {
      setActiveTool('rectangle');
    }

    clearCurrentPoints();
  };

  const handleFinishRooms = () => {
    setActiveTool('select');
  };

  const handleApplyFinish = () => {
    if (selectedFinishId) {
      onApplyFinish(selectedFinishId);
    }
  };

  const isDrawingCeiling = bodenMode.isArmed && bodenMode.intent === 'ceiling';
  const isDrawingRoom = bodenMode.isArmed && bodenMode.intent === 'roomFloor';
  const isDrawing = isDrawingCeiling || isDrawingRoom;

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-2xl border border-gray-300 z-50">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-300 rounded-t-lg">
        <h3 className="font-semibold text-gray-900">Bodenbemessung</h3>
        <button
          onClick={handleClose}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
        <div className={`border rounded-lg p-3 ${bodenMode.step === 'ceiling' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">1. Decke</h4>
            {hasCeiling && <CheckCircle className="w-5 h-5 text-green-600" />}
          </div>

          {!hasCeiling ? (
            <>
              <p className="text-sm text-gray-600 mb-3">Wählen Sie die Geometrie und zeichnen Sie die Decke.</p>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Geometrie wählen</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCeilingGeometry('polygon')}
                    disabled={isDrawing}
                    className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                      ceilingGeometry === 'polygon'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Polygon
                  </button>
                  <button
                    onClick={() => setCeilingGeometry('rectangle')}
                    disabled={isDrawing}
                    className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                      ceilingGeometry === 'rectangle'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Rechteck
                  </button>
                </div>
              </div>

              <button
                onClick={handleDrawCeiling}
                disabled={isDrawing}
                className="w-full px-4 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Decke zeichnen
              </button>

              {isDrawingCeiling && (
                <p className="text-xs text-blue-700 bg-blue-100 rounded p-2 mt-2">
                  {ceilingGeometry === 'rectangle'
                    ? 'Klicken Sie zwei gegenüberliegende Ecken.'
                    : 'Klicken Sie Punkte. Enter zum Abschließen.'}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-green-700">✓ Decke erfasst ({ceilingMeasurements[0].area_m2?.toFixed(2) || ceilingMeasurements[0].computed_value.toFixed(2)} m²)</p>
              <button
                onClick={handleRedrawCeiling}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Decke neu zeichnen
              </button>
            </div>
          )}
        </div>

        <div className={`border rounded-lg p-3 ${bodenMode.step === 'rooms' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} ${!hasCeiling ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">2. Räume</h4>
            {roomMeasurements.length > 0 && (
              <span className="text-sm text-gray-600">({roomMeasurements.length} Räume)</span>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-3">Zeichnen Sie Räume und wählen Sie den Bodentyp.</p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bodenart</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="floorKind"
                    value="unterlagsboden"
                    checked={bodenMode.floorKind === 'unterlagsboden'}
                    onChange={() => setBodenFloorKind('unterlagsboden')}
                    disabled={isDrawing}
                    className="mr-2"
                  />
                  <span className="text-sm">Unterlagsboden (mehrschichtig)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="floorKind"
                    value="ueberzugsboden"
                    checked={bodenMode.floorKind === 'ueberzugsboden'}
                    onChange={() => setBodenFloorKind('ueberzugsboden')}
                    disabled={isDrawing}
                    className="mr-2"
                  />
                  <span className="text-sm">Überzugsboden (einschichtig)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Geometrie wählen</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setRoomGeometry('polygon')}
                  disabled={isDrawing}
                  className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                    roomGeometry === 'polygon'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Polygon
                </button>
                <button
                  onClick={() => setRoomGeometry('rectangle')}
                  disabled={isDrawing}
                  className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                    roomGeometry === 'rectangle'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Rechteck
                </button>
              </div>
            </div>

            {!isDrawingRoom && (
              <button
                onClick={handleDrawRoom}
                disabled={isDrawing}
                className="w-full px-4 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Raum zeichnen
              </button>
            )}

            {isDrawingRoom && (
              <p className="text-xs text-blue-700 bg-blue-100 rounded p-2">
                {roomGeometry === 'rectangle'
                  ? 'Klicken Sie zwei gegenüberliegende Ecken.'
                  : 'Klicken Sie Punkte. Enter zum Abschließen.'}
              </p>
            )}

            {roomMeasurements.length > 0 && !isDrawing && (
              <div className="flex gap-2">
                <button
                  onClick={handleDrawRoom}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Weiteren Raum zeichnen
                </button>
                <button
                  onClick={handleFinishRooms}
                  className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                >
                  Fertig
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={`border rounded-lg p-3 ${!hasCeiling ? 'opacity-50 pointer-events-none' : 'border-gray-200'}`}>
          <h4 className="font-medium text-gray-900 mb-2">3. Deckbelag (Optional)</h4>

          {!selectedRoom ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Klicken Sie auf einen Raum im Plan, um einen Deckbelag anzuwenden.</p>
              {roomMeasurements.length > 0 && (
                <p className="text-xs text-blue-600 bg-blue-50 rounded p-2">
                  💡 Sie können Räume direkt im Plan anklicken, ohne das Werkzeug zu wechseln.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded p-2">
                <p className="text-sm font-medium text-green-900">
                  ✓ Raum ausgewählt
                </p>
                <p className="text-xs text-green-700">
                  {selectedRoom.label} ({selectedRoom.area_m2?.toFixed(2) || selectedRoom.computed_value.toFixed(2)} m²)
                </p>
              </div>

              {finishCatalog.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  Keine Deckbeläge im Katalog. Erstellen Sie einen im Einstellungen-Tab.
                </p>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Deckbelag wählen</label>
                    <select
                      value={selectedFinishId}
                      onChange={(e) => setSelectedFinishId(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                    >
                      {finishCatalog.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} {item.code ? `(${item.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedRoomFinish ? (
                    <div className="space-y-2">
                      <p className="text-sm text-green-700">
                        ✓ Deckbelag angewendet: {finishCatalog.find(f => f.id === selectedRoomFinish.finish_catalog_id)?.name || 'Unbekannt'}
                      </p>
                      <button
                        onClick={onRemoveFinish}
                        className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        Deckbelag entfernen
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleApplyFinish}
                      disabled={!selectedFinishId}
                      className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Deckbelag auf ausgewählten Raum anwenden
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
