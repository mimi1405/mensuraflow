import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { FinishCatalogItem } from '../types';

export function FinishCatalog() {
  const [items, setItems] = useState<FinishCatalogItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinishCatalogItem | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', color: '#94a3b8' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    console.log('Loading finish catalog...');
    const { data, error } = await supabase
      .from('finish_catalog')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading finish catalog:', error);
    } else {
      console.log('Loaded finish catalog items:', data);
      setItems(data || []);
    }
    setLoading(false);
  };

  const openDialog = (item?: FinishCatalogItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        code: item.code || '',
        color: item.color || '#94a3b8',
      });
    } else {
      setEditingItem(null);
      setFormData({ name: '', code: '', color: '#94a3b8' });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({ name: '', code: '', color: '#94a3b8' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Submitting finish catalog item:', formData);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('Sie müssen angemeldet sein, um Deckbeläge zu erstellen.');
      return;
    }

    if (editingItem) {
      const { data, error } = await supabase
        .from('finish_catalog')
        .update({
          name: formData.name,
          code: formData.code || null,
          color: formData.color,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingItem.id)
        .select();

      if (error) {
        console.error('Error updating finish:', error);
        alert('Fehler beim Aktualisieren: ' + error.message);
        return;
      }

      console.log('Updated finish:', data);
    } else {
      const { data, error } = await supabase
        .from('finish_catalog')
        .insert({
          user_id: user.id,
          name: formData.name,
          code: formData.code || null,
          color: formData.color,
        })
        .select();

      if (error) {
        console.error('Error creating finish:', error);
        alert('Fehler beim Erstellen: ' + error.message);
        return;
      }

      console.log('Created finish:', data);
    }

    closeDialog();
    await loadItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sind Sie sicher, dass Sie diesen Deckbelag löschen möchten?')) {
      return;
    }

    const { error } = await supabase
      .from('finish_catalog')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting finish:', error);
    } else {
      loadItems();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <h2 className="text-lg font-semibold text-gray-900">Deckbelag-Katalog</h2>
        <button
          onClick={() => openDialog()}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neu
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Lädt...</div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Keine Deckbeläge vorhanden. Erstellen Sie einen neuen Eintrag.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-10 h-10 rounded border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: item.color || '#94a3b8' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.code && (
                        <div className="text-sm text-gray-500 mt-1">Code: {item.code}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openDialog(item)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"
                      title="Bearbeiten"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingItem ? 'Deckbelag bearbeiten' : 'Neuer Deckbelag'}
              </h3>
              <button
                onClick={closeDialog}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code (optional)
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Farbe
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingItem ? 'Speichern' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
