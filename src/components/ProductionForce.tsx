import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Plus, 
  Minus, 
  SlidersHorizontal,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { ProductionLineState, ShiftAssignments } from '../types';

interface ProductionForceProps {
  productionForce: ProductionLineState;
  setProductionForce: React.Dispatch<React.SetStateAction<ProductionLineState>>;
}

export default function ProductionForce({ 
  productionForce: state, 
  setProductionForce: setState 
}: ProductionForceProps) {
  const [activeShift, setActiveShift] = useState<'morning' | 'afternoon'>('morning');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Handle adding a new employee
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newEmployeeName.trim();
    if (!name) {
      setErrorMsg('Employee name cannot be empty');
      return;
    }
    if (state.employees.some(emp => emp.toLowerCase() === name.toLowerCase())) {
      setErrorMsg('An employee with this name already exists');
      return;
    }
    
    setState(prev => ({
      ...prev,
      employees: [...prev.employees, name].sort((a, b) => a.localeCompare(b))
    }));
    setNewEmployeeName('');
    setErrorMsg('');
  };

  // Handle removing an employee (clears from master list AND all spaces in both shifts!)
  const handleRemoveEmployee = (nameToRemove: string) => {
    setState(prev => {
      const updatedMorning = { ...prev.morning };
      const updatedAfternoon = { ...prev.afternoon };
      const categories: Array<keyof ShiftAssignments> = ['Sides', 'Crates', 'Bottoms', 'Lids'];
      
      categories.forEach(category => {
        if (updatedMorning[category]) {
          updatedMorning[category] = updatedMorning[category].map(emp => 
            emp === nameToRemove ? '' : emp
          );
        }
        if (updatedAfternoon[category]) {
          updatedAfternoon[category] = updatedAfternoon[category].map(emp => 
            emp === nameToRemove ? '' : emp
          );
        }
      });

      return {
        employees: prev.employees.filter(emp => emp !== nameToRemove),
        morning: updatedMorning,
        afternoon: updatedAfternoon
      };
    });
  };

  // Add a space to a category for a specific shift
  const handleAddSpace = (shift: 'morning' | 'afternoon', category: keyof ShiftAssignments) => {
    setState(prev => ({
      ...prev,
      [shift]: {
        ...prev[shift],
        [category]: [...prev[shift][category], '']
      }
    }));
  };

  // Subtract a space from a category for a specific shift
  const handleSubtractSpace = (shift: 'morning' | 'afternoon', category: keyof ShiftAssignments) => {
    setState(prev => {
      const currentSpaces = prev[shift][category];
      if (currentSpaces.length <= 1) return prev; // Keep at least 1 slot
      
      return {
        ...prev,
        [shift]: {
          ...prev[shift],
          [category]: currentSpaces.slice(0, currentSpaces.length - 1)
        }
      };
    });
  };

  // Change employee assigned to a specific space
  const handleUpdateAssignment = (
    shift: 'morning' | 'afternoon',
    category: keyof ShiftAssignments,
    spaceIndex: number,
    employeeName: string
  ) => {
    setState(prev => {
      const updatedList = [...prev[shift][category]];
      updatedList[spaceIndex] = employeeName;
      return {
        ...prev,
        [shift]: {
          ...prev[shift],
          [category]: updatedList
        }
      };
    });
  };

  const categoriesOrder: Array<keyof ShiftAssignments> = [
    'Sides',
    'Crates',
    'Bottoms',
    'Lids'
  ];

  // Calculations for shift statistics
  const getShiftStats = (shift: 'morning' | 'afternoon') => {
    let totalSlots = 0;
    let filledSlots = 0;
    categoriesOrder.forEach(cat => {
      const slots = state[shift][cat] || [];
      totalSlots += slots.length;
      filledSlots += slots.filter(Boolean).length;
    });
    return { totalSlots, filledSlots };
  };

  const morningStats = getShiftStats('morning');
  const afternoonStats = getShiftStats('afternoon');

  return (
    <div className="flex flex-col gap-6 animate-fade-in" id="production-positions-panel">
      {/* Header */}
      <div className="bg-white border border-brand-beige-200 rounded-xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-forest-500 via-brand-beige-300 to-brand-forest-750"></div>
        
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-sans">
          Production Line Position Tracker
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: STAFF DIRECTORY & REGISTRATION */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white border border-brand-beige-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
            
            <div className="flex items-center gap-2 pb-3 border-b border-brand-beige-100">
              <Users className="w-4.5 h-4.5 text-brand-forest-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                Active Staff Directory
              </h2>
            </div>

            {/* Form to Add Employee */}
            <form onSubmit={handleAddEmployee} className="flex flex-col gap-2">
              <label htmlFor="worker-name-input" className="text-[11px] font-bold text-gray-650 uppercase tracking-tight">
                Register New Operator:
              </label>
              
              <div className="flex gap-2">
                <input
                  id="worker-name-input"
                  type="text"
                  placeholder="e.g. Liam Porter"
                  value={newEmployeeName}
                  onChange={(e) => {
                    setNewEmployeeName(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="flex-1 bg-brand-beige-50 focus:bg-white text-gray-800 text-xs font-medium border border-brand-beige-200 rounded-lg px-3 py-2 outline-hidden focus:border-brand-forest-500 focus:ring-1 focus:ring-brand-forest-500/20 transition-all placeholder:text-gray-400"
                />
                
                <button
                  id="add-worker-btn"
                  type="submit"
                  className="px-3 py-2 bg-brand-forest-500 hover:bg-brand-forest-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer focus:ring-2 focus:ring-brand-forest-500/30"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>

              {errorMsg && (
                <span className="text-[10px] text-red-650 font-semibold px-0.5 animate-pulse">
                  {errorMsg}
                </span>
              )}
            </form>

            {/* List of Registered Employees */}
            <div className="flex flex-col gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                Registered Operators ({state.employees.length})
              </span>

              {state.employees.length === 0 ? (
                <div className="border border-dashed border-brand-beige-200 rounded-lg p-5 text-center bg-brand-beige-50/55">
                  <p className="text-xs text-gray-400 italic">No operators saved yet.</p>
                  <p className="text-[10px] text-gray-400 mt-1">Add employee names above to select them in the shift slots.</p>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto border border-brand-beige-100 rounded-lg divide-y divide-brand-beige-100/60 bg-brand-beige-50/10">
                  {state.employees.map((emp) => (
                    <div 
                      key={emp} 
                      className="p-2 sm:p-2.5 flex items-center justify-between gap-2 hover:bg-brand-beige-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-2 h-2 rounded-full bg-brand-forest-500"></div>
                        <span className="text-xs font-semibold text-gray-750 truncate">{emp}</span>
                      </div>
                      
                      <button
                        id={`remove-worker-${emp.replace(/\s+/g, '-')}`}
                        type="button"
                        onClick={() => handleRemoveEmployee(emp)}
                        className="p-1 text-gray-400 hover:text-red-650 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                        title={`De-register ${emp} and erase all active slot assignments`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: WORKSTATION CATEGORIES & SHIFT ASSIGNMENTS */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          
          {/* Shift Navigation Switcher Banner */}
          <div className="bg-white border border-brand-beige-200 p-2.5 rounded-xl shadow-3xs flex flex-col lg:flex-row justify-between items-center gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1 shrink-0">
                Select Shift Schedule:
              </span>
              
              <div className="flex gap-1.5 w-full sm:w-auto">
                <button
                  id="btn-shift-morning"
                  type="button"
                  onClick={() => setActiveShift('morning')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    activeShift === 'morning'
                      ? 'bg-brand-forest-500 text-white border-brand-forest-600 shadow-sm'
                      : 'bg-white text-gray-600 border-brand-beige-200 hover:bg-brand-beige-50'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Morning Shift ({morningStats.filledSlots} / {morningStats.totalSlots})</span>
                </button>
                
                <button
                  id="btn-shift-afternoon"
                  type="button"
                  onClick={() => setActiveShift('afternoon')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    activeShift === 'afternoon'
                      ? 'bg-brand-forest-750 text-white border-brand-forest-800 shadow-sm'
                      : 'bg-white text-gray-600 border-brand-beige-200 hover:bg-brand-beige-50'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-blue-400 font-bold" />
                  <span>Afternoon Shift ({afternoonStats.filledSlots} / {afternoonStats.totalSlots})</span>
                </button>
              </div>
            </div>

            {/* Custom Confirm-Safe Reset Button */}
            <div className="w-full lg:w-auto flex justify-end shrink-0">
              {showResetConfirm ? (
                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 p-1.5 rounded-lg text-xs animate-fade-in">
                  <span className="text-[10px] text-red-700 font-extrabold px-1 select-none">Unassign all spaces?</span>
                  <button
                    id="confirm-reset-btn"
                    onClick={() => {
                      setState(prev => ({
                        ...prev,
                        morning: {
                          Sides: ['', ''],
                          Crates: ['', ''],
                          Bottoms: ['', ''],
                          Lids: ['', '']
                        },
                        afternoon: {
                          Sides: ['', ''],
                          Crates: ['', ''],
                          Bottoms: ['', ''],
                          Lids: ['', '']
                        }
                      }));
                      setShowResetConfirm(false);
                    }}
                    className="px-2 py-1 bg-red-650 hover:bg-red-700 text-white rounded-md font-bold cursor-pointer transition-colors text-[10px]"
                  >
                    Reset
                  </button>
                  <button
                    id="cancel-reset-btn"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md font-bold cursor-pointer transition-colors text-[10px]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  id="reset-positions-btn"
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full sm:w-auto px-3 py-2 bg-white hover:bg-red-50 text-red-650 hover:text-red-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-brand-beige-200 hover:border-red-200 cursor-pointer shadow-3xs"
                  title="Reset positions for both shifts to empty defaults (keeps staff roster)"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-red-500 animate-spin-reverse-once" />
                  <span>Reset positions</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Shift Config Panel Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoriesOrder.map((category) => {
              const spaces = state[activeShift][category] || ['', ''];
              
              return (
                <div 
                  key={category} 
                  id={`station-card-${activeShift}-${category}`}
                  className={`bg-white border rounded-xl p-5 shadow-3xs flex flex-col justify-between transition-all ${
                    activeShift === 'morning' 
                      ? 'border-brand-beige-200 hover:border-brand-forest-300/60' 
                      : 'border-brand-beige-200 hover:border-brand-forest-600/50'
                  }`}
                >
                  <div>
                    {/* Workstation Badge and Adjustment Inputs */}
                    <div className="flex items-center justify-between border-b border-brand-beige-100 pb-3 mb-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] uppercase font-mono tracking-widest text-gray-450 font-bold">
                          {activeShift} workspace
                        </span>
                        <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wide font-sans">
                          {category} Station
                        </h3>
                      </div>

                      {/* Add/Subtract Spaces control pad */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">
                          Slots:
                        </span>
                        
                        <div className="flex items-center bg-brand-beige-100 rounded-md border border-brand-beige-200 overflow-hidden p-0.5 shadow-3xs">
                          {/* Decrease spaces with safety minimum 1 */}
                          <button
                            id={`sub-space-${activeShift}-${category}`}
                            type="button"
                            onClick={() => handleSubtractSpace(activeShift, category)}
                            disabled={spaces.length <= 1}
                            className={`p-1 rounded-sm flex items-center justify-center transition-colors ${
                              spaces.length <= 1
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-600 hover:bg-brand-beige-200 hover:text-gray-900 cursor-pointer'
                            }`}
                            title="Remove assignment space"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          
                          {/* Space counter label */}
                          <span className="text-xs font-mono font-bold px-2 text-brand-forest-700 select-none">
                            {spaces.length}
                          </span>
                          
                          {/* Increase spaces */}
                          <button
                            id={`add-space-${activeShift}-${category}`}
                            type="button"
                            onClick={() => handleAddSpace(activeShift, category)}
                            className="p-1 hover:bg-brand-beige-200 rounded-sm text-gray-600 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer"
                            title="Add assignment space"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Workstation layout slots list */}
                    <div className="flex flex-col gap-2.5">
                      {spaces.map((assignedEmp, index) => {
                        return (
                          <div 
                            key={index} 
                            className="flex items-center justify-between gap-3 bg-brand-beige-50/50 hover:bg-brand-beige-50/90 border border-brand-beige-150 p-2 sm:p-2.5 rounded-lg transition-all"
                          >
                            <div className="flex flex-col leading-tight">
                              <span className="text-[9px] uppercase font-mono tracking-widest text-gray-400 font-bold">
                                SLOT #{index + 1}
                              </span>
                              <span className="text-[11px] font-bold text-gray-650">
                                {category === 'Sides' && 'Sides Builder'}
                                {category === 'Crates' && 'Crates Builder'}
                                {category === 'Bottoms' && 'Base Assembler'}
                                {category === 'Lids' && 'Lids Builder'}
                              </span>
                            </div>

                            <div className="flex-1 max-w-[160px] sm:max-w-[190px]">
                              {/* Selection operator drop down */}
                              <select
                                id={`assign-select-${activeShift}-${category}-${index}`}
                                value={assignedEmp}
                                onChange={(e) => handleUpdateAssignment(activeShift, category, index, e.target.value)}
                                className={`w-full text-xs font-medium border rounded-lg px-2 py-1.5 focus:border-brand-forest-500 focus:ring-1 focus:ring-brand-forest-500/20 active:bg-brand-beige-50 transition-all outline-hidden cursor-pointer ${
                                  assignedEmp 
                                    ? 'border-brand-forest-500 text-brand-forest-750 font-bold bg-brand-forest-50/15'
                                    : 'border-brand-beige-200 text-gray-450 bg-white'
                                }`}
                              >
                                <option value="">— Unassigned —</option>
                                {state.employees.map((emp) => (
                                  <option key={emp} value={emp} className="text-gray-800 font-medium">
                                    {emp}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Station Footer tally summary details */}
                  <div className="mt-4 pt-3 border-t border-brand-beige-100/50 flex items-center justify-between text-[10px]">
                    <span className="text-gray-450 font-semibold font-mono uppercase">
                      STATION COVERAGE
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-bold ${
                      spaces.filter(Boolean).length === spaces.length
                        ? 'bg-green-50 text-green-700 border border-green-100'
                        : spaces.filter(Boolean).length > 0
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                      {spaces.filter(Boolean).length} of {spaces.length} staffed
                    </span>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Quick Informational Tip Box */}
          <div className="bg-amber-50/20 border border-amber-300/20 rounded-xl p-4 flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-brand-forest-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-gray-700">Roster Live Synchronization</h4>
              <p className="text-[11px] text-gray-500 leading-normal mt-0.5">
                Saving an inspection sheet archives this specific Morning &amp; Afternoon shift deployment model list together with product defect totals in the historical logbooks.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
