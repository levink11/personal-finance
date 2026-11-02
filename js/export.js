/**
 * Data Export & Backup Module
 * CSV generation and JSON Backup / Restore
 */

import { state } from './state.js';
import { getTodayStr, formatDate, formatINR, showToast } from './utils.js';

export class ExportManager {
  // Download raw JSON backup
  exportJSONBackup() {
    const dataStr = state.exportJSON();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `credipulse_backup_${getTodayStr()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('JSON backup downloaded successfully', 'success');
  }

  // Import JSON backup
  importJSONBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const success = state.importJSON(event.target.result);
          if (success) {
            showToast('Backup restored successfully!', 'success');
            resolve(true);
          } else {
            showToast('Failed to parse backup file', 'error');
            reject(new Error('Invalid JSON'));
          }
        } catch (e) {
          showToast('Corrupted file format', 'error');
          reject(e);
        }
      };
      reader.onerror = () => {
        showToast('Error reading file', 'error');
        reject(new Error('File read error'));
      };
      reader.readAsText(file);
    });
  }

  // Export Lent Funds as CSV
  exportLentFundsCSV() {
    const loans = state.getLoans();
    const headers = [
      'Borrower Name',
      'Status',
      'Principal (INR)',
      'Date Lent',
      'Return Due Date',
      'Interest Rate (%)',
      'Interest Amount (INR)',
      'Total Repayable (INR)',
      'Rollovers Count',
      'Settled Date',
      'Notes'
    ];

    const rows = loans.map(l => [
      `"${(l.borrowerName || '').replace(/"/g, '""')}"`,
      l.status,
      l.principal,
      l.dateLent,
      l.returnDueDate,
      l.interestRate || 0,
      l.interestAmount || 0,
      (Number(l.principal) || 0) + (Number(l.interestAmount) || 0),
      l.rolloverCount || 0,
      l.settledAt || '',
      `"${(l.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    this.downloadCSV(csvContent, `credipulse_loans_${getTodayStr()}.csv`);
    showToast('Lent Funds CSV downloaded', 'success');
  }

  // Export Interest Ledger as CSV
  exportLedgerCSV() {
    const ledger = state.getLedger();
    const headers = [
      'Receipt ID',
      'Date Collected',
      'Borrower Name',
      'Type',
      'Amount Received (INR)',
      'Extended New Due Date',
      'Notes'
    ];

    const rows = ledger.map(e => [
      e.id,
      e.dateCollected,
      `"${(e.borrowerName || '').replace(/"/g, '""')}"`,
      e.type,
      e.amount,
      e.newDueDate || '',
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    this.downloadCSV(csvContent, `credipulse_interest_ledger_${getTodayStr()}.csv`);
    showToast('Interest Ledger CSV downloaded', 'success');
  }

  downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const exportManager = new ExportManager();
