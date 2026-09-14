import React, { useState } from 'react';
import { STANDARD_PARTS, DEFECT_TYPES_LIST, DefectMatrix, Part, DefectType } from '../types';
import { 
  Plus, 
  Minus, 
  RotateCcw, 
  Edit2, 
  Check, 
  LayoutList, 
  Grid3X3
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
  // Toggle between Mobile-First Pocket Tapper and Desktop Excel Grid
  const [viewMode, setViewMode] = useState<'mobile' | 'grid'>('mobile');

  // Active highlighted part component in mobile mode
  const [selectedPart, setSelectedPart] = useState<Part>('Lid');

  // Mode selection for rapid tapping in Desktop Grid: increment vs decrement
  const [activeMode, setActiveMode] = useState<'increment' | 'decrement'>('increment');
  
  // Quick value override state
  const [editingCell, setEditingCell] = useState<{ part: Part; defect: DefectType } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Matrix calculation helpers
  const getRowTotal = (part: Part): number => {
    return Object.values(matrix[part] || {}).reduce((sum, val) => sum + val, 0);
  };

  const getColTotal = (defect: DefectType): number => {
    let sum = 0;
    for (const part of STANDARD_PARTS) {
      sum += matrix[part]?.[defect] || 0;
    }
    return sum;
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

  const handleCellClick = (part: Part, defect: DefectType) => {
    triggerHaptic(12);
    const current = matrix[part]?.[defect] || 0;
    if (activeMode === 'increment') {
      updateCell(part, defect, current + 1);
    } else {
      updateCell(part, defect, Math.max(0, current - 1));
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

  // Function to return tailwind gradient classes for cell heat mapping
  const getCellBgClass = (count: number): string => {
    if (count === 0) return 'bg-brand-beige-50/50 hover:bg-brand-beige-100/50 text-gray-400 border-brand-beige-100';
    if (count <= 2) return 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200 font-medium';
    if (count <= 5) return 'bg-orange-100 hover:bg-orange-200 text-orange-900 border-orange-300 font-semibold';
    return 'bg-red-100 hover:bg-red-200 text-red-900 border-red-300 font-bold';
  };

  return (
    <div className="bg-white border border-brand-beige-200 rounded-xl p-4 sm:p-6 shadow-xs">
      
      {/* Table Interface Header controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-brand-beige-100">
        <div className="flex flex-col gap-1">
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

        {/* CONTROLLERS - INTERFACE SELECTORS */}
        <div className="flex flex-wrap items-center gap-3 justify-between sm:justify-start">
          
          {/* Dual layout switch */}
          <div className="flex bg-brand-beige-100 p-1 rounded-lg border border-brand-beige-200 shadow-3xs">
            <button
              id="layout-list-btn"
              onClick={() => setViewMode('mobile')}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'mobile'
                  ? 'bg-brand-forest-500 text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              id="layout-grid-btn"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-brand-forest-500 text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Grid View</span>
            </button>
          </div>

          {/* Reset matrix counts */}
          <div className="flex items-center gap-1.5">
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
      </div>

      {/* RENDER MODE A: MOBILE TAP ACTION BOARD */}
      {viewMode === 'mobile' && (
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
                      <span className="text-[11px] uppercase tracking-wider font-semibold block">{part}</span>
                      <span className={`text-xs font-mono font-bold mt-1.5 px-2 py-0.5 rounded-full ${
                        isSelected 
                          ? 'bg-brand-forest-800 text-white' 
                          : partTotal > 0
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-brand-beige-200 text-gray-600'
                      }`}>
                        {partTotal} {partTotal === 1 ? 'defect' : 'defects'}
                      </span>
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse"></span>
                      )}
                    </button>
                    
                    {/* Kit Bin checkbox under part button */}
                    <label 
                      className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-brand-beige-50 hover:bg-brand-beige-100 border border-brand-beige-200 text-[11px] font-semibold text-gray-700 cursor-pointer transition-all select-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        id={`kit-bin-cb-mob-${part}`}
                        type="checkbox"
                        checked={isKitBin}
                        onChange={(e) => updateKitBin(part, e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-brand-beige-300 text-brand-forest-600 focus:ring-brand-forest-500 cursor-pointer"
                      />
                      <span>Kit Bin</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 2: TAP ACTION LOGGER CARDS */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Defects for <strong className="text-brand-forest-600 underline decoration-brand-forest-500">{selectedPart}</strong>:
              </span>
              {getRowTotal(selectedPart) > 0 && (
                <button
                  id={`clear-row-${selectedPart}`}
                  onClick={() => {
                    DEFECT_TYPES_LIST.forEach(defect => {
                      updateCell(selectedPart, defect, 0);
                    });
                  }}
                  className="text-[10px] font-bold text-red-650 hover:underline cursor-pointer"
                >
                  Clear all {selectedPart} defects
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DISPLAY_DEFECT_TYPES.map((defect) => {
                const count = matrix[selectedPart]?.[defect] || 0;
                
                return (
                  <div
                    key={defect}
                    className={`border rounded-xl overflow-hidden shadow-3xs flex items-stretch transition-all ${
                      count > 0 
                        ? 'border-brand-forest-500 bg-brand-forest-50/20' 
                        : 'border-brand-beige-200 bg-white'
                    }`}
                  >
                    
                    {/* LEFT AREA: Adjust Down / Manual Override */}
                    <div className="flex flex-col justify-between border-r border-brand-beige-100 bg-brand-beige-50/40 w-12 sm:w-14 shrink-0">
                      
                      {/* Decrement Button */}
                      <button
                        id={`mob-dec-${defect}`}
                        onClick={() => decrementDefectMobile(selectedPart, defect)}
                        className={`flex-1 flex items-center justify-center transition-colors border-b border-brand-beige-100 cursor-pointer ${
                          count > 0 
                            ? 'hover:bg-red-50 text-red-650' 
                            : 'text-gray-300 pointer-events-none'
                        }`}
                        title="Minus 1 count"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      {/* Explicit Override Input Button */}
                      <button
                        id={`mob-edit-${defect}`}
                        onClick={() => {
                          setEditingCell({ part: selectedPart, defect });
                          setEditValue(count.toString());
                        }}
                        className="p-2 text-gray-400 hover:text-brand-forest-600 flex items-center justify-center cursor-pointer"
                        title="Manually key in exact counts"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* MAIN MIDDLE TAP PORTION */}
                    <button
                      id={`mob-tap-${defect}`}
                      onClick={() => incrementDefectMobile(selectedPart, defect)}
                      className="flex-1 text-left p-3.5 flex items-center justify-between gap-2 active:bg-brand-forest-100/10 transition-colors cursor-pointer group"
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

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* RENDER MODE B: STRETCH FULL EXCEL GRID MATRIX */}
      {viewMode === 'grid' && (
        <div className="overflow-x-auto border border-brand-beige-200 rounded-lg animate-fade-in">
          <table className="w-full text-left border-collapse table-fixed min-w-[950px]">
            <thead>
              <tr className="bg-brand-beige-50/70 border-b border-brand-beige-200">
                {/* Frozen Left Corner */}
                <th className="sticky left-0 z-10 bg-brand-beige-100 text-xs font-bold text-brand-beige-800 uppercase tracking-wider px-4 py-3 border-r border-brand-beige-200 w-36 shadow-xs">
                  PART TYPE
                </th>
                {/* Defect Column Headers */}
                {DISPLAY_DEFECT_TYPES.map((defect) => (
                  <th
                    key={defect}
                    className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-tight p-2.5 text-center leading-tight border-r border-brand-beige-200"
                  >
                    <div className="line-clamp-2 h-8 flex flex-col justify-center">
                      {defect}
                    </div>
                  </th>
                ))}
                {/* Row Total Column Header */}
                <th className="bg-brand-beige-100/50 text-xs font-bold text-brand-forest-700 uppercase tracking-tight p-2.5 text-center w-24">
                  Row Total
                </th>
              </tr>
            </thead>
            <tbody>
              {STANDARD_PARTS.map((part) => {
                const rowTotal = getRowTotal(part);
                return (
                  <tr
                    key={part}
                    className="border-b border-brand-beige-100 hover:bg-brand-beige-50/20 transition-all"
                  >
                    {/* Part Row Label (Sticky) */}
                    <td className="sticky left-0 bg-brand-beige-50 font-bold text-sm text-gray-800 px-3 py-3 border-r border-brand-beige-200 shadow-xs z-10">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-800">{part}</span>
                          <span className="text-[10px] font-mono text-gray-400 bg-brand-beige-100 px-1.5 py-0.5 rounded-sm">
                            #{STANDARD_PARTS.indexOf(part) + 1}
                          </span>
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-gray-700 hover:text-gray-900 select-none bg-white/80 px-2 py-1 rounded border border-brand-beige-200">
                          <input
                            id={`kit-bin-cb-grid-${part}`}
                            type="checkbox"
                            checked={!!kitBins[part]}
                            onChange={(e) => updateKitBin(part, e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-brand-forest-600 focus:ring-brand-forest-500 cursor-pointer"
                          />
                          <span className="font-semibold text-gray-700">Kit Bin</span>
                        </label>
                      </div>
                    </td>

                    {/* Individual Defect Cells */}
                    {DISPLAY_DEFECT_TYPES.map((defect) => {
                      const count = matrix[part]?.[defect] || 0;
                      const cellBg = getCellBgClass(count);

                      return (
                        <td
                          key={defect}
                          className={`p-0 border-r border-brand-beige-100 text-center select-none relative group h-16 ${cellBg} transition-all`}
                        >
                          <div className="flex h-full w-full items-stretch">
                            {/* Tap-to-Decrement Side (Left) */}
                            <button
                              id={`grid-dec-${part}-${defect}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                decrementDefectMobile(part, defect);
                              }}
                              className={`w-7 sm:w-8 flex items-center justify-center border-r border-brand-beige-100 bg-black/5 hover:bg-black/10 active:bg-black/20 transition-all font-bold cursor-pointer ${
                                count > 0 
                                  ? 'text-red-700 opacity-100' 
                                  : 'text-gray-300 opacity-20 pointer-events-none'
                              }`}
                              title="Subtract 1 count"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            {/* Tap-to-Increment Area (Center/Right) */}
                            <button
                              id={`grid-tap-${part}-${defect}`}
                              type="button"
                              onClick={() => {
                                incrementDefectMobile(part, defect);
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingCell({ part, defect });
                                setEditValue(count.toString());
                              }}
                              className="flex-1 flex flex-col items-center justify-center hover:bg-white/10 active:bg-white/20 transition-all cursor-pointer group/inner relative"
                              title="Double-click to type count, single tap to add (+1)"
                            >
                              <span className="text-base font-black tracking-tight leading-none block">
                                {count}
                              </span>
                              <span className="text-[8px] text-gray-450 uppercase font-mono font-bold mt-1 tracking-wider opacity-0 md:group-hover/inner:opacity-100 transition-opacity">
                                +1 Tap
                              </span>
                            </button>

                            {/* Quick Manual Override Input Button */}
                            <button
                              id={`grid-edit-${part}-${defect}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCell({ part, defect });
                                setEditValue(count.toString());
                              }}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-all p-1 text-gray-400 hover:text-brand-forest-600 hover:scale-110 cursor-pointer"
                              title="Manually key in exact counts"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </td>
                      );
                    })}

                    {/* Live Row Total */}
                    <td className="bg-brand-beige-50/30 text-center font-mono text-sm font-bold text-brand-forest-600 p-2.5">
                      <span className={rowTotal > 0 ? 'bg-brand-forest-50 px-2.5 py-1 rounded-md border border-brand-forest-500/15' : 'text-gray-400'}>
                        {rowTotal}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* Sum Columns Header row */}
              <tr className="bg-brand-beige-100/40 font-bold border-t border-brand-beige-200">
                <td className="sticky left-0 bg-brand-beige-100 font-bold text-xs uppercase text-brand-beige-800 px-4 py-3.5 border-r border-brand-beige-200 shadow-xs z-10">
                  Column Total
                </td>
                {DISPLAY_DEFECT_TYPES.map((defect) => {
                  const total = getColTotal(defect);
                  return (
                    <td
                      key={`total-${defect}`}
                      className="text-center font-mono text-sm p-2 bg-brand-beige-50/20 border-r border-brand-beige-100"
                    >
                      <span className={total > 0 ? 'text-brand-forest-600 font-bold underline decoration-brand-forest-600/30 underline-offset-4' : 'text-gray-400'}>
                        {total}
                      </span>
                    </td>
                  );
                })}
                {/* Grand Total Indicator */}
                <td className="bg-brand-forest-50 text-center font-mono text-base font-black text-brand-forest-700 p-3.5 border-t border-brand-forest-500/20">
                  {getGrandTotal()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Input Modal overlays */}
      {editingCell && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-brand-beige-200 overflow-hidden loader-fade-in">
            <div className="bg-brand-beige-100 px-5 py-4 border-b border-brand-beige-200 flex justify-between items-center">
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
