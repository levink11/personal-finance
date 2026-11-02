/**
 * Peer-Lending Engine Core Module
 * Manages two-tier rendering, loan modals, rollover flows, and settlements.
 */

import { state } from './state.js';
import { LoanCalculator } from './calculator.js';
import {
  formatINR,
  formatDate,
  getDaysDiff,
  getTodayStr,
  addDays,
  addMonths,
  showToast,
  fireConfetti
} from './utils.js';

export class PeerLendingEngine {
  constructor() {
    this.searchTerm = '';
    this.statusFilter = 'all'; // 'all', 'active', 'extended', 'overdue'
    this.sortBy = 'dateLent_desc'; // 'dateLent_desc', 'dateLent_asc', 'dueDate_asc', 'principal_desc'
    this.calculator = null;
    this.activeLoanForAction = null; // currently targeted loan in modal

    this.initDOMElements();
    this.initEventListeners();
    this.render();
  }

  initDOMElements() {
    // Containers
    this.activeLoansContainer = document.getElementById('active-loans-list');
    this.settledLoansContainer = document.getElementById('settled-loans-list');
    this.activeCountBadge = document.getElementById('active-loans-count');
    this.settledCountBadge = document.getElementById('settled-loans-count');
    this.activePrincipalTotal = document.getElementById('active-principal-sum');
    this.settledPrincipalTotal = document.getElementById('settled-principal-sum');

    // Filter & Search
    this.searchInput = document.getElementById('loan-search-input');
    this.filterButtons = document.querySelectorAll('.filter-status-btn');
    this.sortSelect = document.getElementById('loan-sort-select');

    // Loan Form Modal
    this.loanModal = document.getElementById('loan-form-modal');
    this.loanForm = document.getElementById('loan-form');
    this.modalTitle = document.getElementById('loan-modal-title');
    this.editingLoanIdInput = document.getElementById('loan-id-hidden');

    // Rollover Modal
    this.rolloverModal = document.getElementById('rollover-modal');
    this.rolloverForm = document.getElementById('rollover-form');

    // Settlement Modal
    this.settleModal = document.getElementById('settle-modal');
    this.settleForm = document.getElementById('settle-form');

    // Initialize Calculator instance
    this.calculator = new LoanCalculator({
      principal: document.getElementById('loan-principal'),
      rate: document.getElementById('loan-rate'),
      amount: document.getElementById('loan-interest-amount'),
      type: document.getElementById('loan-calc-type'),
      dateLent: document.getElementById('loan-date-lent'),
      dueDate: document.getElementById('loan-due-date'),
      tenureDisplay: document.getElementById('tenure-badge-display'),
      totalRepaymentDisplay: document.getElementById('calc-total-repay'),
      dailyReturnDisplay: document.getElementById('calc-daily-return')
    });
  }

  initEventListeners() {
    // Search input
    this.searchInput?.addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase().trim();
      this.render();
    });

    // Status filter buttons
    this.filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.filterButtons.forEach(b => {
          b.classList.remove('bg-emerald-500', 'text-slate-950', 'font-semibold', 'shadow-md');
          b.classList.add('bg-slate-800/80', 'text-slate-300');
        });
        const target = e.currentTarget;
        target.classList.remove('bg-slate-800/80', 'text-slate-300');
        target.classList.add('bg-emerald-500', 'text-slate-950', 'font-semibold', 'shadow-md');
        this.statusFilter = target.getAttribute('data-status') || 'all';
        this.render();
      });
    });

    // Sort order
    this.sortSelect?.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.render();
    });

    // Quick Presets in Loan Modal
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.currentTarget.getAttribute('data-preset');
        this.calculator.applyPreset(preset);
      });
    });

    // Open Add Loan Modal
    document.querySelectorAll('.open-add-loan-btn').forEach(btn => {
      btn.addEventListener('click', () => this.openAddModal());
    });

    // Save Loan Form Submit
    this.loanForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSaveLoan();
    });

    // Rollover Presets
    document.querySelectorAll('.rollover-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const days = parseInt(e.currentTarget.getAttribute('data-days'), 10);
        const baseDate = document.getElementById('rollover-current-due').value || getTodayStr();
        const newDueInput = document.getElementById('rollover-new-due');
        if (newDueInput) {
          newDueInput.value = addDays(baseDate, days);
          this.updateRolloverTenurePreview();
        }
      });
    });

    // Rollover due date change
    document.getElementById('rollover-new-due')?.addEventListener('change', () => {
      this.updateRolloverTenurePreview();
    });

    // Rollover Form Submit
    this.rolloverForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleConfirmRollover();
    });

    // Settlement Form Submit
    this.settleForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleConfirmSettlement();
    });

    // Settle interest amount change -> updates total
    document.getElementById('settle-interest-received')?.addEventListener('input', () => {
      this.updateSettleTotal();
    });

    // Listen to state changes to auto-refresh UI
    state.subscribe(() => {
      this.render();
    });
  }

  // Open modal for creating a new loan
  openAddModal() {
    this.editingLoanIdInput.value = '';
    this.modalTitle.textContent = 'Add New Loan Receivable';
    document.getElementById('loan-borrower').value = '';
    document.getElementById('loan-notes').value = '';
    
    const today = getTodayStr();
    this.calculator.reset(0, today, 30);
    
    this.showModal('loan-form-modal');
  }

  // Open modal for editing an existing loan
  openEditModal(loanId) {
    const loan = state.getLoanById(loanId);
    if (!loan) return;

    this.editingLoanIdInput.value = loan.id;
    this.modalTitle.textContent = `Edit Loan: ${loan.borrowerName}`;
    document.getElementById('loan-borrower').value = loan.borrowerName;
    document.getElementById('loan-principal').value = loan.principal;
    document.getElementById('loan-date-lent').value = loan.dateLent;
    document.getElementById('loan-due-date').value = loan.returnDueDate;
    document.getElementById('loan-calc-type').value = loan.interestType || 'flat';
    document.getElementById('loan-rate').value = loan.interestRate || '';
    document.getElementById('loan-interest-amount').value = loan.interestAmount || '';
    document.getElementById('loan-notes').value = loan.notes || '';

    this.calculator.updateSummary();
    this.showModal('loan-form-modal');
  }

  // Save (Create or Update) Loan
  handleSaveLoan() {
    const borrowerName = document.getElementById('loan-borrower').value.trim();
    const principal = parseFloat(document.getElementById('loan-principal').value) || 0;
    const dateLent = document.getElementById('loan-date-lent').value;
    const returnDueDate = document.getElementById('loan-due-date').value;
    const interestType = document.getElementById('loan-calc-type').value;
    const interestRate = parseFloat(document.getElementById('loan-rate').value) || 0;
    const interestAmount = parseFloat(document.getElementById('loan-interest-amount').value) || 0;
    const notes = document.getElementById('loan-notes').value.trim();
    const editingId = this.editingLoanIdInput.value;

    if (!borrowerName) {
      showToast('Please enter the borrower name', 'warning');
      return;
    }
    if (principal <= 0) {
      showToast('Please enter a valid principal amount', 'warning');
      return;
    }
    if (!dateLent || !returnDueDate) {
      showToast('Please specify valid lending and return dates', 'warning');
      return;
    }

    const payload = {
      borrowerName,
      principal,
      dateLent,
      returnDueDate,
      interestType,
      interestRate,
      interestAmount,
      notes
    };

    if (editingId) {
      state.updateLoan(editingId, payload);
      showToast(`Updated loan for ${borrowerName}`, 'success');
    } else {
      state.addLoan(payload);
      showToast(`Recorded new loan of ${formatINR(principal)} to ${borrowerName}`, 'success');
    }

    this.hideModal('loan-form-modal');
  }

  // Open 1-Click Rollover Modal
  openRolloverModal(loanId) {
    const loan = state.getLoanById(loanId);
    if (!loan) return;
    this.activeLoanForAction = loan;

    document.getElementById('rollover-loan-id').value = loan.id;
    document.getElementById('rollover-borrower-name').textContent = loan.borrowerName;
    document.getElementById('rollover-principal-display').textContent = formatINR(loan.principal);
    document.getElementById('rollover-current-due').value = loan.returnDueDate;
    document.getElementById('rollover-current-due-display').textContent = formatDate(loan.returnDueDate);

    // Default new due date to +1 Month from current due date
    const defaultNewDue = addMonths(loan.returnDueDate, 1);
    document.getElementById('rollover-new-due').value = defaultNewDue;

    // Default interest received to current cycle's expected interest
    document.getElementById('rollover-interest-received').value = loan.interestAmount || 0;
    document.getElementById('rollover-date-collected').value = getTodayStr();
    document.getElementById('rollover-notes').value = `Rollover interest received for period ending ${formatDate(loan.returnDueDate)}`;

    this.updateRolloverTenurePreview();
    this.showModal('rollover-modal');
  }

  updateRolloverTenurePreview() {
    const currentDue = document.getElementById('rollover-current-due').value;
    const newDue = document.getElementById('rollover-new-due').value;
    const previewEl = document.getElementById('rollover-tenure-preview');

    if (previewEl && currentDue && newDue) {
      const addedDays = getDaysDiff(currentDue, newDue);
      if (addedDays <= 0) {
        previewEl.textContent = 'Invalid (must be after current due)';
        previewEl.className = 'text-xs text-rose-400 font-medium';
      } else {
        previewEl.textContent = `+${addedDays} Days extended`;
        previewEl.className = 'text-xs text-emerald-400 font-medium';
      }
    }
  }

  // Confirm Rollover
  handleConfirmRollover() {
    if (!this.activeLoanForAction) return;

    const loanId = this.activeLoanForAction.id;
    const newDueDate = document.getElementById('rollover-new-due').value;
    const interestCollected = parseFloat(document.getElementById('rollover-interest-received').value) || 0;
    const dateCollected = document.getElementById('rollover-date-collected').value || getTodayStr();
    const notes = document.getElementById('rollover-notes').value.trim();

    if (!newDueDate) {
      showToast('Please select a valid new due date', 'warning');
      return;
    }

    state.rolloverLoan(loanId, newDueDate, interestCollected, notes, dateCollected);
    showToast(`Rollover recorded! ₹${interestCollected} added to Total Interest Collected.`, 'success');
    this.hideModal('rollover-modal');
  }

  // Open Settlement Modal
  openSettleModal(loanId) {
    const loan = state.getLoanById(loanId);
    if (!loan) return;
    this.activeLoanForAction = loan;

    document.getElementById('settle-loan-id').value = loan.id;
    document.getElementById('settle-borrower-name').textContent = loan.borrowerName;
    document.getElementById('settle-principal-amount').textContent = formatINR(loan.principal);
    document.getElementById('settle-due-date-display').textContent = formatDate(loan.returnDueDate);

    // Pre-fill final cycle accrued interest with loan's interest amount
    const interestInput = document.getElementById('settle-interest-received');
    interestInput.value = loan.interestAmount || 0;

    document.getElementById('settle-date').value = getTodayStr();
    document.getElementById('settle-notes').value = 'Full principal and final interest returned';

    this.updateSettleTotal();
    this.showModal('settle-modal');
  }

  updateSettleTotal() {
    if (!this.activeLoanForAction) return;
    const principal = Number(this.activeLoanForAction.principal) || 0;
    const interest = parseFloat(document.getElementById('settle-interest-received').value) || 0;
    const total = principal + interest;

    const totalEl = document.getElementById('settle-total-received');
    if (totalEl) {
      totalEl.textContent = formatINR(total);
    }
  }

  // Confirm Settlement
  handleConfirmSettlement() {
    if (!this.activeLoanForAction) return;

    const loanId = this.activeLoanForAction.id;
    const finalInterest = parseFloat(document.getElementById('settle-interest-received').value) || 0;
    const settleDate = document.getElementById('settle-date').value || getTodayStr();
    const notes = document.getElementById('settle-notes').value.trim();

    state.settleLoan(loanId, finalInterest, settleDate, notes);
    fireConfetti();
    showToast(`Loan settled! Collected ${formatINR(this.activeLoanForAction.principal + finalInterest)}.`, 'success');
    this.hideModal('settle-modal');
  }

  // Reopen settled loan
  reopenSettledLoan(loanId) {
    const loan = state.getLoanById(loanId);
    if (!loan) return;

    if (confirm(`Reopen loan for ${loan.borrowerName}? This will move it back to Active status.`)) {
      state.reopenLoan(loanId);
      showToast(`Loan reopened for ${loan.borrowerName}`, 'info');
    }
  }

  // Delete loan
  deleteLoanPrompt(loanId) {
    const loan = state.getLoanById(loanId);
    if (!loan) return;

    if (confirm(`Permanently delete loan record for "${loan.borrowerName}" (${formatINR(loan.principal)})?`)) {
      state.deleteLoan(loanId);
      showToast('Loan record deleted', 'info');
    }
  }

  // Helper modal display
  showModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('hidden');
      el.classList.add('flex');
    }
  }

  hideModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  }

  // Get active / extended loans with sorting and filtering
  getFilteredActiveLoans() {
    const today = getTodayStr();
    let loans = state.getLoans().filter(l => l.status === 'active' || l.status === 'extended');

    // Filter by search
    if (this.searchTerm) {
      loans = loans.filter(l =>
        l.borrowerName.toLowerCase().includes(this.searchTerm) ||
        (l.notes && l.notes.toLowerCase().includes(this.searchTerm))
      );
    }

    // Filter by status tab
    if (this.statusFilter === 'active') {
      loans = loans.filter(l => l.status === 'active');
    } else if (this.statusFilter === 'extended') {
      loans = loans.filter(l => l.status === 'extended');
    } else if (this.statusFilter === 'overdue') {
      loans = loans.filter(l => l.returnDueDate < today);
    }

    // Top Section Sorting: Default Newest to Oldest by Date Lent
    loans.sort((a, b) => {
      switch (this.sortBy) {
        case 'dateLent_asc':
          return (a.dateLent || '').localeCompare(b.dateLent || '');
        case 'dueDate_asc':
          return (a.returnDueDate || '').localeCompare(b.returnDueDate || '');
        case 'dueDate_desc':
          return (b.returnDueDate || '').localeCompare(a.returnDueDate || '');
        case 'principal_desc':
          return (b.principal || 0) - (a.principal || 0);
        case 'principal_asc':
          return (a.principal || 0) - (b.principal || 0);
        case 'dateLent_desc':
        default:
          return (b.dateLent || '').localeCompare(a.dateLent || '');
      }
    });

    return loans;
  }

  // Get settled loans sorted Newest to Oldest by Settlement Date
  getFilteredSettledLoans() {
    let loans = state.getLoans().filter(l => l.status === 'settled');

    if (this.searchTerm) {
      loans = loans.filter(l =>
        l.borrowerName.toLowerCase().includes(this.searchTerm) ||
        (l.notes && l.notes.toLowerCase().includes(this.searchTerm))
      );
    }

    // Bottom Section Sorting: Newest to Oldest by Settlement Date (or dateLent fallback)
    loans.sort((a, b) => {
      const dateA = a.settledAt || a.dateLent || '';
      const dateB = b.settledAt || b.dateLent || '';
      return dateB.localeCompare(dateA);
    });

    return loans;
  }

  // Render both sections
  render() {
    this.renderActiveSection();
    this.renderSettledSection();
    this.updateStatsBar();
  }

  // Update top summary cards
  updateStatsBar() {
    const stats = state.getStats();

    const activeSumEl = document.getElementById('stat-active-lent');
    const interestSumEl = document.getElementById('stat-interest-collected');
    const activeCountEl = document.getElementById('stat-active-count');
    const overdueStatEl = document.getElementById('stat-overdue-count');

    if (activeSumEl) activeSumEl.textContent = formatINR(stats.totalActivePrincipal);
    if (interestSumEl) interestSumEl.textContent = formatINR(stats.totalInterestCollected);
    if (activeCountEl) activeCountEl.textContent = `${stats.activeCount} active`;
    if (overdueStatEl) {
      overdueStatEl.textContent = `${stats.overdueCount} overdue`;
      if (stats.overdueCount > 0) {
        overdueStatEl.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30';
      } else {
        overdueStatEl.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-700/40 text-slate-400';
      }
    }

    if (this.activePrincipalTotal) this.activePrincipalTotal.textContent = formatINR(stats.totalActivePrincipal);
    if (this.settledPrincipalTotal) this.settledPrincipalTotal.textContent = formatINR(stats.totalSettledPrincipal);
  }

  // Render Top Section: Active & Extended Loans
  renderActiveSection() {
    if (!this.activeLoansContainer) return;

    const today = getTodayStr();
    const loans = this.getFilteredActiveLoans();

    if (this.activeCountBadge) {
      this.activeCountBadge.textContent = loans.length;
    }

    if (loans.length === 0) {
      this.activeLoansContainer.innerHTML = `
        <div class="col-span-full py-12 px-4 text-center rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/40">
          <div class="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3 text-emerald-400 text-2xl">
            🤝
          </div>
          <h3 class="text-base font-semibold text-slate-200 mb-1">No Active Loans</h3>
          <p class="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            ${this.searchTerm ? 'No loans match your search filter.' : 'All clear! You currently have no outstanding money lent.'}
          </p>
          <button class="open-add-loan-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs shadow-lg shadow-emerald-950/40 transition">
            <span>+</span> Record New Loan
          </button>
        </div>
      `;
      this.activeLoansContainer.querySelector('.open-add-loan-btn')?.addEventListener('click', () => this.openAddModal());
      return;
    }

    const html = loans.map(loan => {
      const daysDiff = getDaysDiff(today, loan.returnDueDate);
      const tenureTotalDays = getDaysDiff(loan.dateLent, loan.returnDueDate);
      const isOverdue = daysDiff < 0;
      const isToday = daysDiff === 0;

      let dueBadge = '';
      if (isOverdue) {
        dueBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">🚨 Overdue by ${Math.abs(daysDiff)}d</span>`;
      } else if (isToday) {
        dueBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">⚡ Due Today</span>`;
      } else {
        dueBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">⏳ ${daysDiff} days left</span>`;
      }

      const statusBadge = loan.status === 'extended'
        ? `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">🔄 Extended (${loan.rolloverCount || 1}x)</span>`
        : `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">● Active</span>`;

      const totalReturn = (Number(loan.principal) || 0) + (Number(loan.interestAmount) || 0);

      return `
        <div class="relative group rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-900/90 border border-slate-700/70 p-4 sm:p-5 shadow-xl hover:border-slate-600 transition-all duration-200">
          
          <!-- Top row: Borrower & Badges -->
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <h3 class="font-bold text-base sm:text-lg text-white truncate" title="${loan.borrowerName}">
                  ${loan.borrowerName}
                </h3>
                ${statusBadge}
              </div>
              <p class="text-xs text-slate-400 flex items-center gap-2">
                <span>Lent: <strong class="text-slate-300">${formatDate(loan.dateLent)}</strong></span>
                <span>•</span>
                <span>Tenure: <strong class="text-slate-300">${tenureTotalDays}d</strong></span>
              </p>
            </div>
            <div class="shrink-0 text-right">
              ${dueBadge}
            </div>
          </div>

          <!-- Middle Metrics Grid -->
          <div class="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 mb-3">
            <div>
              <span class="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Principal Lent</span>
              <span class="text-xl sm:text-2xl font-black text-white tracking-tight">${formatINR(loan.principal)}</span>
            </div>
            <div class="text-right">
              <span class="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Expected Return</span>
              <span class="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">${formatINR(totalReturn)}</span>
            </div>

            <div class="col-span-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <span class="text-slate-400">
                Interest: <strong class="text-slate-200 font-semibold">${loan.interestRate ? `${loan.interestRate}%` : 'Flat'} (${formatINR(loan.interestAmount)})</strong>
              </span>
              <span class="text-slate-400">
                Due Date: <strong class="text-slate-200 font-semibold font-mono">${formatDate(loan.returnDueDate)}</strong>
              </span>
            </div>
          </div>

          <!-- Notes preview if present -->
          ${loan.notes ? `
            <div class="text-xs text-slate-400/90 italic bg-slate-800/30 px-3 py-1.5 rounded-lg mb-3.5 border-l-2 border-slate-600 line-clamp-2">
              "${loan.notes}"
            </div>
          ` : ''}

          <!-- Bottom Action Buttons Toolbar -->
          <div class="flex items-center gap-1.5 sm:gap-2 pt-1 border-t border-slate-800/60">
            <!-- Settle Button -->
            <button class="settle-btn flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-950/30 transition transform active:scale-95" data-id="${loan.id}" title="Settle loan and collect final payment">
              <span>✅</span> Settle
            </button>

            <!-- 1-Click Rollover Button -->
            <button class="rollover-btn flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md shadow-cyan-950/30 transition transform active:scale-95" data-id="${loan.id}" title="Extend due date and collect interest only">
              <span>🔄</span> Rollover
            </button>

            <!-- View Ledger History Button -->
            <button class="view-history-btn p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition" data-id="${loan.id}" title="View Interest Ledger">
              📜
            </button>

            <!-- Edit Button -->
            <button class="edit-btn p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition" data-id="${loan.id}" title="Edit loan details">
              ✏️
            </button>

            <!-- Delete Button -->
            <button class="delete-btn p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition" data-id="${loan.id}" title="Delete loan">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.activeLoansContainer.innerHTML = html;
    this.attachActiveCardListeners();
  }

  attachActiveCardListeners() {
    // Settle button
    this.activeLoansContainer.querySelectorAll('.settle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.openSettleModal(id);
      });
    });

    // Rollover button
    this.activeLoansContainer.querySelectorAll('.rollover-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.openRolloverModal(id);
      });
    });

    // View History button
    this.activeLoansContainer.querySelectorAll('.view-history-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        window.credipulseApp?.openLedger(id);
      });
    });

    // Edit button
    this.activeLoansContainer.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.openEditModal(id);
      });
    });

    // Delete button
    this.activeLoansContainer.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.deleteLoanPrompt(id);
      });
    });
  }

  // Render Bottom Section: Settled Loans (Visually Dimmed)
  renderSettledSection() {
    if (!this.settledLoansContainer) return;

    const settled = this.getFilteredSettledLoans();

    if (this.settledCountBadge) {
      this.settledCountBadge.textContent = settled.length;
    }

    if (settled.length === 0) {
      this.settledLoansContainer.innerHTML = `
        <div class="col-span-full py-6 text-center text-xs text-slate-500">
          No settled loans recorded yet.
        </div>
      `;
      return;
    }

    const html = settled.map(loan => {
      // Calculate lifetime interest collected for this loan from ledger
      const loanLedger = state.getLedgerForLoan(loan.id);
      const lifetimeInterest = loanLedger.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || (loan.settledInterestCollected || loan.interestAmount || 0);

      return `
        <!-- Dimmed styling: 50% opacity, faint gray background, strikethrough/muted styling -->
        <div class="relative group rounded-2xl bg-slate-900/40 hover:bg-slate-900/70 opacity-60 hover:opacity-100 transition-all duration-300 border border-slate-800 p-4">
          <div class="flex items-start justify-between gap-3 mb-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-0.5">
                <h4 class="font-semibold text-slate-300 text-sm line-through decoration-slate-500">
                  ${loan.borrowerName}
                </h4>
                <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                  ✓ Settled
                </span>
              </div>
              <p class="text-[11px] text-slate-500">
                Lent: ${formatDate(loan.dateLent)} • Closed: <span class="text-slate-400 font-mono">${formatDate(loan.settledAt || loan.returnDueDate)}</span>
              </p>
            </div>

            <div class="text-right">
              <span class="text-xs text-slate-500 block uppercase text-[10px]">Returned</span>
              <span class="text-sm font-bold text-slate-300 font-mono">
                ${formatINR(loan.principal)}
              </span>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-950/30 border border-slate-800/40 mb-2">
            <span class="text-slate-500 text-[11px]">
              Lifetime Interest Earned: <strong class="text-emerald-400/80 font-bold">+${formatINR(lifetimeInterest)}</strong>
            </span>
            <span class="text-slate-500 text-[11px]">
              ${loan.rolloverCount ? `${loan.rolloverCount} Rollovers` : 'Zero Rollovers'}
            </span>
          </div>

          <div class="flex items-center justify-end gap-2 text-xs pt-1 border-t border-slate-800/50">
            <button class="view-history-btn text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded bg-slate-800/40 hover:bg-slate-800 transition" data-id="${loan.id}">
              📜 View Ledger
            </button>
            <button class="reopen-btn text-slate-400 hover:text-cyan-300 text-xs px-2 py-1 rounded bg-slate-800/40 hover:bg-slate-800 transition" data-id="${loan.id}">
              ↩ Reopen
            </button>
            <button class="delete-btn text-slate-500 hover:text-rose-400 text-xs px-2 py-1 rounded transition" data-id="${loan.id}">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.settledLoansContainer.innerHTML = html;
    this.attachSettledCardListeners();
  }

  attachSettledCardListeners() {
    this.settledLoansContainer.querySelectorAll('.view-history-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        window.credipulseApp?.openLedger(id);
      });
    });

    this.settledLoansContainer.querySelectorAll('.reopen-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.reopenSettledLoan(id);
      });
    });

    this.settledLoansContainer.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.deleteLoanPrompt(id);
      });
    });
  }
}
