import React, { useState } from 'react';
import { QCDefectLog, STANDARD_PARTS, DEFECT_TYPES_LIST } from '../types';
import { Search, Trash2, Download, Calendar, Eye, FileSpreadsheet, Layers, Clock, AlertTriangle, Mail, Share2 } from 'lucide-react';

interface DefectHistoryProps {
  logs: QCDefectLog[];
  deleteLog: (id: string) => void;
  loadLogToActive: (log: QCDefectLog) => void;
  shareLog: (log: QCDefectLog) => void;
  clearAllLogs?: () => void;
}

export default function DefectHistory({
  logs,
  deleteLog,
  loadLogToActive,
  shareLog,
  clearAllLogs
}: DefectHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<QCDefectLog | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Filter logs based on search query
  const filteredLogs = logs.filter((log) => {
    const q = searchTerm.toLowerCase();
    return (
      log.sku.toLowerCase().includes(q) ||
      log.shiftReportedBy.toLowerCase().includes(q) ||
      log.date.includes(q)
    );
  });

  const getLogTotalDefects = (log: QCDefectLog): number => {
    let sum = 0;
    for (const part of STANDARD_PARTS) {
      for (const defect of DEFECT_TYPES_LIST) {
        sum += log.matrix[part]?.[defect] || 0;
      }
    }
    return sum;
  };

  // Export current log as standard spreadsheet-compliant CSV
  const handleExportCSV = (log: QCDefectLog) => {
    let csvRows = [];
    csvRows.push(`Daily QC Defect Log - ${log.sku}`);
    csvRows.push(`Date,${log.date}`);
    csvRows.push(`Reported By,${log.shiftReportedBy}`);
    csvRows.push(`Notes,"${log.additionalNotes.replace(/"/g, '""')}"`);
    csvRows.push('');

    // Row Header for Matrix
    csvRows.push(`PART TYPE,Kit Bin,${DEFECT_TYPES_LIST.join(',')},Total`);

    // Matrix Rows
    STANDARD_PARTS.forEach((part) => {
      let rTotal = 0;
      const isKitBin = log.kitBins?.[part] ? 'Yes' : 'No';
      const values = DEFECT_TYPES_LIST.map((defect) => {
        const val = log.matrix[part]?.[defect] || 0;
        rTotal += val;
        return val;
      });
      csvRows.push(`${part},${isKitBin},${values.join(',')},${rTotal}`);
    });

    // Column totals
    const colTotals = DEFECT_TYPES_LIST.map((defect) => {
      let sum = 0;
      STANDARD_PARTS.forEach((part) => {
        sum += log.matrix[part]?.[defect] || 0;
      });
      return sum;
    });
    
    const grandTotal = colTotals.reduce((s, v) => s + v, 0);
    csvRows.push(`Column Totals,-,${colTotals.join(',')},${grandTotal}`);

    if (log.positions) {
      csvRows.push('');
      csvRows.push('PRODUCTION SHIFT POSITIONS');
      csvRows.push('Shift,Station,Assigned Operators');
      
      const appendShiftRows = (shiftName: string, shift: typeof log.positions.morning) => {
        const categories = ['Sides', 'Crates', 'Bottoms', 'Lids'] as const;
        categories.forEach(cat => {
          const staff = (shift[cat] || []).filter(Boolean);
          csvRows.push(`${shiftName},${cat},"${staff.join(', ').replace(/"/g, '""')}"`);
        });
      };
      
      appendShiftRows('Morning', log.positions.morning);
      appendShiftRows('Afternoon', log.positions.afternoon);
    }

    // Create download link
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `QC_Log_${log.sku}_${log.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Convert all logs to a comprehensive aggregate CSV
  const handleExportAllAggregateCSV = () => {
    if (logs.length === 0) return;
    
    let csvRows = [];
    csvRows.push('Log ID,Date,Product SKU,Reported By,Part Type,Kit Bin,Defect Type,Defect Count');

    logs.forEach((log) => {
      STANDARD_PARTS.forEach((part) => {
        const isKitBin = log.kitBins?.[part] ? 'Yes' : 'No';
        DEFECT_TYPES_LIST.forEach((defect) => {
          const count = log.matrix[part]?.[defect] || 0;
          if (count > 0) {
            csvRows.push(`"${log.id}","${log.date}","${log.sku}","${log.shiftReportedBy.replace(/"/g, '""')}","${part}","${isKitBin}","${defect}",${count}`);
          }
        });
      });
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `QC_Logs_Aggregate_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Logs Index Table List */}
      <div className="bg-white border border-brand-beige-200 rounded-xl p-5 shadow-xs lg:col-span-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Historical QC Logs</h2>
            <p className="text-xs text-gray-500">List of all recorded quality audit sessions.</p>
          </div>

          {logs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {clearAllLogs && (
                showConfirmClear ? (
                  <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 p-1.5 rounded-lg">
                    <span className="text-[10px] text-red-750 font-bold px-1">Confirm delete elements?</span>
                    <button
                      id="confirm-clear-btn"
                      onClick={() => {
                        clearAllLogs();
                        setShowConfirmClear(false);
                      }}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                    >
                      Yes, Clear
                    </button>
                    <button
                      id="cancel-clear-btn"
                      onClick={() => setShowConfirmClear(false)}
                      className="px-1.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    id="clear-all-audits-btn"
                    onClick={() => setShowConfirmClear(true)}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border border-red-100 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Audits</span>
                  </button>
                )
              )}

              <button
                id="export-agg-csv-btn"
                onClick={handleExportAllAggregateCSV}
                className="px-3 py-2 bg-brand-forest-500 hover:bg-brand-forest-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export All (CSV)</span>
              </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
          <input
            id="history-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs by Product SKU, observer/reporter name, or date..."
            className="w-full bg-brand-beige-50 border border-brand-beige-200 text-xs rounded-lg pl-10 pr-4 py-3 outline-hidden focus:ring-1 focus:ring-brand-forest-500/20 focus:border-brand-forest-500 placeholder:text-gray-400"
          />
        </div>

        {filteredLogs.length === 0 ? (
          <div className="border border-dashed border-brand-beige-200 rounded-xl p-10 text-center flex flex-col items-center justify-center bg-brand-beige-50/20">
            <Layers className="w-10 h-10 text-brand-beige-300 mb-2.5" />
            <h3 className="text-sm font-bold text-gray-700">No logs match your search</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              Make sure you have saved your current log or try searching for another keyword.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-beige-50/70 text-[10px] font-bold text-brand-beige-800 uppercase tracking-wider border-b border-brand-beige-200">
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Product SKU</th>
                  <th className="px-3 py-2.5">Reporter</th>
                  <th className="px-3 py-2.5 text-center">Tally Count</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-beige-100">
                {filteredLogs.map((log) => {
                  const totalDefects = getLogTotalDefects(log);
                  const isSelected = selectedLog?.id === log.id;
                  
                  return (
                    <tr
                      key={log.id}
                      className={`text-xs hover:bg-brand-beige-50/45 transition-all cursor-pointer ${
                        isSelected ? 'bg-brand-beige-50 border-l-2 border-brand-forest-500' : ''
                      }`}
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-3 py-3.5 whitespace-nowrap font-mono text-gray-600 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-brand-beige-800" />
                          {log.date}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap font-mono font-bold text-gray-900">
                        {log.sku}
                      </td>
                      <td className="px-3 py-3.5 text-gray-700">
                        {log.shiftReportedBy || 'Unassigned'}
                      </td>
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full font-mono font-bold ${
                          totalDefects > 5
                            ? 'bg-red-50 text-red-700 border border-red-100'
                            : totalDefects > 0
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-green-50 text-green-700 border border-green-100'
                        }`}>
                          {totalDefects} defects
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end items-center gap-1.5">
                          <button
                            id={`history-view-btn-${log.id}`}
                            onClick={() => setSelectedLog(log)}
                            className="bg-brand-beige-100 p-1.5 hover:bg-brand-beige-200 text-gray-700 rounded-md transition-all"
                            title="Preview Log Grid"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            id={`history-load-btn-${log.id}`}
                            onClick={() => loadLogToActive(log)}
                            className="bg-brand-forest-50 p-1.5 hover:bg-brand-forest-100 text-brand-forest-600 rounded-md transition-all font-semibold"
                            title="Load back into active editor to edit"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`history-csv-btn-${log.id}`}
                            onClick={() => handleExportCSV(log)}
                            className="bg-brand-beige-100 p-1.5 hover:bg-brand-beige-200 text-brand-beige-800 rounded-md transition-all"
                            title="Download CSV report"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`history-share-btn-${log.id}`}
                            onClick={() => shareLog(log)}
                            className="bg-amber-55 hover:bg-amber-100 text-amber-700 p-1.5 rounded-md transition-all"
                            title="Export & Email Report (CSV + Email)"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`history-delete-btn-${log.id}`}
                            onClick={() => deleteLog(log.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-md transition-all"
                            title="Delete permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Log Sidebar Detail Panel */}
      <div className="bg-white border border-brand-beige-200 rounded-xl p-5 shadow-xs relative">
        {selectedLog ? (
          <div className="h-full flex flex-col justify-between">
            <div>
              <div className="border-b border-brand-beige-100 pb-3 mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-gray-900 font-mono">{selectedLog.sku}</h3>
                  <p className="text-[10px] text-gray-500 font-mono">ID: {selectedLog.id.slice(0, 13)}...</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 bg-brand-beige-100 text-brand-beige-800 rounded font-mono font-bold">
                    {selectedLog.date}
                  </span>
                </div>
              </div>

              {/* Snapshot Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-brand-beige-50/50 rounded-lg p-2.5 border border-brand-beige-100 text-center">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-tight">Total Tallied</span>
                  <span className="text-xl font-mono font-black text-brand-forest-700">{getLogTotalDefects(selectedLog)}</span>
                </div>
                <div className="bg-brand-beige-50/50 rounded-lg p-2.5 border border-brand-beige-100 text-center">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-tight">Reporter</span>
                  <span className="text-xs font-semibold text-gray-700 truncate block mt-1" title={selectedLog.shiftReportedBy}>
                    {selectedLog.shiftReportedBy.split(' ')[0] || 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Note Display */}
              {selectedLog.additionalNotes ? (
                <div className="bg-amber-50/30 border border-amber-500/10 rounded-lg p-3 text-xs text-gray-600 mb-4 font-sans leading-relaxed">
                  <span className="font-bold block text-brand-beige-800 mb-0.5 text-[10px] uppercase">Additional Notes:</span>
                  {selectedLog.additionalNotes}
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 italic mb-4">No notes supplied for this shift.</p>
              )}

              {/* Shift Assignments Detail Card */}
              {selectedLog.positions && (
                <div className="bg-brand-beige-50/70 border border-brand-beige-200 rounded-xl p-3 mb-4 flex flex-col gap-2.5">
                  <span className="font-extrabold text-[10px] uppercase tracking-wider text-brand-forest-700 block border-b border-brand-beige-200 pb-1.5">
                    Shift Operators Placements
                  </span>
                  
                  <div className="grid grid-cols-2 gap-3.5 text-[11px]">
                    {/* Morning list */}
                    <div className="flex flex-col gap-1.5 border-r border-brand-beige-200/80 pr-2 overflow-hidden">
                      <div className="flex items-center gap-1 font-bold text-gray-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        <span>Morning Shift</span>
                      </div>
                      <div className="flex flex-col gap-1 text-gray-650">
                        {(['Sides', 'Crates', 'Bottoms', 'Lids'] as const).map(cat => {
                          const staff = (selectedLog.positions?.morning[cat] || []).filter(Boolean);
                          return (
                            <div key={cat} className="truncate">
                              <strong className="text-gray-400 text-[10px]">{cat}: </strong>
                              <span className="font-medium text-gray-700" title={staff.join(', ')}>{staff.length > 0 ? staff.join(', ') : 'None'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Afternoon list */}
                    <div className="flex flex-col gap-1.5 pl-1 overflow-hidden">
                      <div className="flex items-center gap-1 font-bold text-gray-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <span>Afternoon Shift</span>
                      </div>
                      <div className="flex flex-col gap-1 text-gray-650">
                        {(['Sides', 'Crates', 'Bottoms', 'Lids'] as const).map(cat => {
                          const staff = (selectedLog.positions?.afternoon[cat] || []).filter(Boolean);
                          return (
                            <div key={cat} className="truncate">
                              <strong className="text-gray-400 text-[10px]">{cat}: </strong>
                              <span className="font-medium text-gray-700" title={staff.join(', ')}>{staff.length > 0 ? staff.join(', ') : 'None'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Highlight Damage Items */}
              <h4 className="text-xs uppercase tracking-wider font-bold text-brand-beige-800 mb-2">Primary Defects Spotted</h4>
              <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                {STANDARD_PARTS.some(part => 
                  DEFECT_TYPES_LIST.some(defect => (selectedLog.matrix[part]?.[defect] || 0) > 0)
                ) ? (
                  STANDARD_PARTS.map((part) => {
                    const rowDefects: React.ReactNode[] = [];
                    DEFECT_TYPES_LIST.forEach((defect) => {
                      const count = selectedLog.matrix[part]?.[defect] || 0;
                      if (count > 0) {
                        rowDefects.push(
                          <div key={`${part}-${defect}`} className="flex justify-between items-center text-xs py-1 border-b border-brand-beige-50 hover:bg-brand-beige-50/30">
                            <span className="text-gray-700 truncate pr-2 max-w-[180px]">
                              <strong className="text-gray-900">{part}</strong> &rarr; {defect}
                            </span>
                            <span className="font-mono bg-brand-beige-100 text-gray-800 font-bold px-1.5 py-0.2 rounded-sm text-[10px]">
                              {count}
                            </span>
                          </div>
                        );
                      }
                    });
                    return rowDefects;
                  })
                ) : (
                  <p className="text-xs text-gray-400 italic">No defects recorded.</p>
                )}
              </div>
            </div>

            {/* Side Log Actions footer */}
            <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-brand-beige-100">
              <button
                id="sidebar-load-btn"
                onClick={() => loadLogToActive(selectedLog)}
                className="w-full py-2.5 bg-brand-forest-500 hover:bg-brand-forest-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-3xs hover:scale-[1.01] transform"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Restore to Current Sheet</span>
              </button>

              <button
                id="sidebar-share-btn"
                onClick={() => shareLog(selectedLog)}
                className="w-full py-2 bg-brand-forest-50 hover:bg-brand-forest-100 text-brand-forest-700 border border-brand-forest-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-3xs"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Export &amp; Email Report</span>
              </button>

              <button
                id="sidebar-csv-btn"
                onClick={() => handleExportCSV(selectedLog)}
                className="w-full py-2 bg-brand-beige-50 hover:bg-brand-beige-100 text-brand-beige-800 border border-brand-beige-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Report (CSV)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-brand-beige-50/10">
            <Layers className="w-12 h-12 text-brand-beige-200 mb-2.5" />
            <h3 className="text-sm font-bold text-gray-600">Select a log to preview</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
              Click on any row in the logged index table to see a fast preview of statistics, notes, and specific damages.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
