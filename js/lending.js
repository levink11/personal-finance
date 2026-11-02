/**
 * Peer-Lending Engine Core Module
 * Minimalist Row-Based UI with Action Dropdowns and End Results Summary
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
    this.sortBy = 'dateLent_desc';
    this.calculator = null;
    this.activeLoanForAction = null;
    this.openDropdownId = null;

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

    // Controls
    this.searchInput = document.getElementById('loan-search-input');
    this.statusSelect = document.getElementById('filter-status-select');
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

    // Calculator instance
    this.calculator = new LoanCalculator({
      principal: document.getElementById('loan-principal'),
      rate: document.getElementById('loan-rate'),
      amount: document.getElementById('loan-interest-amount'),
      type: document.getElementById('loan-calc-type'),
      dateLent: document.getElementById('loan-date-lent'),
      dueDate: document.getElementById('loan-due-date'),
      tenureDisplay: document.getElementById('tenure-badge-display'),
      totalRepaymentDisplay: document.getElementById('calc-total-repay')
    });
  }

  initEventListeners() {
    // Search
    this.searchInput?.addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase().trim();
      this.render();
    });

    // Filter select dropdown
    this.statusSelect?.addEventListener('change', (e) => {
      this.statusFilter = e.target.value;
      this.render();
    });

    // Sort select dropdown
    this.sortSelect?.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.render();
    });

    // Close open action dropdowns when clicking anywhere outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.row-dropdown-wrapper')) {
        this.closeAllDropdowns();
      }
    });

    // Presets in Add/Edit Modal
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

    // Save Loan Form
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

    // Rollover due date input change
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

    // Settlement interest input updates total
    document.getElementById('settle-interest-received')?.addEventListener('input', () => {
      this.updateSettleTotal();
    });

    // Auto-refresh when state updates
    state.subscribe(() => {
      this.render();
    });
  }

  closeAllDropdowns() {
    document.querySelectorAll('.row-actions-dropdown').forEach(d => d.classList.add('hidden'));
    this.openDropdownId = null;
  }

  // Open modal for creating new loan
  openAddModal() {
    this.editingLoanIdInput.value = '';
    this.modalTitle.textContent = 'Add New Loan';
    document.getElementById('loan-borrower').value = '';
    document.getElementById('loan-notes').value = '';
    
    const today = getTodayStr();
    this.calculator.reset(0, today, 30);
    
    this.showModal('loan-form-modal');
  }

  // Open modal for editing existing loan
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

  // Save (Create / Update) Loan
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
      showToast('Please choose valid lending and due dates', 'warning');
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
      showToast(`Updated ${borrowerName}`, 'success');
    } else {
      state.addLoan(payload);
      showToast(`Added loan for ${borrowerName}`, 'success');
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

    const defaultNewDue = addMonths(loan.returnDueDate, 1);
    document.getElementById('rollover-new-due').value = defaultNewDue;
    document.getElementById('rollover-interest-received').value = loan.interestAmount || 0;
    document.getElementById('rollover-date-collected').value = getTodayStr();
    document.getElementById('rollover-notes').value = `Rollover interest for cycle ending ${formatDate(loan.returnDueDate)}`;

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

  handleConfirmRollover() {
    if (!this.activeLoanForAction) return;

    const loanId = this.activeLoanForAction.id;
    const newDueDate = document.getElementById('rollover-new-due').value;
    const interestCollected = parseFloat(document.getElementById('rollover-interest-received').value) || 0;
    const dateCollected = document.getElementById('rollover-date-collected').value || getTodayStr();
    const notes = document.getElementById('rollover-notes').value.trim();

    if (!newDueDate) {
      showToast('Please specify a new due date', 'warning');
      return;
    }

    state.rolloverLoan(loanId, newDueDate, interestCollected, notes, dateCollected);
    showToast(`Rollover confirmed: ₹${interestCollected} logged into ledger`, 'success');
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
    if (totalEl) totalEl.textContent = formatINR(total);
  }

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

  reopenSettledLoan(loanId) {
    const loan = state.getLoanById(loanId);
    if (!loan) return;

    if (confirm(`Move "${loan.borrowerName}" back to Active loans?`)) {
      state.reopenLoan(loanId);
      showToast(`Loan reopened for ${loan.borrowerName}`, 'info');
    }
  }

  deleteLoanPrompt(loanId) {
    const loan = state.getLoanById(loanId);
    if (!loan) return;

    if (confirm(`Delete loan record for "${loan.borrowerName}"?`)) {
      state.deleteLoan(loanId);
      showToast('Loan record deleted', 'info');
    }
  }

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

  // Filtering & Sorting
  getFilteredActiveLoans() {
    const today = getTodayStr();
    let loans = state.getLoans().filter(l => l.status === 'active' || l.status === 'extended');

    if (this.searchTerm) {
      loans = loans.filter(l =>
        l.borrowerName.toLowerCase().includes(this.searchTerm) ||
        (l.notes && l.notes.toLowerCase().includes(this.searchTerm))
      );
    }

    if (this.statusFilter === 'active') {
      loans = loans.filter(l => l.status === 'active');
    } else if (this.statusFilter === 'extended') {
      loans = loans.filter(l => l.status === 'extended');
    } else if (this.statusFilter === 'overdue') {
      loans = loans.filter(l => l.returnDueDate < today);
    }

    // Default: Newest to Oldest by Date Lent
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

  getFilteredSettledLoans() {
    let loans = state.getLoans().filter(l => l.status === 'settled');

    if (this.searchTerm) {
      loans = loans.filter(l =>
        l.borrowerName.toLowerCase().includes(this.searchTerm) ||
        (l.notes && l.notes.toLowerCase().includes(this.searchTerm))
      );
    }

    // Settled: Newest to Oldest by Settlement Date
    loans.sort((a, b) => {
      const dateA = a.settledAt || a.dateLent || '';
      const dateB = b.settledAt || b.dateLent || '';
      return dateB.localeCompare(dateA);
    });

    return loans;
  }

  render() {
    this.renderActiveRows();
    this.renderSettledRows();
    this.renderMajorResults();
  }

  // Render Section 1: Active Receivables as clean rows with dropdowns
  renderActiveRows() {
    if (!this.activeLoansContainer) return;

    const today = getTodayStr();
    const loans = this.getFilteredActiveLoans();

    if (this.activeCountBadge) this.activeCountBadge.textContent = loans.length;

    if (loans.length === 0) {
      this.activeLoansContainer.innerHTML = `
        <div class="py-8 text-center text-xs text-slate-500 rounded-lg border border-dashed border-slate-800 bg-slate-900/30">
          ${this.searchTerm ? 'No loans match your search.' : 'No active loans. Click "+ New Loan" to record one.'}
        </div>
      `;
      return;
    }

    const html = loans.map(loan => {
      const daysDiff = getDaysDiff(today, loan.returnDueDate);
      const tenureDays = getDaysDiff(loan.dateLent, loan.returnDueDate);
      const isOverdue = daysDiff < 0;
      const isToday = daysDiff === 0;

      let dueBadge = '';
      if (isOverdue) {
        dueBadge = `<span class="inline-flex items-center text-[11px] font-bold text-rose-400">🚨 Overdue ${Math.abs(daysDiff)}d</span>`;
      } else if (isToday) {
        dueBadge = `<span class="inline-flex items-center text-[11px] font-bold text-amber-400">⚡ Due Today</span>`;
      } else {
        dueBadge = `<span class="inline-flex items-center text-[11px] text-slate-400">⏳ ${daysDiff}d left</span>`;
      }

      const statusChip = loan.status === 'extended'
        ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">Ext (${loan.rolloverCount || 1}x)</span>`
        : `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">Active</span>`;

      const totalReturn = (Number(loan.principal) || 0) + (Number(loan.interestAmount) || 0);

      return `
        <!-- Single Loan Row -->
        <div class="loan-row rounded-lg border border-slate-800/80 bg-slate-900/80 p-3 sm:px-4 sm:py-2.5">
          
          <div class="grid grid-cols-2 md:grid-cols-12 gap-2 md:gap-3 items-center">
            
            <!-- Col 1: Borrower Name & Notes trigger -->
            <div class="col-span-2 md:col-span-3 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-bold text-sm text-white truncate" title="${loan.borrowerName}">
                  ${loan.borrowerName}
                </span>
                <span class="md:hidden">${statusChip}</span>
              </div>
              <div class="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                <span>Lent: ${formatDate(loan.dateLent)}</span>
                ${loan.notes ? `<span class="text-slate-500 italic">• "${loan.notes}"</span>` : ''}
              </div>
            </div>

            <!-- Col 2: Principal -->
            <div class="col-span-1 md:col-span-2 text-left md:text-right">
              <span class="text-[10px] uppercase text-slate-500 block md:hidden">Principal</span>
              <span class="font-bold text-sm text-white font-mono">${formatINR(loan.principal)}</span>
            </div>

            <!-- Col 3: Due Date & Tenure -->
            <div class="col-span-1 md:col-span-3 text-right md:text-left">
              <div class="text-xs text-slate-200 font-mono font-medium">${formatDate(loan.returnDueDate)}</div>
              <div class="flex items-center justify-end md:justify-start gap-1.5">
                ${dueBadge}
                <span class="text-[10px] text-slate-500">• ${tenureDays}d tenure</span>
              </div>
            </div>

            <!-- Col 4: Interest -->
            <div class="col-span-1 md:col-span-2 text-left md:text-right">
              <span class="text-[10px] uppercase text-slate-500 block md:hidden">Interest</span>
              <div class="text-xs font-bold text-emerald-400 font-mono">+${formatINR(loan.interestAmount)}</div>
              <div class="text-[10px] text-slate-400">${loan.interestRate ? `${loan.interestRate}%` : 'Flat'} • Total: ${formatINR(totalReturn)}</div>
            </div>

            <!-- Col 5: Status (Desktop) -->
            <div class="hidden md:block col-span-1 text-center">
              ${statusChip}
            </div>

            <!-- Col 6: Dropdown Actions Trigger -->
            <div class="col-span-1 md:col-span-1 flex justify-end relative row-dropdown-wrapper">
              <button 
                type="button" 
                class="dropdown-toggle-btn px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1 border border-slate-700 transition"
                data-loan-id="${loan.id}"
              >
                <span>Actions</span>
                <span class="text-[9px]">▼</span>
              </button>

              <!-- Dropdown Menu Box -->
              <div id="dropdown-${loan.id}" class="row-actions-dropdown hidden absolute right-0 top-full mt-1 z-30 w-44 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1 text-xs">
                <button class="action-rollover w-full text-left px-3 py-2 text-cyan-300 hover:bg-slate-800 flex items-center gap-2" data-id="${loan.id}">
                  <span>🔄</span> 1-Click Rollover
                </button>
                <button class="action-settle w-full text-left px-3 py-2 text-emerald-300 hover:bg-slate-800 flex items-center gap-2 font-medium" data-id="${loan.id}">
                  <span>✅</span> Settle Loan
                </button>
                <div class="border-t border-slate-800 my-1"></div>
                <button class="action-history w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 flex items-center gap-2" data-id="${loan.id}">
                  <span>📜</span> View Ledger
                </button>
                <button class="action-edit w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 flex items-center gap-2" data-id="${loan.id}">
                  <span>✏️</span> Edit Details
                </button>
                <button class="action-delete w-full text-left px-3 py-1.5 text-rose-400 hover:bg-slate-800 flex items-center gap-2" data-id="${loan.id}">
                  <span>🗑️</span> Delete
                </button>
              </div>
            </div>

          </div>

        </div>
      `;
    }).join('');

    this.activeLoansContainer.innerHTML = html;
    this.attachActiveDropdownListeners();
  }

  attachActiveDropdownListeners() {
    // Dropdown toggles
    this.activeLoansContainer.querySelectorAll('.dropdown-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const loanId = e.currentTarget.getAttribute('data-loan-id');
        const dropdown = document.getElementById(`dropdown-${loanId}`);

        // Close other dropdowns
        document.querySelectorAll('.row-actions-dropdown').forEach(d => {
          if (d !== dropdown) d.classList.add('hidden');
        });

        if (dropdown) {
          dropdown.classList.toggle('hidden');
        }
      });
    });

    // Action handlers inside dropdowns
    this.activeLoansContainer.querySelectorAll('.action-rollover').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.closeAllDropdowns();
        this.openRolloverModal(id);
      });
    });

    this.activeLoansContainer.querySelectorAll('.action-settle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.closeAllDropdowns();
        this.openSettleModal(id);
      });
    });

    this.activeLoansContainer.querySelectorAll('.action-history').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.closeAllDropdowns();
        window.credipulseApp?.openLedger(id);
      });
    });

    this.activeLoansContainer.querySelectorAll('.action-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.closeAllDropdowns();
        this.openEditModal(id);
      });
    });

    this.activeLoansContainer.querySelectorAll('.action-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.closeAllDropdowns();
        this.deleteLoanPrompt(id);
      });
    });
  }

  // Render Section 2: Settled Loans (Dimmed rows at the bottom)
  renderSettledRows() {
    if (!this.settledLoansContainer) return;

    const settled = this.getFilteredSettledLoans();
    if (this.settledCountBadge) this.settledCountBadge.textContent = settled.length;

    if (settled.length === 0) {
      this.settledLoansContainer.innerHTML = `
        <div class="py-4 text-center text-xs text-slate-600">
          No settled loans recorded yet.
        </div>
      `;
      return;
    }

    const html = settled.map(loan => {
      const loanLedger = state.getLedgerForLoan(loan.id);
      const lifetimeInterest = loanLedger.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || (loan.settledInterestCollected || loan.interestAmount || 0);

      return `
        <!-- Settled Row (50% dimmed, strikethrough) -->
        <div class="settled-row rounded-lg border border-slate-800 bg-slate-900/40 p-2.5 sm:px-4 sm:py-2 text-xs">
          
          <div class="flex items-center justify-between gap-2">
            
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-slate-400 line-through truncate">${loan.borrowerName}</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-500">✓ Settled</span>
              </div>
              <div class="text-[11px] text-slate-500">
                Closed: ${formatDate(loan.settledAt || loan.returnDueDate)} • Earned: <strong class="text-emerald-400/80 font-mono">+${formatINR(lifetimeInterest)}</strong>
              </div>
            </div>

            <div class="text-right font-mono font-bold text-slate-400 text-xs sm:text-sm shrink-0">
              ${formatINR(loan.principal)}
            </div>

            <!-- Action Dropdown for Settled Row -->
            <div class="relative row-dropdown-wrapper shrink-0">
              <button 
                type="button" 
                class="dropdown-toggle-btn px-2 py-1 rounded bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white text-[11px] flex items-center gap-1"
                data-loan-id="${loan.id}"
              >
                <span>Actions</span>
                <span class="text-[8px]">▼</span>
              </button>

              <div id="dropdown-${loan.id}" class="row-actions-dropdown hidden absolute right-0 top-full mt-1 z-30 w-36 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1 text-xs">
                <button class="action-history w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800" data-id="${loan.id}">
                  📜 View Ledger
                </button>
                <button class="action-reopen w-full text-left px-3 py-1.5 text-cyan-300 hover:bg-slate-800" data-id="${loan.id}">
                  ↩ Reopen Loan
                </button>
                <button class="action-delete w-full text-left px-3 py-1.5 text-rose-400 hover:bg-slate-800" data-id="${loan.id}">
                  🗑️ Delete
                </button>
              </div>
            </div>

          </div>

        </div>
      `;
    }).join('');

    this.settledLoansContainer.innerHTML = html;
    this.attachSettledDropdownListeners();
  }

  attachSettledDropdownListeners() {
    this.settledLoansContainer.querySelectorAll('.dropdown-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const loanId = e.currentTarget.getAttribute('data-loan-id');
        const dropdown = document.getElementById(`dropdown-${loanId}`);

        document.querySelectorAll('.row-actions-dropdown').forEach(d => {
          if (d !== dropdown) d.classList.add('hidden');
        });

        if (dropdown) dropdown.classList.toggle('hidden');
      });
    });

    this.settledLoansContainer.querySelectorAll('.action-history').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.closeAllDropdowns();
        window.credipulseApp?.openLedger(id);
      });
    });

    this.settledLoansContainer.querySelectorAll('.action-reopen').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.closeAllDropdowns();
        this.reopenSettledLoan(id);
      });
    });

    this.settledLoansContainer.querySelectorAll('.action-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.closeAllDropdowns();
        this.deleteLoanPrompt(id);
      });
    });
  }

  // Render Section 3: Major Results at the End
  renderMajorResults() {
    const stats = state.getStats();

    // Summary at section headers
    if (this.activePrincipalTotal) this.activePrincipalTotal.textContent = formatINR(stats.totalActivePrincipal);
    if (this.settledPrincipalTotal) this.settledPrincipalTotal.textContent = formatINR(stats.totalSettledPrincipal);

    // Major Results at the End of the Page
    const rActiveLent = document.getElementById('result-active-lent');
    const rActiveCount = document.getElementById('result-active-count');
    const rInterestColl = document.getElementById('result-interest-collected');
    const rSettledLent = document.getElementById('result-settled-lent');
    const rSettledCount = document.getElementById('result-settled-count');
    const rNetWorth = document.getElementById('result-net-worth');

    if (rActiveLent) rActiveLent.textContent = formatINR(stats.totalActivePrincipal);
    if (rActiveCount) rActiveCount.textContent = `${stats.activeCount} active loans (${stats.overdueCount} overdue)`;
    if (rInterestColl) rInterestColl.textContent = `+${formatINR(stats.totalInterestCollected)}`;
    if (rSettledLent) rSettledLent.textContent = formatINR(stats.totalSettledPrincipal);
    if (rSettledCount) rSettledCount.textContent = `${stats.settledCount} closed loans`;
    if (rNetWorth) rNetWorth.textContent = formatINR(stats.netWorth);
  }
}
