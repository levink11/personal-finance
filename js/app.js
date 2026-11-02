/**
 * Main Application Orchestrator
 * Clean, lightweight coordinator for the row-based Peer-Lending PWA
 */

import { state } from './state.js';
import { PeerLendingEngine } from './lending.js';
import { InterestLedgerView } from './ledger.js';
import { exportManager } from './export.js';
import { showToast } from './utils.js';

class CrediPulseApp {
  constructor() {
    this.deferredPrompt = null;

    this.initViews();
    this.initNavigation();
    this.initModals();
    this.initPWA();
    this.initSettingsModal();
    this.initKeyboardShortcuts();
  }

  initViews() {
    this.lendingEngine = new PeerLendingEngine();
    this.ledgerView = new InterestLedgerView('ledger-view-content');
  }

  initNavigation() {
    // Ledger button
    document.querySelectorAll('.open-ledger-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openLedger();
      });
    });

    // Settings / Backup button
    document.getElementById('open-settings-btn')?.addEventListener('click', () => {
      this.openSettings();
    });
  }

  openLedger(filterLoanId = null) {
    this.ledgerView.setFilter(filterLoanId);
    const modal = document.getElementById('ledger-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  openSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  exportLedgerCSV() {
    exportManager.exportLedgerCSV();
  }

  exportLentFundsCSV() {
    exportManager.exportLentFundsCSV();
  }

  exportJSONBackup() {
    exportManager.exportJSONBackup();
  }

  initModals() {
    // Generic modal close buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.currentTarget.closest('.modal-backdrop');
        if (modal) {
          modal.classList.add('hidden');
          modal.classList.remove('flex');
        }
      });
    });

    // Click outside modal container to dismiss
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
          modal.classList.remove('flex');
        }
      });
    });
  }

  initSettingsModal() {
    // Export JSON
    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      exportManager.exportJSONBackup();
    });

    // Import JSON trigger
    const importFileInput = document.getElementById('input-import-json');
    document.getElementById('btn-import-json')?.addEventListener('click', () => {
      importFileInput?.click();
    });

    importFileInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await exportManager.importJSONBackup(file);
        e.target.value = '';
        document.getElementById('settings-modal')?.classList.add('hidden');
      }
    });

    // Export Lent CSV
    document.getElementById('btn-export-lent-csv')?.addEventListener('click', () => {
      exportManager.exportLentFundsCSV();
    });

    // Export Ledger CSV
    document.getElementById('btn-export-ledger-csv')?.addEventListener('click', () => {
      exportManager.exportLedgerCSV();
    });

    // Reset Sample Data
    document.getElementById('btn-reset-sample-data')?.addEventListener('click', () => {
      if (confirm('Load sample demonstration data? Any unsaved edits will be replaced.')) {
        state.resetData();
        showToast('Sample demo data loaded', 'info');
        document.getElementById('settings-modal')?.classList.add('hidden');
      }
    });

    // Clear All Data
    document.getElementById('btn-clear-all-data')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to completely erase all data? This cannot be undone.')) {
        state.clearAllData();
        showToast('All records cleared', 'warning');
        document.getElementById('settings-modal')?.classList.add('hidden');
      }
    });
  }

  initPWA() {
    // Register Service Worker for offline capability
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => {
            console.log('CrediPulse ServiceWorker registered:', reg.scope);
          })
          .catch(err => {
            console.log('CrediPulse ServiceWorker registration failed:', err);
          });
      });
    }

    // PWA Install prompt handling
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const installPill = document.getElementById('pwa-install-pill');
      if (installPill) {
        installPill.classList.remove('hidden');
      }
    });

    document.getElementById('pwa-install-pill')?.addEventListener('click', async () => {
      if (this.deferredPrompt) {
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('CrediPulse installed to Home Screen!', 'success');
        }
        this.deferredPrompt = null;
        document.getElementById('pwa-install-pill')?.classList.add('hidden');
      } else {
        alert('To install CrediPulse:\n\n• On iOS (Safari): Tap Share button → "Add to Home Screen"\n• On Android (Chrome): Tap Menu (3 dots) → "Add to Home Screen"\n• On Desktop (Chrome/Edge): Click the Install icon in the address bar.');
      }
    });
  }

  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach(m => {
          m.classList.add('hidden');
          m.classList.remove('flex');
        });
      }
    });
  }
}

// Instantiate and expose
window.addEventListener('DOMContentLoaded', () => {
  window.credipulseApp = new CrediPulseApp();
});
