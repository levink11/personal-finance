/**
 * Interest Ledger Component
 * Tracks all interest receipts (Rollover payments and Final Settlements)
 */

import { state } from './state.js';
import { formatINR, formatDate, showToast } from './utils.js';

export class InterestLedgerView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.filterLoanId = null;
  }

  setFilter(loanId = null) {
    this.filterLoanId = loanId;
    this.render();
  }

  render() {
    if (!this.container) return;

    let entries = state.getLedger();

    if (this.filterLoanId) {
      entries = entries.filter(e => e.loanId === this.filterLoanId);
    }

    const totalCollected = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const rolloverTotal = entries.filter(e => e.type === 'rollover').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const settleTotal = entries.filter(e => e.type === 'settlement').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    let filterBanner = '';
    if (this.filterLoanId) {
      const loan = state.getLoanById(this.filterLoanId);
      const borrowerName = loan ? loan.borrowerName : 'Loan';
      filterBanner = `
        <div class="mb-4 flex items-center justify-between p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 text-sm">
          <span>Filtering payments for: <strong class="text-white">${borrowerName}</strong></span>
          <button id="clear-ledger-filter" class="text-xs px-2.5 py-1 rounded-lg bg-cyan-900/60 hover:bg-cyan-800 text-white transition">
            Show All Borrowers
          </button>
        </div>
      `;
    }

    if (entries.length === 0) {
      this.container.innerHTML = `
        ${filterBanner}
        <div class="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/30">
          <div class="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400 text-xl font-bold">₹</div>
          <h4 class="text-slate-300 font-semibold mb-1">No Interest Payments Recorded Yet</h4>
          <p class="text-slate-500 text-xs max-w-xs mx-auto">
            When borrowers pay rollover interest or settle their loans, every rupee collected is permanently logged here.
          </p>
        </div>
      `;

      if (this.filterLoanId) {
        document.getElementById('clear-ledger-filter')?.addEventListener('click', () => {
          this.setFilter(null);
        });
      }
      return;
    }

    const html = `
      ${filterBanner}

      <!-- Summary metrics bar -->
      <div class="grid grid-cols-3 gap-2.5 mb-5">
        <div class="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <span class="text-[11px] font-medium uppercase tracking-wider text-slate-400 block mb-0.5">Total Interest</span>
          <span class="text-lg font-bold text-emerald-400">${formatINR(totalCollected)}</span>
        </div>
        <div class="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <span class="text-[11px] font-medium uppercase tracking-wider text-slate-400 block mb-0.5">From Rollovers</span>
          <span class="text-base font-semibold text-cyan-400">${formatINR(rolloverTotal)}</span>
        </div>
        <div class="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <span class="text-[11px] font-medium uppercase tracking-wider text-slate-400 block mb-0.5">Settlements</span>
          <span class="text-base font-semibold text-indigo-400">${formatINR(settleTotal)}</span>
        </div>
      </div>

      <!-- Ledger Table / List -->
      <div class="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-800/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-700/60">
              <tr>
                <th class="px-3.5 py-2.5">Date</th>
                <th class="px-3.5 py-2.5">Borrower</th>
                <th class="px-3.5 py-2.5">Type</th>
                <th class="px-3.5 py-2.5 text-right">Amount Received</th>
                <th class="px-3.5 py-2.5">Notes</th>
                <th class="px-2 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/70">
              ${entries.map(e => `
                <tr class="hover:bg-slate-800/40 transition-colors">
                  <td class="px-3.5 py-3 whitespace-nowrap text-xs text-slate-300 font-mono">
                    ${formatDate(e.dateCollected)}
                  </td>
                  <td class="px-3.5 py-3 font-medium text-slate-200">
                    ${e.borrowerName}
                  </td>
                  <td class="px-3.5 py-3 whitespace-nowrap">
                    ${e.type === 'rollover' 
                      ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">🔄 Rollover</span>'
                      : '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">✅ Settlement</span>'
                    }
                  </td>
                  <td class="px-3.5 py-3 text-right whitespace-nowrap font-bold text-emerald-400 font-mono">
                    +${formatINR(e.amount)}
                  </td>
                  <td class="px-3.5 py-3 text-xs text-slate-400 max-w-[200px] truncate" title="${e.notes || ''}">
                    ${e.notes || '—'}
                  </td>
                  <td class="px-2 py-3 text-center">
                    <button class="delete-ledger-entry text-slate-500 hover:text-rose-400 text-xs p-1 rounded transition" data-id="${e.id}" title="Delete entry">
                      🗑️
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.container.innerHTML = html;

    if (this.filterLoanId) {
      document.getElementById('clear-ledger-filter')?.addEventListener('click', () => {
        this.setFilter(null);
      });
    }

    // Attach delete handlers
    this.container.querySelectorAll('.delete-ledger-entry').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this interest payment record?')) {
          state.deleteLedgerEntry(id);
          showToast('Payment record removed from ledger', 'info');
          this.render();
        }
      });
    });
  }
}
