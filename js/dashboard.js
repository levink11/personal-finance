/**
 * Master Dashboard Module
 * Net worth computation and high-level portfolio overview
 */

import { state } from './state.js';
import { formatINR, formatDate } from './utils.js';

export class DashboardView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render() {
    if (!this.container) return;

    const stats = state.getStats();
    const loans = state.getLoans();
    const ledger = state.getLedger();

    const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'extended');

    this.container.innerHTML = `
      <!-- Master Net Worth Hero Card -->
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950/30 to-slate-900 border border-emerald-500/20 p-6 sm:p-8 shadow-2xl mb-8">
        <div class="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-16 -bottom-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="text-xs uppercase tracking-widest font-semibold text-emerald-400">Master Financial Position</span>
            </div>
            <h2 class="text-xs sm:text-sm font-medium text-slate-400 mb-1">Calculated Net Worth</h2>
            <div class="text-3xl sm:text-5xl font-black text-white tracking-tight font-mono">
              ${formatINR(stats.netWorth)}
            </div>
            <p class="text-xs text-slate-400 mt-2 max-w-md">
              (Bank Balances ${formatINR(stats.totalBankFunds)} + Active Lent ${formatINR(stats.totalActivePrincipal)} + Interest Collected ${formatINR(stats.totalInterestCollected)}) - Debts ${formatINR(stats.totalDebts)}
            </p>
          </div>

          <div class="flex flex-wrap md:flex-col gap-2 shrink-0">
            <button class="dash-new-loan-btn inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-950/50 transition">
              <span>+</span> New Peer Loan
            </button>
            <button class="dash-view-ledger-btn inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-medium text-sm border border-slate-700 transition">
              <span>📜</span> Interest Ledger
            </button>
          </div>
        </div>
      </div>

      <!-- Financial Metrics Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <!-- Card 1: Active Lent -->
        <div class="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 sm:p-5">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Lent</span>
            <span class="text-base text-emerald-400">🤝</span>
          </div>
          <div class="text-xl sm:text-2xl font-black text-white font-mono">${formatINR(stats.totalActivePrincipal)}</div>
          <div class="text-[11px] text-slate-400 mt-1">${stats.activeCount} active borrowers</div>
        </div>

        <!-- Card 2: Interest Collected -->
        <div class="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 sm:p-5">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Interest Earned</span>
            <span class="text-base text-cyan-400">📈</span>
          </div>
          <div class="text-xl sm:text-2xl font-black text-cyan-400 font-mono">+${formatINR(stats.totalInterestCollected)}</div>
          <div class="text-[11px] text-slate-400 mt-1">Across all rollovers & settlements</div>
        </div>

        <!-- Card 3: Parked Bank Funds -->
        <div class="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 sm:p-5">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bank Funds</span>
            <span class="text-base text-indigo-400">🏦</span>
          </div>
          <div class="text-xl sm:text-2xl font-black text-slate-200 font-mono">${formatINR(stats.totalBankFunds)}</div>
          <div class="text-[11px] text-slate-400 mt-1">HDFC, SBI, Cash in hand</div>
        </div>

        <!-- Card 4: Debts / Money I Owe -->
        <div class="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 sm:p-5">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Debts</span>
            <span class="text-base text-rose-400">💳</span>
          </div>
          <div class="text-xl sm:text-2xl font-black text-rose-400 font-mono">${formatINR(stats.totalDebts)}</div>
          <div class="text-[11px] text-slate-400 mt-1">Sprint 3 Module</div>
        </div>
      </div>

      <!-- Quick Section: Active Receivables Snapshot & Recent Interest Receipts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Active Receivables -->
        <div class="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-slate-200 text-sm flex items-center gap-2">
              <span>⏳</span> Immediate Receivables
            </h3>
            <button class="nav-to-lending text-xs text-emerald-400 hover:text-emerald-300 font-medium">
              View All (${activeLoans.length}) →
            </button>
          </div>

          <div class="space-y-2.5">
            ${activeLoans.slice(0, 4).map(l => `
              <div class="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <div>
                  <div class="font-semibold text-sm text-white">${l.borrowerName}</div>
                  <div class="text-xs text-slate-400">Due: <span class="font-mono text-slate-300">${formatDate(l.returnDueDate)}</span></div>
                </div>
                <div class="text-right">
                  <div class="font-bold text-white font-mono">${formatINR(l.principal)}</div>
                  <div class="text-[11px] text-emerald-400">+${formatINR(l.interestAmount)} return</div>
                </div>
              </div>
            `).join('') || '<div class="text-xs text-slate-500 py-4 text-center">No active loans</div>'}
          </div>
        </div>

        <!-- Recent Interest Ledger Logs -->
        <div class="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-slate-200 text-sm flex items-center gap-2">
              <span>⚡</span> Recent Interest Receipts
            </h3>
            <button class="dash-view-ledger-btn text-xs text-cyan-400 hover:text-cyan-300 font-medium">
              Full Ledger (${ledger.length}) →
            </button>
          </div>

          <div class="space-y-2.5">
            ${ledger.slice(0, 4).map(e => `
              <div class="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <div>
                  <div class="font-semibold text-sm text-white">${e.borrowerName}</div>
                  <div class="text-[11px] text-slate-400">${formatDate(e.dateCollected)} • ${e.type === 'rollover' ? 'Rollover' : 'Settlement'}</div>
                </div>
                <div class="text-right">
                  <div class="font-bold text-emerald-400 font-mono">+${formatINR(e.amount)}</div>
                </div>
              </div>
            `).join('') || '<div class="text-xs text-slate-500 py-4 text-center">No interest collected yet</div>'}
          </div>
        </div>
      </div>
    `;

    // Attach listeners
    this.container.querySelector('.dash-new-loan-btn')?.addEventListener('click', () => {
      window.credipulseApp?.switchToView('lending');
      window.credipulseApp?.lendingEngine?.openAddModal();
    });

    this.container.querySelectorAll('.dash-view-ledger-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        window.credipulseApp?.openLedger();
      });
    });

    this.container.querySelectorAll('.nav-to-lending').forEach(btn => {
      btn.addEventListener('click', () => {
        window.credipulseApp?.switchToView('lending');
      });
    });
  }
}
