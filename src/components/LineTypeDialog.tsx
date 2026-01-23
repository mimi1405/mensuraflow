import { LineType } from '../types';

interface LineTypeDialogProps {
  isOpen: boolean;
  onSelect: (lineType: LineType) => void;
  onCancel: () => void;
}

export function LineTypeDialog({ isOpen, onSelect, onCancel }: LineTypeDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white border border-gray-300 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Select Line Type</h2>
        <p className="text-gray-600 text-sm mb-6">
          Choose the classification for this line measurement:
        </p>

        <div className="space-y-3">
          <button
            onClick={() => onSelect('kantenschutz')}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white px-4 py-3 rounded transition-colors text-left"
          >
            <div className="font-semibold">Kantenschutz</div>
            <div className="text-sm text-pink-200">Edge protection lines</div>
          </button>

          <button
            onClick={() => onSelect('dachrandabschluss')}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-3 rounded transition-colors text-left"
          >
            <div className="font-semibold">Dachrandabschluss</div>
            <div className="text-sm text-yellow-200">Roof edge closure lines</div>
          </button>

          <button
            onClick={() => onSelect('perimeterdämmung')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded transition-colors text-left"
          >
            <div className="font-semibold">Perimeterdämmung</div>
            <div className="text-sm text-blue-200">Perimeter insulation lines</div>
          </button>
        </div>

        <button
          onClick={onCancel}
          className="w-full mt-4 bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
