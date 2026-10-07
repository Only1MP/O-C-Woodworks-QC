import React, { useState, useEffect, useCallback } from 'react';
import { STANDARD_PARTS, DEFECT_TYPES_LIST, DefectMatrix, QCDefectLog, createEmptyMatrix, createEmptyKitBins, ProductionLineState } from './types';
import Header from './components/Header';
import DefectMatrixTable from './components/DefectMatrixTable';
import DefectHistory from './components/DefectHistory';
import ShareReportModal from './components/ShareReportModal';
import { AuthModal } from './components/AuthModal';
import { LoginScreen } from './components/LoginScreen';
import { qcApi, AuthUser, PublicUser } from './services/api';
import { 
  Clipboard, 
  History, 
  Save, 
  FileText, 
  Share2, 
  Users,
  User,
  Shield,
  Server,
  Archive,
  RotateCcw,
  CheckCircle,
  X,
  Mail,
  LogOut
} from 'lucide-react';
import ProductionForce from './components/ProductionForce';

const LOCAL_STORAGE_KEY = 'shop_pulse_qc_defect_logs';

export default function App() {
  const [activeTab, setActiveTab] = useState<'tally' | 'history' | 'positions'>('tally');
  const [logs, setLogs] = useState<QCDefectLog[]>([]);
  const [isServerSynced, setIsServerSynced] = useState<boolean>(true);

  // Auth state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [publicUsers, setPublicUsers] = useState<PublicUser[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Production force state
  const [productionForce, setProductionForce] = useState<ProductionLineState>({
    employees: [],
    morning: { Sides: ['', ''], Crates: ['', ''], Bottoms: ['', ''], Lids: ['', ''] },
    afternoon: { Sides: ['', ''], Crates: ['', ''], Bottoms: ['', ''], Lids: ['', ''] }
  });

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

  // Track post-email archive prompt state
  const [emailTriggeredInModal, setEmailTriggeredInModal] = useState<boolean>(false);
  const [showArchivePrompt, setShowArchivePrompt] = useState<boolean>(false);

  // Status Notification Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const showNotification = useCallback((type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  }, []);

  // Refresh user directory list
  const refreshUsers = useCallback(async () => {
    try {
      const users = await qcApi.getPublicUsers();
      setPublicUsers(users);
    } catch (err) {
      console.warn('Failed to fetch public users list', err);
    }
  }, []);

  // Initial sync: fetch currentUser, publicUsers, logs, and staff roster
  useEffect(() => {
    async function initData() {
      try {
        // 1. Fetch current session
        const user = await qcApi.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          // If inspector input is empty, prefill with user name
          setShiftReportedBy((prev) => prev || user.displayName);
        }

        // 2. Fetch public user accounts
        await refreshUsers();

        // 3. Fetch server logs
        const serverLogs = await qcApi.getLogs();
        if (Array.isArray(serverLogs) && serverLogs.length > 0) {
          setLogs(serverLogs);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(serverLogs));
        } else {
          // If server is brand new, check if we have offline/localStorage logs to migrate
          const localSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (localSaved) {
            try {
              const parsed = JSON.parse(localSaved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setLogs(parsed);
                // Background sync to server
                qcApi.bulkImportLogs(parsed).catch(console.warn);
              }
            } catch (_) {}
          }
        }

        // 4. Fetch server staff positions
        const serverStaff = await qcApi.getStaff();
        if (serverStaff && Array.isArray(serverStaff.employees)) {
          setProductionForce(serverStaff);
          localStorage.setItem('shop_pulse_production_force', JSON.stringify(serverStaff));
        }

        setIsServerSynced(true);
      } catch (err) {
        console.warn('Could not connect to server database, operating in offline fallback mode:', err);
        setIsServerSynced(false);

        // Fallback to local storage
        try {
          const localLogs = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (localLogs) setLogs(JSON.parse(localLogs));
          const localStaff = localStorage.getItem('shop_pulse_production_force');
          if (localStaff) setProductionForce(JSON.parse(localStaff));
        } catch (_) {}
      } finally {
        setIsAuthChecking(false);
      }
    }

    initData();
  }, [refreshUsers]);

  // When currentUser changes, sync inspector field if appropriate
  const handleUserChanged = (user: AuthUser | null) => {
    setCurrentUser(user);
    if (user) {
      setShiftReportedBy(user.displayName);
      showNotification('success', `Signed in as ${user.displayName}`);
    } else {
      showNotification('info', 'Logged out.');
    }
  };

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

  // Save productionForce to server when altered
  const handleUpdateProductionForce = (updater: React.SetStateAction<ProductionLineState>) => {
    setProductionForce((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Persist locally
      try {
        localStorage.setItem('shop_pulse_production_force', JSON.stringify(next));
      } catch (_) {}
      // Sync to server database
      qcApi.saveStaff(next).catch((err) => {
        console.warn('Staff auto-save to server failed, stored locally:', err);
      });
      return next;
    });
  };

  const handleCellChange = (part: string, defect: string, delta: number) => {
    setMatrix(prev => {
      const current = prev[part]?.[defect] || 0;
      const nextValue = Math.max(0, current + delta);
      return {
        ...prev,
        [part]: {
          ...prev[part],
          [defect]: nextValue
        }
      };
    });
  };

  const handleSetCellValue = (part: string, defect: string, val: number) => {
    const cleanVal = Math.max(0, isNaN(val) ? 0 : val);
    setMatrix(prev => ({
      ...prev,
      [part]: {
        ...prev[part],
        [defect]: cleanVal
      }
    }));
  };

  const handleToggleKitBin = (part: string) => {
    setKitBins(prev => ({
      ...prev,
      [part]: !prev[part]
    }));
  };

  const handleResetCurrentAudit = () => {
    if (window.confirm('Are you sure you want to clear current tally counts and notes for this sheet?')) {
      setMatrix(createEmptyMatrix());
      setKitBins(createEmptyKitBins());
      setAdditionalNotes('');
      showNotification('info', 'Active tally sheet reset.');
    }
  };

  const calculateGrandTotal = () => {
    let sum = 0;
    for (const part of STANDARD_PARTS) {
      for (const defect of DEFECT_TYPES_LIST) {
        sum += matrix[part]?.[defect] || 0;
      }
    }
    return sum;
  };

  const grandTotal = calculateGrandTotal();

  const handleSaveAudit = async () => {
    if (!sku.trim()) {
      showNotification('error', 'Product SKU is required before finalizing log.');
      return;
    }

    const newLog: QCDefectLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date: date || new Date().toISOString().split('T')[0],
      sku: sku.trim().toUpperCase(),
      shiftReportedBy: shiftReportedBy.trim() || currentUser?.displayName || 'Inspector',
      matrix: JSON.parse(JSON.stringify(matrix)),
      kitBins: JSON.parse(JSON.stringify(kitBins)),
      additionalNotes: additionalNotes.trim(),
      createdAt: new Date().toISOString(),
      positions: {
        morning: JSON.parse(JSON.stringify(productionForce.morning)),
        afternoon: JSON.parse(JSON.stringify(productionForce.afternoon))
      }
    };

    // Optimistically update UI
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLogs));
    } catch (_) {}

    // Save to Raspberry Pi Server Database
    try {
      await qcApi.saveLog(newLog);
      setIsServerSynced(true);
      showNotification(
        'success',
        `Log for SKU ${newLog.sku} saved to Raspberry Pi Database! (${grandTotal} defects)`
      );
    } catch (err: any) {
      console.warn('Server database save error, preserved locally:', err);
      showNotification(
        'info',
        `Log saved locally (${grandTotal} defects). Will sync when server is reachable.`
      );
    }

    // Auto navigate to History page so they can review what was logged
    setActiveTab('history');

    // Reset contemporary entries for the next audit
    setMatrix(createEmptyMatrix());
    setKitBins(createEmptyKitBins());
    setAdditionalNotes('');
  };

  const handleDeleteLog = async (id: string) => {
    const updated = logs.filter(log => log.id !== id);
    setLogs(updated);

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}

    try {
      await qcApi.deleteLog(id);
      showNotification('info', 'Quality Control log removed from server database.');
    } catch (err: any) {
      showNotification('info', err.message || 'Log removed locally.');
    }
  };

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
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date: date || new Date().toISOString().split('T')[0],
      sku: sku.trim().toUpperCase(),
      shiftReportedBy: shiftReportedBy.trim() || currentUser?.displayName || 'Inspector',
      matrix: JSON.parse(JSON.stringify(matrix)),
      kitBins: JSON.parse(JSON.stringify(kitBins)),
      additionalNotes: additionalNotes.trim(),
      createdAt: new Date().toISOString(),
      positions: {
        morning: JSON.parse(JSON.stringify(productionForce.morning)),
        afternoon: JSON.parse(JSON.stringify(productionForce.afternoon))
      }
    };
    setEmailTriggeredInModal(false);
    setShareModalLog(activeLogObject);
  };

  const handleCloseShareModal = () => {
    const wasEmailTriggered = emailTriggeredInModal;
    setShareModalLog(null);
    setEmailTriggeredInModal(false);

    // If an email draft was initiated or copied, immediately prompt to Archive & Clear Grid!
    if (wasEmailTriggered) {
      setShowArchivePrompt(true);
    }
  };

  const handleConfirmArchiveAndClear = async () => {
    setShowArchivePrompt(false);
    await handleSaveAudit();
    showNotification('success', 'Session archived to database and grid cleared for next run!');
  };

  const handleDismissArchivePrompt = () => {
    setShowArchivePrompt(false);
    showNotification('info', 'Grid retained without archiving.');
  };

  const handleLogout = async () => {
    await qcApi.logout();
    setCurrentUser(null);
    showNotification('info', 'Signed out.');
  };

  // If initial auth check is in flight, show clean minimal loader
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-brand-beige-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/thumbnail.png"
            alt="Olive & Cocoa Logo"
            className="w-14 h-14 rounded-2xl border border-brand-beige-300 shadow-xs object-cover bg-white animate-pulse"
            referrerPolicy="no-referrer"
          />
          <div className="w-5 h-5 border-2 border-brand-forest-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show LoginScreen
  if (!currentUser) {
    return <LoginScreen onSuccess={handleUserChanged} />;
  }

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
              <img 
                src="/thumbnail.png" 
                alt="Olive & Cocoa Emblem" 
                className="w-9 h-9 rounded-lg border border-brand-beige-300/40 shadow-xs object-cover bg-brand-beige-50 shrink-0" 
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-brand-beige-300 font-semibold leading-none tracking-wider uppercase flex items-center gap-1.5">
                  Daily QC Log Ledger
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/20 text-[9px] text-emerald-300 font-mono" title="Connected to Server Database">
                    <Server className="w-2.5 h-2.5" /> Pi DB
                  </span>
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

              {/* User Account / Switch / Sign Out */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-3 py-2 sm:py-2.5 rounded-lg transition-all border bg-brand-forest-800 text-emerald-300 border-emerald-500/30 hover:bg-brand-forest-900 cursor-pointer"
                  title="Switch User or Manage Accounts"
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="max-w-[110px] truncate">{currentUser.displayName}</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="p-2 sm:py-2.5 sm:px-2.5 rounded-lg text-brand-beige-200 hover:text-white hover:bg-brand-forest-600 transition-colors border border-transparent hover:border-white/10 cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
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
              updateCell={(part, defect, value) => handleSetCellValue(part, defect, value)}
              updateKitBin={(part, checked) => setKitBins(prev => ({ ...prev, [part]: checked }))}
              resetMatrix={handleResetCurrentAudit}
            />

            {/* Bottom Actions, Qualitative Notes and Confirmation submission */}
            <div className="bg-white border border-brand-beige-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row gap-6 items-stretch justify-between">
              
              <div className="flex-1 flex flex-col gap-2">
                <label htmlFor="notes" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand-forest-600" />
                  Inspector Shift Observations &amp; Scrap Rationale
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Note specific pallet tags, saw misalignments, lumber grain anomalies, or corrective actions taken on the floor..."
                  className="w-full bg-brand-beige-50 border border-brand-beige-200 rounded-lg p-3 text-sm text-gray-800 placeholder:text-gray-400 outline-hidden focus:border-brand-forest-500 focus:ring-1 focus:ring-brand-forest-500/20 font-sans resize-none"
                />
              </div>

              <div className="flex flex-col justify-end gap-3 min-w-[240px]">
                <div className="bg-brand-beige-50 border border-brand-beige-200 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sheet Total</span>
                  <span className={`text-xl font-bold font-mono ${grandTotal > 0 ? 'text-brand-forest-600' : 'text-gray-400'}`}>
                    {grandTotal} <span className="text-xs font-normal text-gray-500">defects</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetCurrentAudit}
                    className="py-2.5 px-3 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-semibold transition-colors"
                  >
                    Clear Sheet
                  </button>

                  <button
                    id="export-email-draft-btn"
                    onClick={handleShareActiveDraft}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-brand-forest-600 hover:bg-brand-forest-700 text-white font-semibold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-amber-300" />
                    <span>Export &amp; Email Draft</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'positions' && (
          <ProductionForce
            productionForce={productionForce}
            setProductionForce={handleUpdateProductionForce}
          />
        )}

        {activeTab === 'history' && (
          <DefectHistory
            logs={logs}
            deleteLog={handleDeleteLog}
            loadLogToActive={handleLoadLogToActive}
            shareLog={(log) => setShareModalLog(log)}
          />
        )}

      </main>

      {/* Share / Export Modal Dialog */}
      {shareModalLog && (
        <ShareReportModal
          isOpen={Boolean(shareModalLog)}
          onClose={handleCloseShareModal}
          log={shareModalLog}
          showNotification={showNotification}
          onEmailTriggered={() => setEmailTriggeredInModal(true)}
        />
      )}

      {/* Archive & Clear Grid Post-Export Confirmation Modal */}
      {showArchivePrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-brand-beige-200 overflow-hidden w-full max-w-md flex flex-col loader-fade-in">
            {/* Modal Header */}
            <div className="bg-brand-forest-750 text-white p-5 flex items-center justify-between border-b border-brand-forest-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight">Email Sent / Drafted</h3>
                  <p className="text-[11px] text-brand-beige-300">Complete Session Workflow</p>
                </div>
              </div>
              <button
                onClick={handleDismissArchivePrompt}
                className="text-brand-beige-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-4">
              <div className="bg-brand-beige-50 border border-brand-beige-200 rounded-xl p-4 flex items-center gap-3">
                <Archive className="w-5 h-5 text-brand-forest-600 shrink-0" />
                <div className="text-sm font-semibold text-gray-800">
                  Archive Entry &amp; Clear Grid?
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-brand-beige-100/70 p-4 border-t border-brand-beige-200 flex items-center justify-end gap-2.5">
              <button
                onClick={handleDismissArchivePrompt}
                className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-colors"
              >
                Keep Grid Active
              </button>
              <button
                onClick={handleConfirmArchiveAndClear}
                className="px-4 py-2 rounded-xl bg-brand-forest-600 hover:bg-brand-forest-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5 text-amber-300" />
                <span>Archive &amp; Clear Grid</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Accounts & PIN Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        publicUsers={publicUsers}
        onUserChanged={handleUserChanged}
        onUsersRefreshed={refreshUsers}
      />

    </div>
  );
}
