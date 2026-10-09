import { QCDefectLog, STANDARD_PARTS, DEFECT_TYPES_LIST } from '../types';
import { generateCSVContent, generateEmailReportBody } from '../components/ShareReportModal';

export function openArchivedLogWindow(log: QCDefectLog) {
  let grandTotal = 0;
  STANDARD_PARTS.forEach((p) => {
    DEFECT_TYPES_LIST.forEach((d) => {
      grandTotal += log.matrix[p]?.[d] || 0;
    });
  });

  const emailBody = generateEmailReportBody(log, grandTotal);
  const csvContent = generateCSVContent(log);
  const defaultSubject = `[Daily QC Log] Defect Report for ${log.sku} - ${log.date}`;

  // Encode for embedding safely into HTML script
  const serializedLog = JSON.stringify(log);
  const serializedBody = JSON.stringify(emailBody);
  const serializedCsv = JSON.stringify(csvContent);
  const serializedSubject = JSON.stringify(defaultSubject);

  const newWindow = window.open('', `_blank_qclog_${log.id}`, 'width=880,height=920,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes');

  if (!newWindow) {
    return false; // Popup blocked
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QC Defect Log - ${escapeHtml(log.sku)} (${escapeHtml(log.date)})</title>
  <style>
    :root {
      --brand-forest-900: #0f2319;
      --brand-forest-800: #153023;
      --brand-forest-700: #1b3b2b;
      --brand-forest-600: #244d38;
      --brand-forest-500: #2f6349;
      --brand-forest-100: #d6e8de;
      --brand-forest-50: #edf5f0;
      --brand-beige-100: #f5f0e8;
      --brand-beige-50: #faf7f2;
      --border-color: #e5ded3;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: #f7f4ee; color: #1e293b; padding: 24px; line-height: 1.5; }
    .container { max-width: 820px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid var(--border-color); box-shadow: 0 4px 20px rgba(0,0,0,0.06); overflow: hidden; }
    .header { background: var(--brand-forest-700); color: #ffffff; padding: 20px 24px; position: relative; }
    .header::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: #fbbf24; }
    .header-title-row { display: flex; align-items: center; justify-content: space-between; }
    .title { font-size: 18px; font-weight: 700; }
    .badge { background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-family: monospace; font-weight: 600; }
    .content { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
    
    .card { background: var(--brand-beige-50); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; }
    .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .metric-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; margin-bottom: 2px; }
    .metric-val { font-size: 16px; font-weight: 700; color: #0f172a; }
    .total-pill { display: inline-block; background: var(--brand-forest-600); color: #fff; padding: 2px 10px; border-radius: 9999px; font-size: 14px; font-family: monospace; font-weight: 700; }
    
    .actions-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.15s ease; text-decoration: none; }
    .btn-primary { background: var(--brand-forest-600); color: #ffffff; }
    .btn-primary:hover { background: var(--brand-forest-700); }
    .btn-secondary { background: #ffffff; color: #334155; border-color: var(--border-color); }
    .btn-secondary:hover { background: #f8fafc; }
    
    .email-box { background: #ffffff; border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 600px) { .input-row { grid-template-columns: 1fr; } }
    .input-group label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 4px; }
    .input-group input { width: 100%; padding: 8px 12px; font-size: 13px; border: 1px solid var(--border-color); border-radius: 8px; background: #fafaf9; }
    .input-group input:focus { outline: none; border-color: var(--brand-forest-500); background: #ffffff; }
    
    .table-container { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; }
    th { background: #f1ede4; color: #334155; padding: 10px 12px; font-weight: 700; text-transform: uppercase; font-size: 10px; border-bottom: 1px solid var(--border-color); }
    td { padding: 10px 12px; border-bottom: 1px solid #f1ece4; color: #1e293b; }
    tr:last-child td { border-bottom: none; }
    .count-cell { text-align: center; font-family: monospace; font-weight: 700; font-size: 13px; }
    .count-positive { background: #fef2f2; color: #991b1b; }
    
    pre.preview-code { background: #faf8f5; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: #334155; max-height: 220px; overflow-y: auto; white-space: pre-wrap; line-height: 1.5; }
    .toast { position: fixed; top: 16px; right: 16px; background: #0f172a; color: #ffffff; padding: 10px 16px; border-radius: 8px; font-size: 12px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.15); opacity: 0; transition: opacity 0.2s ease; pointer-events: none; }
    .toast.show { opacity: 1; }
  </style>
</head>
<body>
  <div id="toast" class="toast">Action completed</div>

  <div class="container">
    <div class="header">
      <div class="header-title-row">
        <div>
          <div class="title">Archived QC Defect Log</div>
          <div style="font-size: 12px; opacity: 0.85; margin-top: 2px;">ShopPulse Inspection Archive</div>
        </div>
        <div class="badge">${escapeHtml(log.sku)}</div>
      </div>
    </div>

    <div class="content">
      <!-- Overview Card -->
      <div class="card">
        <div class="card-grid">
          <div>
            <div class="metric-label">Date of Inspection</div>
            <div class="metric-val">${escapeHtml(log.date)}</div>
          </div>
          <div>
            <div class="metric-label">Inspector / Reported By</div>
            <div class="metric-val">${escapeHtml(log.shiftReportedBy || 'Unspecified')}</div>
          </div>
          <div>
            <div class="metric-label">Total Defects</div>
            <div><span class="total-pill">${grandTotal} defects</span></div>
          </div>
          <div>
            <div class="metric-label">Archived Timestamp</div>
            <div style="font-size: 12px; color: #64748b; font-family: monospace;">${escapeHtml(log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A')}</div>
          </div>
        </div>

        ${log.additionalNotes ? `
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-color);">
          <div class="metric-label">Additional Notes</div>
          <div style="font-size: 13px; color: #334155; margin-top: 4px;">${escapeHtml(log.additionalNotes)}</div>
        </div>
        ` : ''}
      </div>

      <!-- Quick Action Buttons -->
      <div class="actions-bar">
        <button id="downloadCsvBtn" class="btn btn-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download CSV Report
        </button>
        <button id="copySummaryBtn" class="btn btn-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy Text Summary
        </button>
        <button id="printBtn" class="btn btn-secondary" onclick="window.print()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Print Record
        </button>
      </div>

      <!-- Re-email Section -->
      <div class="email-box">
        <div style="font-size: 13px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 6px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2f6349" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Re-Email Inspection Record
        </div>

        <div class="input-row">
          <div class="input-group">
            <label for="recipientEmail">Recipient Email Address</label>
            <input type="email" id="recipientEmail" placeholder="recipient@example.com" value="">
          </div>
          <div class="input-group">
            <label for="emailSubject">Subject Line</label>
            <input type="text" id="emailSubject" value="${escapeHtml(defaultSubject)}">
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
          <button id="sendEmailBtn" class="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Send / Draft Email Now
          </button>
        </div>
      </div>

      <!-- Defect Breakdown Table -->
      <div>
        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Defect Breakdown by Part Type</div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Part</th>
                <th>Kit Bin</th>
                ${DEFECT_TYPES_LIST.map(d => `<th style="text-align: center;">${escapeHtml(d)}</th>`).join('')}
                <th style="text-align: center;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${STANDARD_PARTS.map(part => {
                let partTotal = 0;
                const cells = DEFECT_TYPES_LIST.map(d => {
                  const count = log.matrix[part]?.[d] || 0;
                  partTotal += count;
                  return `<td class="count-cell ${count > 0 ? 'count-positive' : ''}">${count}</td>`;
                }).join('');
                return `
                  <tr>
                    <td style="font-weight: 700;">${escapeHtml(part)}</td>
                    <td style="font-weight: 600; color: ${log.kitBins?.[part] ? '#b45309' : '#64748b'};">${log.kitBins?.[part] ? 'Yes' : 'No'}</td>
                    ${cells}
                    <td class="count-cell" style="font-weight: 800; background: #f8fafc;">${partTotal}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Formatted Text Email Preview -->
      <div>
        <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 6px;">Email Text Content Preview</div>
        <pre class="preview-code">${escapeHtml(emailBody)}</pre>
      </div>
    </div>
  </div>

  <script>
    const log = ${serializedLog};
    const emailBody = ${serializedBody};
    const csvContent = ${serializedCsv};

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2500);
    }

    document.getElementById('downloadCsvBtn').addEventListener('click', function() {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'QC_Log_' + log.sku + '_' + log.date + '.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('CSV downloaded');
    });

    document.getElementById('copySummaryBtn').addEventListener('click', function() {
      navigator.clipboard.writeText(emailBody).then(() => {
        showToast('Email summary copied to clipboard');
      });
    });

    document.getElementById('sendEmailBtn').addEventListener('click', function() {
      const recipient = document.getElementById('recipientEmail').value.trim();
      const subject = document.getElementById('emailSubject').value.trim() || 'QC Defect Report';
      const mailtoUrl = 'mailto:' + encodeURIComponent(recipient) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(emailBody);
      window.location.href = mailtoUrl;
      showToast('Launching email application...');
    });
  </script>
</body>
</html>`;

  newWindow.document.open();
  newWindow.document.write(html);
  newWindow.document.close();
  return true;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
