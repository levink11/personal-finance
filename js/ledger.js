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
        <div class="mb-4 flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-yellow-400 text-xs">
          <span>Filtering payments for: <strong class="text-white">${borrowerName}</strong></span>
          <button id="clear-ledger-filter" class="text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white transition">
            Show All Borrowers
          </button>
        </div>
      `;
    }

    if (entries.length === 0) {
      this.container.innerHTML = `
        ${filterBanner}
        <div class="text-center py-12 px-4 rounded-2xl border border-dashed border-zinc-700 bg-zinc-950">
          <div class="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-3 text-yellow-400 text-xl font-bold">₹</div>
          <h4 class="text-zinc-200 font-semibold mb-1 text-xs">No Interest Payments Recorded Yet</h4>
          <p class="text-zinc-500 text-xs max-w-xs mx-auto">
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

      <!-- Summary metrics bar in Solid Black Box -->
      <div class="grid grid-cols-3 gap-2.5 mb-4">
        <div class="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">Total Interest</span>
          <span class="text-base font-bold text-yellow-400 font-mono">+${formatINR(totalCollected)}</span>
        </div>
        <div class="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">From Rollovers</span>
          <span class="text-sm font-semibold text-zinc-200 font-mono">${formatINR(rolloverTotal)}</span>
        </div>
        <div class="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">Settlements</span>
          <span class="text-sm font-semibold text-zinc-200 font-mono">${formatINR(settleTotal)}</span>
        </div>
      </div>

      <!-- Ledger Table / List -->
      <div class="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-zinc-900 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
              <tr>
                <th class="px-3 py-2">Date</th>
                <th class="px-3 py-2">Borrower</th>
                <th class="px-3 py-2">Type</th>
                <th class="px-3 py-2 text-right">Amount Received</th>
                <th class="px-3 py-2">Notes</th>
                <th class="px-2 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800">
              ${entries.map(e => `
                <tr class="hover:bg-zinc-900/60 transition-colors">
                  <td class="px-3 py-2.5 whitespace-nowrap text-zinc-400 font-mono text-[11px]">
                    ${formatDate(e.dateCollected)}
                  </td>
                  <td class="px-3 py-2.5 font-bold text-white">
                    ${e.borrowerName}
                  </td>
                  <td class="px-3 py-2.5 whitespace-nowrap">
                    ${e.type === 'rollover' 
                      ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-yellow-400 border border-zinc-700">🔄 Rollover</span>'
                      : '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-emerald-400 border border-zinc-700">✅ Settlement</span>'
                    }
                  </td>
                  <td class="px-3 py-2.5 text-right whitespace-nowrap font-bold text-yellow-400 font-mono">
                    +${formatINR(e.amount)}
                  </td>
                  <td class="px-3 py-2.5 text-zinc-400 max-w-[180px] truncate" title="${e.notes || ''}">
                    ${e.notes || '—'}
                  </td>
                  <td class="px-2 py-2.5 text-center">
                    <button class="delete-ledger-entry text-zinc-500 hover:text-rose-400 text-xs p-1 rounded transition cursor-pointer" data-id="${e.id}" title="Delete entry">
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
