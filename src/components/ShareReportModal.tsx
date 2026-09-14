import React, { useState } from 'react';
import { QCDefectLog, STANDARD_PARTS, DEFECT_TYPES_LIST } from '../types';
import { Mail, Download, Clipboard, Check, X, ArrowRight, Sparkles } from 'lucide-react';

interface ShareReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: QCDefectLog;
  userEmail?: string;
  showNotification: (type: 'success' | 'info' | 'error', message: string) => void;
}

// Generate the standard spreadsheet CSV string
export function generateCSVContent(log: QCDefectLog): string {
  const csvRows: string[] = [];
  csvRows.push(`Daily QC Defect Log - ${log.sku}`);
  csvRows.push(`Date,${log.date}`);
  csvRows.push(`Reported By,${log.shiftReportedBy || 'Unspecified'}`);
  csvRows.push(`Notes,"${(log.additionalNotes || '').replace(/"/g, '""')}"`);
  csvRows.push('');

  // Row Header
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
      const categories: Array<keyof typeof shift> = ['Sides', 'Crates', 'Bottoms', 'Lids'];
      categories.forEach(cat => {
        const staff = (shift[cat] || []).filter(Boolean);
        csvRows.push(`${shiftName},${cat},"${staff.join(', ').replace(/"/g, '""')}"`);
      });
    };
    
    appendShiftRows('Morning', log.positions.morning);
    appendShiftRows('Afternoon', log.positions.afternoon);
  }

  return csvRows.join('\n');
}

// Generate a plain text grid representation suitable for email bodies
export function generateEmailReportBody(log: QCDefectLog, grandTotal: number): string {
  let text = '';
  text += `DAILY QUALITY CONTROL INSPECTION REPORT\n`;
  text += `=======================================\n\n`;
  text += `Product SKU:        ${log.sku}\n`;
  text += `Date of Inspection: ${log.date}\n`;
  text += `Reported By:        ${log.shiftReportedBy || 'Unspecified'}\n`;
  text += `Total Defects:      ${grandTotal}\n\n`;

  if (log.additionalNotes) {
    text += `Additional Operator Notes:\n`;
    text += `-------------------------\n`;
    text += `"${log.additionalNotes}"\n\n`;
  } else {
    text += `No inspection comments reported.\n\n`;
  }

  text += `KIT BIN STATUS BY PART:\n`;
  text += `----------------------\n`;
  STANDARD_PARTS.forEach((part) => {
    text += `  • ${part}: Kit Bin = ${log.kitBins?.[part] ? 'Yes' : 'No'}\n`;
  });
  text += `\n`;

  text += `DEFECT TALLY SUMMARY:\n`;
  text += `--------------------\n`;
  
  let hasDefects = false;
  STANDARD_PARTS.forEach((part) => {
    const partDefects: string[] = [];
    const isKitBin = log.kitBins?.[part] ? 'Yes' : 'No';
    DEFECT_TYPES_LIST.forEach((defect) => {
      const count = log.matrix[part]?.[defect] || 0;
      if (count > 0) {
        partDefects.push(`  • ${defect}: ${count}`);
        hasDefects = true;
      }
    });
    if (partDefects.length > 0) {
      text += `[${part.toUpperCase()} PART] (Kit Bin: ${isKitBin})\n${partDefects.join('\n')}\n\n`;
    }
  });

  if (!hasDefects) {
    text += `Congratulations! 0 defects logged for this report.\n\n`;
  }

  if (log.positions) {
    text += `PRODUCTION LINE POSITION ASSIGNMENTS:\n`;
    text += `------------------------------------\n`;
    
    const renderShift = (name: string, shift: typeof log.positions.morning) => {
      let shiftText = `[${name.toUpperCase()} SHIFT]\n`;
      let empty = true;
      const categories: Array<keyof typeof shift> = ['Sides', 'Crates', 'Bottoms', 'Lids'];
      
      categories.forEach((cat) => {
        const staff = (shift[cat] || []).filter(Boolean);
        if (staff.length > 0) {
          shiftText += `  • ${cat}: ${staff.join(', ')}\n`;
          empty = false;
        }
      });
      if (empty) {
        shiftText += `  • No staff assigned.\n`;
      }
      return shiftText;
    };
    
    text += renderShift('Morning', log.positions.morning);
    text += '\n';
    text += renderShift('Afternoon', log.positions.afternoon);
    text += '\n';
  }

  text += `---------------------------------------\n`;
  return text;
}

export default function ShareReportModal({
  isOpen,
  onClose,
  log,
  userEmail = '',
  showNotification
}: ShareReportModalProps) {
  const [recipient, setRecipient] = useState(userEmail);
  const [subject, setSubject] = useState(`[ShopPulse] QC Defect Log for ${log.sku} - ${log.date}`);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Calculate totals
  let grandTotal = 0;
  STANDARD_PARTS.forEach((p) => {
    DEFECT_TYPES_LIST.forEach((d) => {
      grandTotal += log.matrix[p]?.[d] || 0;
    });
  });

  const emailBody = generateEmailReportBody(log, grandTotal);

  const handleDownloadCSVClick = () => {
    const csvString = generateCSVContent(log);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `QC_Log_${log.sku}_${log.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('success', 'CSV spreadsheet downloaded successfully.');
  };

  const handleCopyBody = () => {
    navigator.clipboard.writeText(emailBody);
    setCopied(true);
    showNotification('success', 'Email body copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunchEmailClient = () => {
    // Escape standard values for URL safety
    const escapedSubject = encodeURIComponent(subject);
    const escapedBody = encodeURIComponent(emailBody);
    const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${escapedSubject}&body=${escapedBody}`;
    
    // Attempt client launch
    window.location.href = mailtoUrl;
    showNotification('info', 'Opening your default mail application...');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-brand-beige-200 overflow-hidden w-full max-w-xl max-h-[90vh] flex flex-col loader-fade-in">
        
        {/* Modal Title Banner */}
        <div className="bg-brand-forest-700 text-white p-5 flex justify-between items-center relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400"></div>
          <div className="flex items-center gap-2.5">
            <Mail className="w-5 h-5 text-amber-300 animate-pulse" />
            <div>
              <h3 className="font-bold text-sm tracking-tight font-sans">Export &amp; Share QC Record</h3>
            </div>
          </div>
          <button
            id="close-share-modal-btn"
            onClick={onClose}
            className="text-white hover:text-amber-300 bg-brand-forest-800 hover:bg-brand-forest-900 rounded-full p-1.5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Payload Area */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          
          {/* Active Record Summary Snapshot Card */}
          <div className="bg-brand-beige-50 border border-brand-beige-200 p-4 rounded-xl flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider font-bold">DRAFT REPORT DETAILS</span>
              <span className="text-sm font-bold text-gray-900">{log.sku}</span>
              <span className="text-xs text-gray-500 font-mono">Date: {log.date} · Reported By: {log.shiftReportedBy || 'Not set'}</span>
            </div>
            <div className="text-right bg-white rounded-lg p-2 border border-brand-beige-100 text-center min-w-[80px]">
              <span className="text-[9px] text-gray-400 block font-bold">DAMAGE COUNT</span>
              <span className="text-lg font-mono font-black text-brand-forest-700">{grandTotal}</span>
            </div>
          </div>

          {/* Quick Actions Tabs */}
          <div className="grid grid-cols-2 gap-3">
            <button
              id="share-modal-csv-action"
              onClick={handleDownloadCSVClick}
              className="flex items-center justify-center gap-2 py-3 bg-brand-forest-50 hover:bg-brand-forest-100 text-brand-forest-700 border border-brand-forest-200 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV File</span>
            </button>

            <button
              id="share-modal-copy-action"
              onClick={handleCopyBody}
              className="flex items-center justify-center gap-2 py-3 bg-brand-beige-50 hover:bg-brand-beige-100 text-gray-700 border border-brand-beige-200 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Clipboard className="w-4 h-4 text-amber-600" />}
              <span>{copied ? 'Copied Summary' : 'Copy Summary'}</span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-brand-beige-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 font-semibold text-gray-400 uppercase tracking-wider text-[9px]">Draft Electronic Mail</span>
            </div>
          </div>

          {/* Email inputs */}
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Send to Email:</label>
                <input
                  id="email-modal-recipient"
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="e.g. supervisor@company.com"
                  className="w-full text-xs font-medium px-3 py-2.5 bg-brand-beige-50 hover:bg-white border border-brand-beige-200 rounded-lg outline-hidden focus:border-brand-forest-500 transition-all font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Subject Prompt:</label>
                <input
                  id="email-modal-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2.5 bg-brand-beige-50 hover:bg-white border border-brand-beige-200 rounded-lg outline-hidden focus:border-brand-forest-500 transition-all font-sans"
                />
              </div>
            </div>

            {/* Live formatting preview */}
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Live Email Content Preview:</span>
              <pre className="bg-brand-beige-50 text-[10px] text-gray-600 p-3 rounded-lg border border-brand-beige-200 font-mono overflow-y-auto max-h-[160px] whitespace-pre-wrap leading-relaxed select-none">
                {emailBody}
              </pre>
            </div>
          </div>

        </div>

        {/* Footer controls */}
        <div className="bg-brand-beige-100 p-4 border-t border-brand-beige-200 flex items-center justify-between gap-3">
          <p className="text-[10px] text-gray-400 font-sans leading-tight">
            Leaves standard formatting template. Attach the downloaded CSV report directly in the email for complete logs.
          </p>
          <button
            onClick={handleLaunchEmailClient}
            id="launch-email-draft-btn"
            className="px-5 py-3 bg-brand-forest-600 hover:bg-brand-forest-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer shrink-0"
          >
            <span>Draft Email</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
          </button>
        </div>

      </div>
    </div>
  );
}
