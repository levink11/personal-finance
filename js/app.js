/**
 * Main Application Orchestrator
 */

import { state } from './state.js';
import { PeerLendingEngine } from './lending.js';
import { DashboardView } from './dashboard.js';
import { InterestLedgerView } from './ledger.js';
import { exportManager } from './export.js';
import { showToast } from './utils.js';

class CrediPulseApp {
  constructor() {
    this.currentView = 'lending'; // default starting view for Sprint 1
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
    this.dashboardView = new DashboardView('dashboard-view');
    this.ledgerView = new InterestLedgerView('ledger-view-content');

    state.subscribe(() => {
      if (this.currentView === 'dashboard') {
        this.dashboardView.render();
      }
    });
  }

  initNavigation() {
    // Top and Bottom Nav buttons
    const navButtons = document.querySelectorAll('[data-nav-target]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetView = e.currentTarget.getAttribute('data-nav-target');
        this.switchToView(targetView);
      });
    });

    // Ledger button in top bar
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

  switchToView(viewName) {
    this.currentView = viewName;

    // Hide all view panels
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.add('hidden');
    });

    // Show target view panel
    const targetPanel = document.getElementById(`${viewName}-view`);
    if (targetPanel) {
      targetPanel.classList.remove('hidden');
    }

    // Update active state in nav buttons
    document.querySelectorAll('[data-nav-target]').forEach(btn => {
      const target = btn.getAttribute('data-nav-target');
      if (target === viewName) {
        btn.classList.add('text-emerald-400', 'bg-slate-800/80', 'font-bold');
        btn.classList.remove('text-slate-400', 'hover:text-slate-200');
        // Indicator dot on mobile
        const dot = btn.querySelector('.nav-indicator-dot');
        if (dot) dot.classList.remove('opacity-0');
      } else {
        btn.classList.remove('text-emerald-400', 'bg-slate-800/80', 'font-bold');
        btn.classList.add('text-slate-400', 'hover:text-slate-200');
        const dot = btn.querySelector('.nav-indicator-dot');
        if (dot) dot.classList.add('opacity-0');
      }
    });

    // Re-render view specific content
    if (viewName === 'dashboard') {
      this.dashboardView.render();
    } else if (viewName === 'lending') {
      this.lendingEngine.render();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
