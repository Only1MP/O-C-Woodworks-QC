import React, { useState } from 'react';
import { STANDARD_PARTS, DEFECT_TYPES_LIST, DefectMatrix, Part, DefectType } from '../types';
import { 
  Plus, 
  Minus, 
  RotateCcw, 
  Edit2, 
  Check
} from 'lucide-react';

// User-specified display order for defect categories on screen
const PREFERRED_DEFECT_ORDER: string[] = [
  'Wood Defect',
  'Fastener Defect',
  'Width',
  'Length',
  'Thick',
  'Thin',
  'Sanding',
  'Mold',
  'Assembly Error - Repaired',
  'Assembly Error - Scrap',
  'Beatle Kill Streaks'
];

const DISPLAY_DEFECT_TYPES: DefectType[] = (() => {
  const ordered: DefectType[] = [];
  PREFERRED_DEFECT_ORDER.forEach((pref) => {
    const found = DEFECT_TYPES_LIST.find((dt) => dt === pref);
    if (found) {
      ordered.push(found);
    }
  });
  DEFECT_TYPES_LIST.forEach((dt) => {
    if (!ordered.includes(dt)) {
      ordered.push(dt);
    }
  });
  return ordered;
})();

interface DefectMatrixTableProps {
  matrix: DefectMatrix;
  kitBins: Record<string, boolean>;
  updateCell: (part: Part, defect: DefectType, value: number) => void;
  updateKitBin: (part: Part, checked: boolean) => void;
  resetMatrix: () => void;
}

export default function DefectMatrixTable({
  matrix,
  kitBins,
  updateCell,
  updateKitBin,
  resetMatrix
}: DefectMatrixTableProps) {
  // Active highlighted part component
  const [selectedPart, setSelectedPart] = useState<Part>('Lid');
  
  // Quick value override state
  const [editingCell, setEditingCell] = useState<{ part: Part; defect: DefectType } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Matrix calculation helpers
  const getRowTotal = (part: Part): number => {
    return Object.values(matrix[part] || {}).reduce((sum, val) => sum + val, 0);
  };

  const getGrandTotal = (): number => {
    let sum = 0;
    for (const part of STANDARD_PARTS) {
      sum += getRowTotal(part);
    }
    return sum;
  };

  const triggerHaptic = (ms = 15) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch (_) {}
    }
  };

  const incrementDefectMobile = (part: Part, defect: DefectType) => {
    triggerHaptic(15);
    const current = matrix[part]?.[defect] || 0;
    updateCell(part, defect, current + 1);
  };

  const decrementDefectMobile = (part: Part, defect: DefectType) => {
    triggerHaptic(20);
    const current = matrix[part]?.[defect] || 0;
    if (current > 0) {
      updateCell(part, defect, current - 1);
    }
  };

  const handleManualValueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCell) {
      const parsed = parseInt(editValue, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        updateCell(editingCell.part, editingCell.defect, parsed);
      }
      setEditingCell(null);
    }
  };

  return (
    <div className="bg-white border border-brand-beige-200 rounded-xl p-4 sm:p-6 shadow-xs">
      
      {/* HEADER SECTION: Title & Action Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 sm:pb-5 mb-5 border-b border-brand-beige-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
              <span>Defect Tally Board</span>
              {getGrandTotal() > 0 && (
                <span className="bg-brand-forest-500 text-white font-mono text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {getGrandTotal()}
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* CONTROLLERS */}
        <div className="flex items-center gap-2">
          {/* Reset matrix counts */}
          <button
            id="clear-all-btn"
            onClick={resetMatrix}
            className="text-xs text-red-650 hover:text-red-700 font-semibold px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* MOBILE TAP ACTION BOARD */}
      <div className="flex flex-col gap-4 animate-fade-in">
        
        {/* STEP 1: SELECT COMPONENT PART PIECE */}
        <div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">
            Select Part:
          </span>
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-6 gap-2.5">
            {STANDARD_PARTS.map((part) => {
              const isSelected = selectedPart === part;
              const partTotal = getRowTotal(part);
              const isKitBin = !!kitBins[part];
              return (
                <div key={part} className="flex flex-col gap-1.5">
                  <button
                    id={`mobile-part-btn-${part}`}
                    onClick={() => setSelectedPart(part)}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-brand-forest-600 border-brand-forest-700 text-white ring-3 ring-brand-forest-500/20 font-bold scale-[1.01] shadow-xs'
                        : 'bg-brand-beige-50 hover:bg-brand-beige-100 text-gray-700 border-brand-beige-200'
                    }`}
                  >
                    <span className="text-sm tracking-tight">{part}</span>
                    <span className={`text-xs font-mono font-bold mt-1 px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : partTotal > 0
                          ? 'bg-brand-forest-100 text-brand-forest-800'
                          : 'bg-brand-beige-200 text-gray-500'
                    }`}>
                      {partTotal}
                    </span>
                  </button>

                  {/* Kit Bin checkbox directly below each Part pill */}
                  <label 
                    htmlFor={`kit-bin-mobile-${part}`}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors select-none ${
                      isKitBin 
                        ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs' 
                        : 'bg-white border-brand-beige-200 text-gray-500 hover:bg-brand-beige-50'
                    }`}
                  >
                    <input
                      id={`kit-bin-mobile-${part}`}
                      type="checkbox"
                      checked={isKitBin}
                      onChange={(e) => updateKitBin(part, e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span>Kit Bin</span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 2: TAP DEFECT TO RECORD AUDIT COUNT */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <span>Log Defects for</span>
              <span className="text-brand-forest-700 underline font-black">{selectedPart}</span>:
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              Tap damage to add (+1) · Tap (-) to reduce
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {DISPLAY_DEFECT_TYPES.map((defect) => {
              const count = matrix[selectedPart]?.[defect] || 0;
              return (
                <div 
                  key={defect} 
                  className={`flex items-stretch rounded-xl border transition-all ${
                    count > 0 
                      ? 'border-brand-forest-400/80 bg-brand-beige-50/80 shadow-xs' 
                      : 'border-brand-beige-200 bg-white hover:border-brand-beige-300'
                  }`}
                >
                  {/* Left subtract button */}
                  <button
                    id={`mobile-dec-${selectedPart}-${defect}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      decrementDefectMobile(selectedPart, defect);
                    }}
                    className={`w-12 sm:w-14 flex items-center justify-center border-r transition-all rounded-l-xl ${
                      count > 0
                        ? 'border-brand-beige-200 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-650 cursor-pointer'
                        : 'border-brand-beige-100 bg-gray-50/50 text-gray-300 cursor-not-allowed pointer-events-none'
                    }`}
                    title="Subtract 1"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  {/* Middle click area to increment count */}
                  <button
                    id={`mobile-inc-${selectedPart}-${defect}`}
                    type="button"
                    onClick={() => incrementDefectMobile(selectedPart, defect)}
                    className="flex-1 p-3 flex items-center justify-between gap-2 text-left cursor-pointer active:bg-brand-forest-50/30 transition-colors group"
                  >
                    <div className="flex flex-col gap-0.5 max-w-[170px] xs:max-w-xs">
                      <span className="text-[11px] font-bold text-gray-600 uppercase tracking-tight group-hover:text-gray-800 transition-colors">
                        {defect}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Tap to count damage (+1)
                      </span>
                    </div>

                    {/* Display Count Badge on right */}
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-mono font-black px-3.5 py-1.5 rounded-xl border ${
                        count > 0
                          ? 'bg-brand-forest-600 text-white border-brand-forest-700 shadow-2xs'
                          : 'bg-brand-beige-50 text-gray-400 border-brand-beige-200'
                      }`}>
                        {count}
                      </span>
                    </div>
                  </button>

                  {/* Quick manual edit button */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCell({ part: selectedPart, defect });
                      setEditValue(count.toString());
                    }}
                    className="px-2.5 border-l border-brand-beige-100 text-gray-400 hover:text-gray-700 hover:bg-brand-beige-100/50 rounded-r-xl transition-colors cursor-pointer flex items-center justify-center"
                    title="Type custom count"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MANUAL OVERRIDE VALUE MODAL */}
      {editingCell && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xs w-full overflow-hidden border border-brand-beige-200 animate-scale-up">
            <div className="bg-brand-beige-100 p-4 border-b border-brand-beige-200 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Set Custom Defect Count</h3>
                <p className="text-xs text-gray-500">{editingCell.part} • {editingCell.defect}</p>
              </div>
              <button
                id="close-modal-btn"
                onClick={() => setEditingCell(null)}
                className="text-gray-400 hover:text-gray-600 font-sans text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleManualValueSubmit} className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <input
                  id="modal-count-input"
                  autoFocus
                  type="number"
                  min="0"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full bg-brand-beige-50 border border-brand-beige-200 rounded-lg text-center font-mono text-2xl py-3 font-semibold focus:ring-2 focus:ring-brand-forest-500/20 focus:border-brand-forest-500 outline-hidden"
                />
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  id="modal-cancel-btn"
                  onClick={() => setEditingCell(null)}
                  className="flex-1 px-4 py-2 bg-brand-beige-50 hover:bg-brand-beige-100 text-gray-700 border border-brand-beige-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="modal-save-btn"
                  className="flex-1 px-4 py-2 bg-brand-forest-500 hover:bg-brand-forest-600 text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Apply Count
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
