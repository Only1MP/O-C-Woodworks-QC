import React, { useState, useEffect } from 'react';
import { STANDARD_PARTS, DEFECT_TYPES_LIST, DefectMatrix, QCDefectLog, createEmptyMatrix, createEmptyKitBins, Part, DefectType, ProductionLineState } from './types';
import Header from './components/Header';
import DefectMatrixTable from './components/DefectMatrixTable';
import DefectHistory from './components/DefectHistory';
import ShareReportModal from './components/ShareReportModal';
import { 
  Clipboard, 
  History, 
  Save, 
  FileText, 
  CheckCircle, 
  Sparkles, 
  RefreshCw, 
  ChevronRight, 
  Share2, 
  Play,
  Mail,
  Users
} from 'lucide-react';
import ProductionForce from './components/ProductionForce';

const LOCAL_STORAGE_KEY = 'shop_pulse_qc_defect_logs';

function getInitialLogs(): QCDefectLog[] {
  // Try loading from localStorage
  try {
    const serialized = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (serialized) {
      const parsed = JSON.parse(serialized);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load local storage logs', err);
  }

  return [];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'tally' | 'history' | 'positions'>('tally');
  const [logs, setLogs] = useState<QCDefectLog[]>(getInitialLogs);

  const [productionForce, setProductionForce] = useState<ProductionLineState>(() => {
    try {
      const stored = localStorage.getItem('shop_pulse_production_force');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.employees)) {
          const morning = parsed.morning || parsed.assignments || {
            Sides: ['', ''],
            Crates: ['', ''],
            Bottoms: ['', ''],
            Lids: ['', '']
          };
          const afternoon = parsed.afternoon || {
            Sides: ['', ''],
            Crates: ['', ''],
            Bottoms: ['', ''],
            Lids: ['', '']
          };
          return {
            employees: parsed.employees,
            morning,
            afternoon
          };
        }
      }
    } catch (err) {
      console.warn('Failed to load local storage production force', err);
    }
    return {
      employees: [],
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
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('shop_pulse_production_force', JSON.stringify(productionForce));
    } catch (err) {
      console.warn('Failed to save production force', err);
    }
  }, [productionForce]);

  // Active form state variables (mirrors a single daily sheet checklist)
  const [date, setDate] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('shop_pulse_active_date');
      if (stored) return stored;
    } catch (_) {}
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [sku, setSku] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('shop_pulse_active_sku');
      if (stored) return stored;
    } catch (_) {}
    return '';
  });
  const [shiftReportedBy, setShiftReportedBy] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('shop_pulse_active_reported_by');
      if (stored) return stored;
    } catch (_) {}
    return '';
  });
  const [matrix, setMatrix] = useState<DefectMatrix>(() => {
    try {
      const stored = localStorage.getItem('shop_pulse_active_matrix');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (_) {}
    return createEmptyMatrix();
  });
  const [kitBins, setKitBins] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('shop_pulse_active_kit_bins');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (_) {}
    return createEmptyKitBins();
  });
  const [additionalNotes, setAdditionalNotes] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('shop_pulse_active_additional_notes');
      if (stored) return stored;
    } catch (_) {}
    return '';
  });

  // Track currently shared sheet report (or null)
  const [shareModalLog, setShareModalLog] = useState<QCDefectLog | null>(null);
  
  // Save active sheet draft progress in real time to local storage
  useEffect(() => {
    try {
      localStorage.setItem('shop_pulse_active_date', date);
      localStorage.setItem('shop_pulse_active_sku', sku);
      localStorage.setItem('shop_pulse_active_reported_by', shiftReportedBy);
      localStorage.setItem('shop_pulse_active_matrix', JSON.stringify(matrix));
      localStorage.setItem('shop_pulse_active_kit_bins', JSON.stringify(kitBins));
      localStorage.setItem('shop_pulse_active_additional_notes', additionalNotes);
    } catch (err) {
      console.warn('Failed to save active sheet draft', err);
    }
  }, [date, sku, shiftReportedBy, matrix, kitBins, additionalNotes]);
  
  // Inline feedback state
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Auto clear notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
  };

  const handleUpdateCell = (part: Part, defect: DefectType, value: number) => {
    setMatrix((prev) => {
      const copy = { ...prev };
      if (!copy[part]) copy[part] = {};
      copy[part][defect] = value;
      return copy;
    });
  };

  const handleUpdateKitBin = (part: Part, checked: boolean) => {
    setKitBins((prev) => ({
      ...prev,
      [part]: checked
    }));
  };

  const handleResetMatrix = () => {
    setMatrix(createEmptyMatrix());
    setKitBins(createEmptyKitBins());
    showNotification('info', 'Tally board reset to zero counts.');
  };

  const handleClearAllLogs = () => {
    setLogs([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear local storage logs', err);
    }
    showNotification('success', 'All past logs have been successfully cleared.');
  };

  const handleSaveLog = () => {
    if (!sku.trim()) {
      showNotification('error', 'Product SKU is required before saving daily sheets.');
      return;
    }

    // Check if there are actual defects logged. If 0, double check with visual alert
    let grandTotal = 0;
    for (const part of STANDARD_PARTS) {
      for (const defect of DEFECT_TYPES_LIST) {
        grandTotal += matrix[part]?.[defect] || 0;
      }
    }

    const newLog: QCDefectLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date,
      sku: sku.trim().toUpperCase(),
      shiftReportedBy: shiftReportedBy.trim() || 'Unassigned Operator',
      matrix: JSON.parse(JSON.stringify(matrix)),
      kitBins: JSON.parse(JSON.stringify(kitBins)),
      additionalNotes: additionalNotes.trim(),
      createdAt: new Date().toISOString(),
      positions: {
        morning: JSON.parse(JSON.stringify(productionForce.morning)),
        afternoon: JSON.parse(JSON.stringify(productionForce.afternoon))
      }
    };

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLogs));
    } catch (err) {
      console.warn('LocalStorage save failed', err);
    }

    showNotification(
      'success',
      `Log with SKU ${newLog.sku} successfully saved. Saved ${grandTotal} tallied points!`
    );

    // Auto navigate to History page so they can review what was logged!
    setActiveTab('history');

    // Reset contemporary entries for the next audit
    setMatrix(createEmptyMatrix());
    setKitBins(createEmptyKitBins());
    setAdditionalNotes('');
  };

  const handleDeleteLog = (id: string) => {
    const updated = logs.filter(log => log.id !== id);
    setLogs(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    showNotification('info', 'Quality Control log removed.');
  };

  // Restore past log into editor so users can review or append entries
  const handleLoadLogToActive = (log: QCDefectLog) => {
    setDate(log.date);
    setSku(log.sku);
    setShiftReportedBy(log.shiftReportedBy);
    setMatrix(JSON.parse(JSON.stringify(log.matrix)));
    setKitBins(log.kitBins ? JSON.parse(JSON.stringify(log.kitBins)) : createEmptyKitBins());
    setAdditionalNotes(log.additionalNotes);
    setActiveTab('tally');
    showNotification('success', `Restored Audit ${log.sku} from ${log.date} into active board.`);
  };

  const handleShareActiveDraft = () => {
    if (!sku.trim()) {
      showNotification('error', 'Please define a Product SKU before exporting.');
      return;
    }
    const activeLogObject: QCDefectLog = {
      id: 'active-draft',
      date,
      sku: sku.trim().toUpperCase(),
      shiftReportedBy: shiftReportedBy.trim() || 'Operator',
      matrix: JSON.parse(JSON.stringify(matrix)),
      kitBins: JSON.parse(JSON.stringify(kitBins)),
      additionalNotes: additionalNotes.trim(),
      createdAt: new Date().toISOString(),
      positions: {
        morning: JSON.parse(JSON.stringify(productionForce.morning)),
        afternoon: JSON.parse(JSON.stringify(productionForce.afternoon))
      }
    };
    setShareModalLog(activeLogObject);
  };

  return (
    <div className="min-h-screen bg-brand-beige-50 pb-12 font-sans selection:bg-brand-forest-500/20 antialiased text-brand-charcoal-800">
      
      {/* Dynamic Toast / Status Notification banner */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 border rounded-xl shadow-lg font-medium text-xs loader-fade-in bg-white max-w-sm">
          <div className={`w-2 h-2 rounded-full ${
            notification.type === 'success' ? 'bg-green-500 animate-ping' :
            notification.type === 'error' ? 'bg-red-500 animate-bounce' : 'bg-blue-500 animate-pulse'
          }`}></div>
          <span className="text-gray-800 font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Primary Brand Navigation Rail */}
      <nav className="bg-brand-forest-700 text-white shadow-md relative z-10 py-2 sm:py-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:h-16">
            
            {/* Left side brand banner logo */}
            <div className="flex items-center gap-2.5 mt-1 sm:mt-0">
              <div className="p-1.5 bg-brand-forest-500 text-white rounded-md shadow-xs">
                <Clipboard className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-brand-beige-300 font-semibold leading-none tracking-wider uppercase">
                  Daily QC Log Ledger
                </span>
                <span className="text-xs sm:text-sm font-bold tracking-tight text-white leading-tight">
                  ShopPulse • Olive &amp; Cocoa
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 sm:gap-1.5 w-full sm:w-auto justify-center">
              <button
                id="tab-tally"
                onClick={() => setActiveTab('tally')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-semibold px-3 py-2 sm:py-2.5 rounded-lg transition-all ${
                  activeTab === 'tally'
                    ? 'bg-brand-forest-500 text-white shadow-xs'
                    : 'text-brand-beige-100 hover:bg-brand-forest-600/50 hover:text-white'
                }`}
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Entry Sheet</span>
              </button>

              <button
                id="tab-positions"
                onClick={() => setActiveTab('positions')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-semibold px-3 py-2 sm:py-2.5 rounded-lg transition-all ${
                  activeTab === 'positions'
                    ? 'bg-brand-forest-500 text-white shadow-xs'
                    : 'text-brand-beige-100 hover:bg-brand-forest-600/50 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Positions</span>
              </button>

              <button
                id="tab-history"
                onClick={() => setActiveTab('history')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-semibold px-3 py-2 sm:py-2.5 rounded-lg transition-all ${
                  activeTab === 'history'
                    ? 'bg-brand-forest-500 text-white shadow-xs'
                    : 'text-brand-beige-100 hover:bg-brand-forest-600/50 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Audits ({logs.length})</span>
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* Main Content Workspace viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {activeTab === 'tally' && (
          <div className="flex flex-col gap-6">
            {/* Clipboard Header parameters entry */}
            <Header
              date={date}
              setDate={setDate}
              sku={sku}
              setSku={setSku}
              shiftReportedBy={shiftReportedBy}
              setShiftReportedBy={setShiftReportedBy}
            />

            {/* Interactive Grid Table and tallies */}
            <DefectMatrixTable
              matrix={matrix}
              kitBins={kitBins}
              updateCell={handleUpdateCell}
              updateKitBin={handleUpdateKitBin}
              resetMatrix={handleResetMatrix}
            />

            {/* Clipboard footer - Additional Notes and Submit control card */}
            <div className="bg-white border border-brand-beige-200 rounded-xl p-6 shadow-xs">
              <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                
                {/* Notes area */}
                <div className="w-full md:max-w-xl flex flex-col gap-2">
                  <label htmlFor="additional-notes" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-brand-forest-600" />
                    <span>Additional Inspection Notes (Optional)</span>
                  </label>
                  <textarea
                    id="additional-notes"
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Describe machinery issues, wood fiber imperfections, blade wear, humidity conditions, supplier issues, or actions taken..."
                    rows={4}
                    className="w-full bg-brand-beige-50 border border-brand-beige-200 rounded-lg p-3 text-xs outline-hidden focus:ring-1 focus:ring-brand-forest-500/20 focus:border-brand-forest-500 placeholder:text-gray-400"
                  />
                  <p className="text-[10px] text-gray-400 italic">
                    Logged notes are archived securely and support search/analytics breakdowns later.
                  </p>
                </div>

                {/* Submit log trigger card */}
                <div className="w-full md:w-85 bg-brand-beige-50 rounded-xl p-4 border border-brand-beige-200 flex flex-col justify-between h-full min-h-[170px] gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider font-mono mb-1">
                      Finalize Daily Session
                    </h4>
                    <p className="text-[11px] text-gray-500 font-sans mb-1 leading-relaxed">
                      Archive shift matrix to history logbook, or export/email spreadsheet summaries on-the-fly.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      id="save-log-btn"
                      onClick={handleSaveLog}
                      className="w-full py-2.5 bg-brand-forest-600 hover:bg-brand-forest-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer group"
                    >
                      <Save className="w-4 h-4 text-brand-beige-300 group-hover:scale-110 transition-transform font-bold" />
                      <span>Archive Entry &amp; Clear Grid</span>
                    </button>

                    <button
                      id="share-active-btn"
                      onClick={handleShareActiveDraft}
                      className="w-full py-2 bg-brand-beige-100 hover:bg-brand-beige-200 text-brand-beige-900 border border-brand-beige-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-3xs"
                    >
                      <Share2 className="w-4 h-4 text-brand-forest-600 animate-pulse font-bold" />
                      <span>Export &amp; Email Draft</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Historics audits ledger screen */}
        {activeTab === 'history' && (
          <DefectHistory
            logs={logs}
            deleteLog={handleDeleteLog}
            loadLogToActive={handleLoadLogToActive}
            shareLog={(log) => setShareModalLog(log)}
            clearAllLogs={handleClearAllLogs}
          />
        )}

        {/* Labor positioning board / operator setup view */}
        {activeTab === 'positions' && (
          <ProductionForce 
            productionForce={productionForce}
            setProductionForce={setProductionForce}
          />
        )}

      </main>

      {/* Reusable Share/Email Inspection Report Modal */}
      {shareModalLog && (
        <ShareReportModal
          isOpen={true}
          onClose={() => setShareModalLog(null)}
          log={shareModalLog}
          showNotification={showNotification}
        />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-brand-forest-900/95 backdrop-blur-md border-t border-brand-forest-700/80 px-2 py-1.5 shadow-lg flex items-center justify-around">
        <button
          onClick={() => setActiveTab('tally')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-bold transition-all ${
            activeTab === 'tally'
              ? 'text-amber-300 bg-brand-forest-800'
              : 'text-brand-beige-200 hover:text-white'
          }`}
        >
          <Clipboard className="w-4 h-4" />
          <span>Tally Sheet</span>
        </button>

        <button
          onClick={() => setActiveTab('positions')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-bold transition-all ${
            activeTab === 'positions'
              ? 'text-amber-300 bg-brand-forest-800'
              : 'text-brand-beige-200 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Positions</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-bold transition-all ${
            activeTab === 'history'
              ? 'text-amber-300 bg-brand-forest-800'
              : 'text-brand-beige-200 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audits ({logs.length})</span>
        </button>
      </div>

      {/* Minimal Footer */}
      <footer className="text-center mt-12 mb-16 md:mb-4 text-xs text-gray-400 px-4">
        <p>&copy; {new Date().getFullYear()} Daily QC Defect Log</p>
      </footer>

    </div>
  );
}
