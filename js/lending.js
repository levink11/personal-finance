/**
 * Peer-Lending & Personal Finance Minimalist Engine
 * Clean checklist rows with checkboxes, action dropdowns, visible two-way calculator,
 * yellow theme, and overall percentage return calculations.
 */

import { state, calculateSipProgress } from './state.js';
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
    this.currentPage = 'lent'; // 'lent', 'debts', 'balances', 'sips'
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.activeLoanForAction = null;
    this.showSettled = true;

    // SIP State
    this.sipSearchTerm = '';
    this.sipFilter = 'all';
    this.showStoppedSips = false;

    this.initDOMElements();
    this.initEventListeners();
    this.render();
  }

  initDOMElements() {
    // Lent Page
    this.activeListEl = document.getElementById('lent-active-list');
    this.settledListEl = document.getElementById('lent-settled-list');
    this.settledCountText = document.getElementById('settled-count-text');
    this.settledChevron = document.getElementById('settled-chevron');
    this.searchInput = document.getElementById('lent-search-input');
    this.statusSelect = document.getElementById('lent-status-filter');

    // Debts Page
    this.debtsListEl = document.getElementById('debts-list');

    // Balances Page
    this.accountsListEl = document.getElementById('accounts-list');

    // SIPs Page
    this.sipsActiveListEl = document.getElementById('sips-active-list');
    this.sipsStoppedListEl = document.getElementById('sips-stopped-list');
    this.sipsStoppedCountText = document.getElementById('sips-stopped-count-text');
    this.sipsStoppedChevron = document.getElementById('sips-stopped-chevron');
    this.sipSearchInput = document.getElementById('sips-search-input');
    this.sipStatusFilter = document.getElementById('sips-status-filter');

    // Modals
    this.loanModal = document.getElementById('loan-form-modal');
    this.loanForm = document.getElementById('loan-form');
    this.editingLoanIdInput = document.getElementById('loan-id-hidden');
    this.modalTitle = document.getElementById('loan-modal-title');

    this.rolloverModal = document.getElementById('rollover-modal');
    this.rolloverForm = document.getElementById('rollover-form');

    this.settleModal = document.getElementById('settle-modal');
    this.settleForm = document.getElementById('settle-form');

    this.debtModal = document.getElementById('debt-modal');
    this.debtForm = document.getElementById('debt-form');

    this.accountModal = document.getElementById('account-modal');
    this.accountForm = document.getElementById('account-form');

    this.sipModal = document.getElementById('sip-modal');
    this.sipForm = document.getElementById('sip-form');

    // Calculator in Add Modal
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
    // Tab Navigation (4 Clean Pages)
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        this.switchPage(tab);
      });
    });

    // Page-level + New buttons beside the filter

    document.getElementById('lent-add-btn')?.addEventListener('click', () => {
      this.openAddLoanModal();
    });

    // Add buttons inside individual pages
    document.getElementById('btn-add-debt')?.addEventListener('click', () => this.openAddDebtModal());
    document.getElementById('btn-add-account')?.addEventListener('click', () => this.openAddAccountModal());
    document.getElementById('sip-add-btn')?.addEventListener('click', () => this.openAddSipModal());

    // Search & Filter (Lent)
    this.searchInput?.addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase().trim();
      this.renderLentPage();
    });

    this.statusSelect?.addEventListener('change', (e) => {
      this.statusFilter = e.target.value;
      this.renderLentPage();
    });

    // Search & Filter (SIPs)
    this.sipSearchInput?.addEventListener('input', (e) => {
      this.sipSearchTerm = e.target.value.toLowerCase().trim();
      this.renderSipsPage();
    });

    this.sipStatusFilter?.addEventListener('change', (e) => {
      this.sipFilter = e.target.value;
      this.renderSipsPage();
    });

    // Toggle Stopped SIPs Collapse
    document.getElementById('toggle-stopped-sips-btn')?.addEventListener('click', () => {
      this.showStoppedSips = !this.showStoppedSips;
      if (this.sipsStoppedListEl) {
        this.sipsStoppedListEl.classList.toggle('hidden', !this.showStoppedSips);
      }
      if (this.sipsStoppedChevron) {
        this.sipsStoppedChevron.textContent = this.showStoppedSips ? '▼' : '▶';
      }
    });

    // SIP Form Submit
    this.sipForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSaveSip();
    });

    // Toggle Settled Collapse
    document.getElementById('toggle-settled-btn')?.addEventListener('click', () => {
      this.showSettled = !this.showSettled;
      if (this.settledListEl) {
        this.settledListEl.classList.toggle('hidden', !this.showSettled);
      }
      if (this.settledChevron) {
        this.settledChevron.textContent = this.showSettled ? '▼' : '▶';
      }
    });

    // Close all open row dropdowns on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.row-dropdown-wrapper')) {
        this.closeAllDropdowns();
      }
    });

    // Loan Form Presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.currentTarget.getAttribute('data-preset');
        this.calculator.applyPreset(preset);
      });
    });

    // Loan Form Submit
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
        }
      });
    });

    // Rollover Submit
    this.rolloverForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleConfirmRollover();
    });

    // Settlement Submit
    this.settleForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleConfirmSettlement();
    });

    // Settle interest input changes total
    document.getElementById('settle-interest-received')?.addEventListener('input', () => {
      this.updateSettleTotal();
    });

    // Debt Form Submit
    this.debtForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSaveDebt();
    });

    // Account Form Submit
    this.accountForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSaveAccount();
    });

    // Subscribe to state updates
    state.subscribe(() => {
      this.render();
    });
  }

  switchPage(tabName) {
    this.currentPage = tabName;

    // Toggle active tab buttons with Yellow accent
    document.querySelectorAll('.tab-btn').forEach(btn => {
      const tab = btn.getAttribute('data-tab');
      if (tab === tabName) {
        btn.classList.add('text-yellow-400', 'bg-zinc-800', 'font-semibold');
        btn.classList.remove('text-zinc-400', 'font-medium');
      } else {
        btn.classList.remove('text-yellow-400', 'bg-zinc-800', 'font-semibold');
        btn.classList.add('text-zinc-400', 'font-medium');
      }
    });

    document.querySelectorAll('.page-view').forEach(pv => pv.classList.add('hidden'));
    const targetPage = document.getElementById(`page-${tabName}`);
    if (targetPage) targetPage.classList.remove('hidden');

    this.render();
  }

  closeAllDropdowns() {
    document.querySelectorAll('.row-actions-dropdown').forEach(d => d.classList.add('hidden'));
    document.querySelectorAll('.row-dropdown-wrapper').forEach(w => w.classList.remove('dropdown-open'));
    document.querySelectorAll('.thin-row').forEach(r => r.classList.remove('dropdown-open-row'));
  }

  // --- LOAN ACTIONS ---
  openAddLoanModal() {
    this.editingLoanIdInput.value = '';
    this.modalTitle.textContent = 'Add Peer Loan';
    document.getElementById('loan-borrower').value = '';
    document.getElementById('loan-notes').value = '';
    
    const today = getTodayStr();
    this.calculator.reset(0, today, 30);
    this.showModal('loan-form-modal');
  }

  openEditLoanModal(loanId) {
    const loan = state.getLoanById(loanId);
    if (!loan) return;

    this.editingLoanIdInput.value = loan.id;
    this.modalTitle.textContent = `Edit: ${loan.borrowerName}`;
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

    if (!borrowerName || principal <= 0) return;

    const payload = { borrowerName, principal, dateLent, returnDueDate, interestType, interestRate, interestAmount, notes };

    if (editingId) {
      state.updateLoan(editingId, payload);
      showToast(`Updated ${borrowerName}`, 'success');
    } else {
      state.addLoan(payload);
      showToast(`Added ${borrowerName} (${formatINR(principal)})`, 'success');
    }

    this.hideModal('loan-form-modal');
  }

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

    this.showModal('rollover-modal');
  }

  handleConfirmRollover() {
    if (!this.activeLoanForAction) return;
    const loanId = this.activeLoanForAction.id;
    const newDueDate = document.getElementById('rollover-new-due').value;
    const interestCollected = parseFloat(document.getElementById('rollover-interest-received').value) || 0;
    const dateCollected = document.getElementById('rollover-date-collected').value || getTodayStr();

    state.rolloverLoan(loanId, newDueDate, interestCollected, '', dateCollected);
    showToast(`Rollover confirmed: +₹${interestCollected} logged`, 'success');
    this.hideModal('rollover-modal');
  }

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

    state.settleLoan(loanId, finalInterest, settleDate, '');
    showToast(`Settled ${this.activeLoanForAction.borrowerName}!`, 'success');
    this.hideModal('settle-modal');
  }

  // --- DEBTS ACTIONS ---
  openAddDebtModal() {
    document.getElementById('debt-creditor').value = '';
    document.getElementById('debt-amount').value = '';
    document.getElementById('debt-notes').value = '';
    this.showModal('debt-modal');
  }

  handleSaveDebt() {
    const creditorName = document.getElementById('debt-creditor').value.trim();
    const amount = parseFloat(document.getElementById('debt-amount').value) || 0;
    const notes = document.getElementById('debt-notes').value.trim();

    if (!creditorName || amount <= 0) return;

    state.addDebt({ creditorName, amount, notes });
    showToast(`Added debt: ${creditorName}`, 'success');
    this.hideModal('debt-modal');
  }

  // --- ACCOUNTS ACTIONS ---
  openAddAccountModal() {
    document.getElementById('acc-name').value = '';
    document.getElementById('acc-balance').value = '';
    this.showModal('account-modal');
  }

  handleSaveAccount() {
    const name = document.getElementById('acc-name').value.trim();
    const balance = parseFloat(document.getElementById('acc-balance').value) || 0;
    if (!name) return;

    state.addAccount(name, balance);
    showToast(`Added account: ${name}`, 'success');
    this.hideModal('account-modal');
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

  render() {
    this.renderLentPage();
    this.renderDebtsPage();
    this.renderBalancesPage();
    this.renderSipsPage();
  }

  // =========================================================================
  // PAGE 1: RENDER LENT (CHECKLIST FORMAT LIKE GOOGLE KEEP)
  // =========================================================================
  renderLentPage() {
    const today = getTodayStr();
    let loans = state.getLoans();

    // Active loans
    let activeLoans = loans.filter(l => l.status !== 'settled');

    if (this.searchTerm) {
      activeLoans = activeLoans.filter(l =>
        l.borrowerName.toLowerCase().includes(this.searchTerm) ||
        (l.notes && l.notes.toLowerCase().includes(this.searchTerm))
      );
    }

    if (this.statusFilter === 'active') {
      activeLoans = activeLoans.filter(l => l.status === 'active');
    } else if (this.statusFilter === 'extended') {
      activeLoans = activeLoans.filter(l => l.status === 'extended');
    } else if (this.statusFilter === 'overdue') {
      activeLoans = activeLoans.filter(l => l.returnDueDate < today);
    }

    // Render Active Rows
    if (this.activeListEl) {
      if (activeLoans.length === 0) {
        this.activeListEl.innerHTML = `<div class="py-6 text-center text-xs text-zinc-400">No active items. Click "+ New" to add one.</div>`;
      } else {
        this.activeListEl.innerHTML = activeLoans.map(loan => {
          const daysDiff = getDaysDiff(today, loan.returnDueDate);
          const isOverdue = daysDiff < 0;

          let dueTag = '';
          if (isOverdue) {
            dueTag = `<span class="text-rose-400 font-bold text-[11px]">(${Math.abs(daysDiff)}d overdue)</span>`;
          } else if (daysDiff === 0) {
            dueTag = `<span class="text-amber-400 font-bold text-[11px]">(due today)</span>`;
          } else {
            dueTag = `<span class="text-zinc-400 text-[11px]">(${daysDiff}d left)</span>`;
          }

          return `
            <div class="thin-row flex items-center justify-between gap-3 py-3 px-2 text-xs">
              
              <!-- Left: Checkbox & Info -->
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <input 
                  type="checkbox" 
                  class="custom-checkbox loan-checkbox" 
                  data-id="${loan.id}" 
                  title="Click to Settle & Close"
                >
                <div class="min-w-0 flex-1">
                  <div class="flex items-baseline gap-2 flex-wrap">
                    <span class="font-bold text-white text-[13px] sm:text-xs">${loan.borrowerName}</span>
                    <span class="text-zinc-200 font-mono font-bold">- ${formatINR(loan.principal)}</span>
                    ${loan.notes ? `<span class="text-zinc-400 text-[11px] truncate">(${loan.notes})</span>` : ''}
                  </div>
                  <div class="text-[11px] text-zinc-400 flex items-center gap-2 pt-0.5">
                    <span>Due: ${formatDate(loan.returnDueDate)}</span>
                    ${dueTag}
                    ${loan.interestAmount ? `<span class="text-yellow-400 font-mono font-bold">• +${formatINR(loan.interestAmount)}</span>` : ''}
                  </div>
                </div>
              </div>

              <!-- Right: Actions Dropdown Trigger -->
              <div class="relative row-dropdown-wrapper shrink-0">
                <button 
                  type="button" 
                  class="dropdown-trigger-btn px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 text-xs flex items-center gap-1 transition shadow-sm cursor-pointer"
                  data-id="${loan.id}"
                  title="Actions"
                >
                  <span class="text-[10px] text-zinc-300 font-bold">▼</span>
                </button>

                <!-- Dropdown Menu in Solid Black Box -->
                <div id="drop-${loan.id}" class="row-actions-dropdown hidden absolute right-0 top-full mt-1.5 z-40 w-48 rounded-xl bg-black border border-zinc-700 shadow-2xl py-1 text-xs">
                  <button class="action-rollover w-full text-left px-3.5 py-2 text-yellow-400 hover:bg-zinc-900 flex items-center gap-2.5 font-medium transition cursor-pointer" data-id="${loan.id}">
                    <span>🔄</span> Extend / Rollover
                  </button>
                  <button class="action-settle w-full text-left px-3.5 py-2 text-yellow-300 hover:bg-zinc-900 flex items-center gap-2.5 font-bold transition cursor-pointer" data-id="${loan.id}">
                    <span>✅</span> Settle Loan
                  </button>
                  <div class="border-t border-zinc-800 my-1"></div>
                  <button class="action-history w-full text-left px-3.5 py-2 text-zinc-200 hover:bg-zinc-900 hover:text-white flex items-center gap-2.5 transition cursor-pointer" data-id="${loan.id}">
                    <span>📜</span> View Ledger
                  </button>
                  <button class="action-edit w-full text-left px-3.5 py-2 text-zinc-200 hover:bg-zinc-900 hover:text-white flex items-center gap-2.5 transition cursor-pointer" data-id="${loan.id}">
                    <span>✏️</span> Edit
                  </button>
                  <button class="action-delete w-full text-left px-3.5 py-2 text-rose-400 hover:bg-zinc-900 hover:text-rose-300 flex items-center gap-2.5 transition cursor-pointer" data-id="${loan.id}">
                    <span>🗑️</span> Delete
                  </button>
                </div>
              </div>

            </div>
          `;
        }).join('');
      }

      this.attachLentRowListeners();
    }

    // Settled loans
    const settledLoans = loans.filter(l => l.status === 'settled');
    if (this.settledCountText) this.settledCountText.textContent = settledLoans.length;

    if (this.settledListEl) {
      if (settledLoans.length === 0) {
        this.settledListEl.innerHTML = `<div class="py-2 text-xs text-zinc-500 px-1">No settled items.</div>`;
      } else {
        this.settledListEl.innerHTML = settledLoans.map(loan => {
          return `
            <div class="thin-row settled flex items-center justify-between gap-3 py-2.5 px-2 text-xs">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <input 
                  type="checkbox" 
                  checked 
                  class="custom-checkbox reopen-checkbox cursor-pointer" 
                  data-id="${loan.id}" 
                  title="Click to restore back to Active"
                >
                <div class="min-w-0 flex-1 cursor-pointer reopen-label-trigger" data-id="${loan.id}" title="Click to restore back to Active">
                  <div class="flex items-baseline gap-2 flex-wrap">
                    <span class="font-medium text-zinc-400 line-through">${loan.borrowerName}</span>
                    <span class="text-zinc-500 font-mono">- ${formatINR(loan.principal)}</span>
                  </div>
                  <div class="text-[11px] text-zinc-500 flex items-center gap-2 pt-0.5">
                    <span>Settled on ${formatDate(loan.settledAt || loan.returnDueDate)}</span>
                    <span class="text-yellow-400/90 hover:underline font-medium text-[10px]">↩ Restore to Active</span>
                  </div>
                </div>
              </div>

              <!-- Settled Dropdown in Solid Black -->
              <div class="relative row-dropdown-wrapper shrink-0">
                <button type="button" class="dropdown-trigger-btn px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs flex items-center gap-1 transition cursor-pointer" data-id="${loan.id}" title="Actions">
                  <span class="text-[10px]">▼</span>
                </button>
                <div id="drop-${loan.id}" class="row-actions-dropdown hidden absolute right-0 top-full mt-1.5 z-40 w-44 rounded-xl bg-black border border-zinc-700 shadow-2xl py-1 text-xs">
                  <button class="action-reopen w-full text-left px-3.5 py-2 text-yellow-400 hover:bg-zinc-900 font-bold flex items-center gap-2 transition cursor-pointer" data-id="${loan.id}">
                    <span>↩</span> Restore to Active
                  </button>
                  <button class="action-history w-full text-left px-3.5 py-2 text-zinc-200 hover:bg-zinc-900 flex items-center gap-2 transition cursor-pointer" data-id="${loan.id}">
                    <span>📜</span> View Ledger
                  </button>
                  <button class="action-delete w-full text-left px-3.5 py-2 text-rose-400 hover:bg-zinc-900 flex items-center gap-2 transition cursor-pointer" data-id="${loan.id}">
                    <span>🗑️</span> Delete
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      this.attachSettledRowListeners();
    }

    // Update Major Results Summary at bottom of Lent Page (WITH OVERALL AND SETTLED PERCENTAGES)
    const stats = state.getStats();
    const activeEl = document.getElementById('lent-summary-active');
    const interestEl = document.getElementById('lent-summary-interest');
    const returnPctEl = document.getElementById('lent-summary-return-pct');
    const overallSubEl = document.getElementById('lent-summary-overall-sub');
    const settledReturnPctEl = document.getElementById('lent-summary-settled-return-pct');
    const settledEl = document.getElementById('lent-summary-settled');

    if (activeEl) activeEl.textContent = formatINR(stats.totalActiveLent);
    if (interestEl) interestEl.textContent = `+${formatINR(stats.totalInterest)}`;
    if (returnPctEl) returnPctEl.textContent = `+${stats.overallReturnPct}%`;
    if (overallSubEl) overallSubEl.textContent = `All loans (avg rate: ${stats.weightedAvgRate}%)`;
    if (settledReturnPctEl) settledReturnPctEl.textContent = `+${stats.settledReturnPct}%`;
    if (settledEl) settledEl.textContent = `Settled: ${formatINR(stats.totalSettledLent)}`;
  }

  attachLentRowListeners() {
    this.activeListEl.querySelectorAll('.loan-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        e.target.checked = false; // keep unchecked until confirmed in modal
        this.openSettleModal(id);
      });
    });

    this.activeListEl.querySelectorAll('.dropdown-trigger-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.getAttribute('data-id');
        const drop = document.getElementById(`drop-${id}`);
        const wrapper = btn.closest('.row-dropdown-wrapper');
        const row = btn.closest('.thin-row');

        const wasHidden = drop ? drop.classList.contains('hidden') : true;

        this.closeAllDropdowns();

        if (drop && wasHidden) {
          drop.classList.remove('hidden');
          if (wrapper) wrapper.classList.add('dropdown-open');
          if (row) row.classList.add('dropdown-open-row');
        }
      });
    });

    this.activeListEl.querySelectorAll('.action-rollover').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.getAttribute('data-id');
        this.closeAllDropdowns();
        if (id) this.openRolloverModal(id);
      });
    });

    this.activeListEl.querySelectorAll('.action-settle').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.getAttribute('data-id');
        this.closeAllDropdowns();
        if (id) this.openSettleModal(id);
      });
    });

    this.activeListEl.querySelectorAll('.action-history').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.getAttribute('data-id');
        this.closeAllDropdowns();
        if (id) window.credipulseApp?.openLedger(id);
      });
    });

    this.activeListEl.querySelectorAll('.action-edit').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.getAttribute('data-id');
        this.closeAllDropdowns();
        if (id) this.openEditLoanModal(id);
      });
    });

    this.activeListEl.querySelectorAll('.action-delete').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.getAttribute('data-id');
        this.closeAllDropdowns();
        if (!id) return;
        if (confirm('Delete this loan?')) {
          state.deleteLoan(id);
          showToast('Deleted', 'info');
        }
      });
    });
  }

  attachSettledRowListeners() {
    this.settledListEl.querySelectorAll('.reopen-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        const id = cb.getAttribute('data-id');
        if (id) {
          state.reopenLoan(id);
          showToast('Loan restored to Active list', 'info');
        }
      });
    });

    this.settledListEl.querySelectorAll('.reopen-label-trigger').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.getAttribute('data-id');
        if (id) {
          state.reopenLoan(id);
          showToast('Loan restored to Active list', 'info');
        }
      });
    });

    this.settledListEl.querySelectorAll('.dropdown-trigger-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const drop = document.getElementById(`drop-${id}`);
        const wrapper = btn.closest('.row-dropdown-wrapper');
        const row = btn.closest('.thin-row');

        const wasHidden = drop ? drop.classList.contains('hidden') : true;

        this.closeAllDropdowns();

        if (drop && wasHidden) {
          drop.classList.remove('hidden');
          if (wrapper) wrapper.classList.add('dropdown-open');
          if (row) row.classList.add('dropdown-open-row');
        }
      });
    });

    this.settledListEl.querySelectorAll('.action-reopen').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.getAttribute('data-id');
        this.closeAllDropdowns();
        if (id) {
          state.reopenLoan(id);
          showToast('Loan restored to Active list', 'info');
        }
      });
    });

    this.settledListEl.querySelectorAll('.action-history').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.getAttribute('data-id');
        this.closeAllDropdowns();
        if (id) {
          window.credipulseApp?.openLedger(id);
        }
      });
    });

    this.settledListEl.querySelectorAll('.action-delete').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.getAttribute('data-id');
        this.closeAllDropdowns();
        if (!id) return;
        if (confirm('Delete this record?')) {
          state.deleteLoan(id);
          showToast('Deleted', 'info');
        }
      });
    });
  }

  // =========================================================================
  // PAGE 2: RENDER DEBTS (CHECKLIST FORMAT LIKE GOOGLE KEEP)
  // =========================================================================
  renderDebtsPage() {
    if (!this.debtsListEl) return;

    const debts = state.getDebts();

    if (debts.length === 0) {
      this.debtsListEl.innerHTML = `<div class="py-6 text-center text-xs text-zinc-400">No debts recorded. Click "+ Add Debt" to add.</div>`;
    } else {
      this.debtsListEl.innerHTML = debts.map(d => {
        const isPaid = d.status === 'paid';
        return `
          <div class="thin-row ${isPaid ? 'settled' : ''} flex items-center justify-between gap-3 py-3 px-2 text-xs">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <input 
                type="checkbox" 
                ${isPaid ? 'checked' : ''} 
                class="custom-checkbox debt-toggle-cb" 
                data-id="${d.id}"
                title="Mark Paid / Unpaid"
              >
              <div class="min-w-0 flex-1">
                <span class="font-bold ${isPaid ? 'line-through text-zinc-400' : 'text-white'}">
                  ${d.creditorName} - <span class="font-mono ${isPaid ? 'text-zinc-400' : 'text-zinc-200'}">${formatINR(d.amount)}</span>
                </span>
                ${d.notes ? `<span class="text-zinc-400 text-[11px] ml-1.5 font-medium">(${d.notes})</span>` : ''}
              </div>
            </div>

            <button class="delete-debt-btn text-zinc-400 hover:text-rose-400 text-xs px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 transition cursor-pointer" data-id="${d.id}" title="Delete">
              🗑️
            </button>
          </div>
        `;
      }).join('');

      this.debtsListEl.querySelectorAll('.debt-toggle-cb').forEach(cb => {
        cb.addEventListener('change', (e) => {
          const id = e.target.getAttribute('data-id');
          state.toggleDebtPaid(id);
        });
      });

      this.debtsListEl.querySelectorAll('.delete-debt-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          if (confirm('Delete this debt entry?')) {
            state.deleteDebt(id);
          }
        });
      });
    }

    const stats = state.getStats();
    const debtsSumEl = document.getElementById('debts-summary-total');
    if (debtsSumEl) debtsSumEl.textContent = formatINR(stats.totalDebts);
    const debtsUnpaidEl = document.getElementById('debts-unpaid-count');
    if (debtsUnpaidEl) {
      const debts = state.getDebts();
      const unpaidCount = debts.filter(d => d.status !== 'paid').length;
      debtsUnpaidEl.textContent = `${unpaidCount} Active ${unpaidCount === 1 ? 'Liability' : 'Liabilities'}`;
    }
  }

  // =========================================================================
  // PAGE 3: RENDER BALANCES & MASTER NET WORTH
  // =========================================================================
  renderBalancesPage() {
    if (!this.accountsListEl) return;

    const accounts = state.getAccounts();

    if (accounts.length === 0) {
      this.accountsListEl.innerHTML = `<div class="py-6 text-center text-xs text-zinc-400">No bank accounts added. Click "+ Add Account".</div>`;
    } else {
      this.accountsListEl.innerHTML = accounts.map(a => {
        return `
          <div class="thin-row flex items-center justify-between gap-3 py-3 px-2 text-xs">
            <span class="font-bold text-white text-sm sm:text-xs">${a.name}</span>
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-zinc-200 text-sm sm:text-xs">${formatINR(a.balance)}</span>
              <button class="edit-acc-btn text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 px-2 py-1 rounded-md text-xs transition cursor-pointer" data-id="${a.id}" data-name="${a.name}" data-balance="${a.balance}" title="Update Balance">
                ✏️
              </button>
              <button class="delete-acc-btn text-zinc-400 hover:text-rose-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 px-2 py-1 rounded-md text-xs transition cursor-pointer" data-id="${a.id}" title="Delete Account">
                🗑️
              </button>
            </div>
          </div>
        `;
      }).join('');

      this.accountsListEl.querySelectorAll('.edit-acc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          const name = e.currentTarget.getAttribute('data-name');
          const current = e.currentTarget.getAttribute('data-balance');
          const val = prompt(`Update balance for ${name}:`, current);
          if (val !== null && !isNaN(parseFloat(val))) {
            state.updateAccountBalance(id, parseFloat(val));
          }
        });
      });

      this.accountsListEl.querySelectorAll('.delete-acc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          if (confirm('Delete this account?')) {
            state.deleteAccount(id);
          }
        });
      });
    }

    // Net Worth Calculations at bottom
    const stats = state.getStats();
    const nwBank = document.getElementById('nw-bank-funds');
    const nwLent = document.getElementById('nw-active-lent');
    const nwInterest = document.getElementById('nw-interest-collected');
    const nwDebts = document.getElementById('nw-total-debts');
    const nwSips = document.getElementById('nw-sip-invested');
    const nwTotal = document.getElementById('nw-net-worth');

    if (nwBank) nwBank.textContent = formatINR(stats.totalBank);
    if (nwLent) nwLent.textContent = formatINR(stats.totalActiveLent);
    if (nwInterest) nwInterest.textContent = `+${formatINR(stats.totalInterest)}`;
    if (nwDebts) nwDebts.textContent = `-${formatINR(stats.totalDebts)}`;
    if (nwSips) nwSips.textContent = `+${formatINR(stats.totalSipInvested)}`;
    if (nwTotal) nwTotal.textContent = formatINR(stats.netWorth);
  }

  // =========================================================================
  // PAGE 4: RENDER SIPS (MUTUAL FUNDS RECURRING ACCRUAL)
  // =========================================================================
  renderSipsPage() {
    const sips = state.getSips();
    let activeSips = sips.filter(s => s.status === 'active');
    let stoppedSips = sips.filter(s => s.status === 'stopped');

    if (this.sipSearchTerm) {
      activeSips = activeSips.filter(s =>
        s.fundName.toLowerCase().includes(this.sipSearchTerm) ||
        (s.notes && s.notes.toLowerCase().includes(this.sipSearchTerm))
      );
      stoppedSips = stoppedSips.filter(s =>
        s.fundName.toLowerCase().includes(this.sipSearchTerm) ||
        (s.notes && s.notes.toLowerCase().includes(this.sipSearchTerm))
      );
    }

    if (this.sipFilter === 'active') {
      stoppedSips = [];
    } else if (this.sipFilter === 'stopped') {
      activeSips = [];
    }

    // Render Active SIPs
    if (this.sipsActiveListEl) {
      if (activeSips.length === 0) {
        this.sipsActiveListEl.innerHTML = `<div class="py-6 text-center text-xs text-zinc-400">No active SIPs found. Click "+ Add SIP" to add one.</div>`;
      } else {
        this.sipsActiveListEl.innerHTML = activeSips.map(sip => {
          const prog = calculateSipProgress(sip);
          const nextTag = prog.daysUntilNext !== null
            ? (prog.daysUntilNext === 0
                ? `<span class="text-amber-400 font-bold text-[11px]">(deducts today)</span>`
                : `<span class="text-zinc-400 text-[11px]">(${prog.daysUntilNext}d until next)</span>`)
            : '';

          return `
            <div class="thin-row flex items-center justify-between gap-3 py-3 px-2 text-xs">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <input 
                  type="checkbox" 
                  class="custom-checkbox sip-pause-cb" 
                  data-id="${sip.id}" 
                  title="Click to Pause / Stop SIP"
                >
                <div class="min-w-0 flex-1">
                  <div class="flex items-baseline gap-2 flex-wrap">
                    <span class="font-bold text-white text-[13px] sm:text-xs">${sip.fundName}</span>
                    <span class="text-zinc-200 font-mono font-bold">- ${formatINR(sip.monthlyAmount)}/mo</span>
                    <span class="text-yellow-400 font-mono text-[11px] font-bold">(Day ${sip.deductionDay})</span>
                    ${sip.notes ? `<span class="text-zinc-400 text-[11px] truncate">(${sip.notes})</span>` : ''}
                  </div>
                  <div class="text-[11px] text-zinc-400 flex items-center gap-2 pt-0.5 flex-wrap">
                    <span>Started: ${formatDate(sip.startDate)}</span>
                    <span>•</span>
                    <span class="font-mono text-zinc-200 font-semibold">${prog.installments} installments</span>
                    <span>•</span>
                    <span class="text-yellow-400 font-mono font-bold">Invested: ${formatINR(prog.totalInvested)}</span>
                    ${nextTag}
                  </div>
                </div>
              </div>

              <!-- Right: Actions Dropdown Trigger -->
              <div class="relative row-dropdown-wrapper shrink-0">
                <button 
                  type="button" 
                  class="dropdown-trigger-btn px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 text-xs flex items-center gap-1 transition shadow-sm cursor-pointer"
                  data-id="sip-${sip.id}"
                  title="Actions"
                >
                  <span class="text-[10px] text-zinc-300 font-bold">▼</span>
                </button>

                <!-- Dropdown Menu -->
                <div id="drop-sip-${sip.id}" class="row-actions-dropdown hidden absolute right-0 top-full mt-1.5 z-40 w-44 rounded-xl bg-black border border-zinc-700 shadow-2xl py-1 text-xs">
                  <button class="action-toggle-sip w-full text-left px-3.5 py-2 text-yellow-400 hover:bg-zinc-900 flex items-center gap-2.5 font-medium transition cursor-pointer" data-id="${sip.id}">
                    <span>⏸️</span> Pause / Stop SIP
                  </button>
                  <button class="action-edit-sip w-full text-left px-3.5 py-2 text-zinc-200 hover:bg-zinc-900 hover:text-white flex items-center gap-2.5 transition cursor-pointer" data-id="${sip.id}">
                    <span>✏️</span> Edit
                  </button>
                  <button class="action-delete-sip w-full text-left px-3.5 py-2 text-rose-400 hover:bg-zinc-900 hover:text-rose-300 flex items-center gap-2.5 transition cursor-pointer" data-id="${sip.id}">
                    <span>🗑️</span> Delete
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      this.attachSipActiveListeners();
    }

    // Render Stopped / Completed SIPs
    if (this.sipsStoppedCountText) this.sipsStoppedCountText.textContent = stoppedSips.length;

    if (this.sipsStoppedListEl) {
      if (stoppedSips.length === 0) {
        this.sipsStoppedListEl.innerHTML = `<div class="py-2 text-xs text-zinc-500 px-1">No stopped SIPs.</div>`;
      } else {
        this.sipsStoppedListEl.innerHTML = stoppedSips.map(sip => {
          const prog = calculateSipProgress(sip);
          return `
            <div class="thin-row settled flex items-center justify-between gap-3 py-2.5 px-2 text-xs">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <input 
                  type="checkbox" 
                  checked 
                  class="custom-checkbox sip-resume-cb" 
                  data-id="${sip.id}" 
                  title="Uncheck to Resume SIP"
                >
                <div class="min-w-0 flex-1">
                  <span class="font-medium text-zinc-400 line-through">${sip.fundName} - ${formatINR(sip.monthlyAmount)}/mo</span>
                  <div class="text-[11px] text-zinc-500">
                    Stopped on ${formatDate(sip.stopDate || getTodayStr())} • ${prog.installments} installments accrued • Total: ${formatINR(prog.totalInvested)}
                  </div>
                </div>
              </div>

              <!-- Stopped Dropdown -->
              <div class="relative row-dropdown-wrapper shrink-0">
                <button type="button" class="dropdown-trigger-btn px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs flex items-center gap-1 transition cursor-pointer" data-id="sip-${sip.id}">
                  <span class="text-[10px]">▼</span>
                </button>
                <div id="drop-sip-${sip.id}" class="row-actions-dropdown hidden absolute right-0 top-full mt-1.5 z-40 w-40 rounded-xl bg-black border border-zinc-700 shadow-2xl py-1 text-xs">
                  <button class="action-toggle-sip w-full text-left px-3.5 py-2 text-yellow-400 hover:bg-zinc-900 transition cursor-pointer" data-id="${sip.id}">
                    ▶ Resume SIP
                  </button>
                  <button class="action-delete-sip w-full text-left px-3.5 py-2 text-rose-400 hover:bg-zinc-900 transition cursor-pointer" data-id="${sip.id}">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      this.attachSipStoppedListeners();
    }

    // Update SIP KPI Sidebar
    const stats = state.getStats();
    const monthlyEl = document.getElementById('sips-summary-monthly');
    const totalInvestedEl = document.getElementById('sips-summary-total-invested');
    const activeCountEl = document.getElementById('sips-summary-active-count');

    if (monthlyEl) monthlyEl.textContent = `${formatINR(stats.totalMonthlySip)}/mo`;
    if (totalInvestedEl) totalInvestedEl.textContent = formatINR(stats.totalSipInvested);
    if (activeCountEl) activeCountEl.textContent = `${stats.activeSipsCount} Active Funds`;
  }

  attachSipActiveListeners() {
    this.sipsActiveListEl?.querySelectorAll('.sip-pause-cb').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        e.target.checked = false;
        if (confirm('Stop/Pause this SIP? Deduction counter will freeze until resumed.')) {
          state.toggleSipStatus(id);
          showToast('SIP paused', 'info');
        }
      });
    });

    this.sipsActiveListEl?.querySelectorAll('.dropdown-trigger-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.getAttribute('data-id');
        const drop = document.getElementById(`drop-${id}`);
        const wrapper = btn.closest('.row-dropdown-wrapper');
        const row = btn.closest('.thin-row');

        const wasHidden = drop ? drop.classList.contains('hidden') : true;

        this.closeAllDropdowns();

        if (drop && wasHidden) {
          drop.classList.remove('hidden');
          if (wrapper) wrapper.classList.add('dropdown-open');
          if (row) row.classList.add('dropdown-open-row');
        }
      });
    });

    this.sipsActiveListEl?.querySelectorAll('.action-toggle-sip').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.getAttribute('data-id');
        this.closeAllDropdowns();
        if (id) {
          state.toggleSipStatus(id);
          showToast('SIP status changed', 'info');
        }
      });
    });

    this.sipsActiveListEl?.querySelectorAll('.action-edit-sip').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.getAttribute('data-id');
        this.closeAllDropdowns();
        if (id) this.openEditSipModal(id);
      });
    });

    this.sipsActiveListEl?.querySelectorAll('.action-delete-sip').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.getAttribute('data-id');
        this.closeAllDropdowns();
        if (id && confirm('Delete this SIP record?')) {
          state.deleteSip(id);
          showToast('Deleted SIP', 'info');
        }
      });
    });
  }

  attachSipStoppedListeners() {
    this.sipsStoppedListEl?.querySelectorAll('.sip-resume-cb').forEach(cb => {
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        const id = cb.getAttribute('data-id');
        cb.checked = true;
        if (confirm('Resume this SIP back to Active?')) {
          state.toggleSipStatus(id);
          showToast('SIP resumed', 'success');
        }
      });
    });

    this.sipsStoppedListEl?.querySelectorAll('.dropdown-trigger-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const drop = document.getElementById(`drop-${id}`);
        const wrapper = btn.closest('.row-dropdown-wrapper');
        const row = btn.closest('.thin-row');

        const wasHidden = drop ? drop.classList.contains('hidden') : true;

        this.closeAllDropdowns();

        if (drop && wasHidden) {
          drop.classList.remove('hidden');
          if (wrapper) wrapper.classList.add('dropdown-open');
          if (row) row.classList.add('dropdown-open-row');
        }
      });
    });

    this.sipsStoppedListEl?.querySelectorAll('.action-toggle-sip').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.getAttribute('data-id');
        this.closeAllDropdowns();
        if (id) {
          state.toggleSipStatus(id);
          showToast('SIP resumed', 'success');
        }
      });
    });

    this.sipsStoppedListEl?.querySelectorAll('.action-delete-sip').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.getAttribute('data-id');
        this.closeAllDropdowns();
        if (id && confirm('Delete this stopped SIP record?')) {
          state.deleteSip(id);
          showToast('Deleted', 'info');
        }
      });
    });
  }

  openAddSipModal() {
    document.getElementById('sip-id-hidden').value = '';
    document.getElementById('sip-modal-title').textContent = 'Add Monthly SIP';
    document.getElementById('sip-fund-name').value = '';
    document.getElementById('sip-amount').value = '';
    document.getElementById('sip-deduction-day').value = '10';
    document.getElementById('sip-start-date').value = getTodayStr();
    document.getElementById('sip-initial-invested').value = '0';
    document.getElementById('sip-notes').value = '';
    this.showModal('sip-modal');
  }

  openEditSipModal(id) {
    const sip = state.getSipById(id);
    if (!sip) return;
    document.getElementById('sip-id-hidden').value = sip.id;
    document.getElementById('sip-modal-title').textContent = `Edit: ${sip.fundName}`;
    document.getElementById('sip-fund-name').value = sip.fundName;
    document.getElementById('sip-amount').value = sip.monthlyAmount;
    document.getElementById('sip-deduction-day').value = sip.deductionDay || 10;
    document.getElementById('sip-start-date').value = sip.startDate;
    document.getElementById('sip-initial-invested').value = sip.initialInvested || 0;
    document.getElementById('sip-notes').value = sip.notes || '';
    this.showModal('sip-modal');
  }

  handleSaveSip() {
    const fundName = document.getElementById('sip-fund-name').value.trim();
    const monthlyAmount = parseFloat(document.getElementById('sip-amount').value) || 0;
    const deductionDay = parseInt(document.getElementById('sip-deduction-day').value, 10) || 1;
    const startDate = document.getElementById('sip-start-date').value || getTodayStr();
    const initialInvested = parseFloat(document.getElementById('sip-initial-invested').value) || 0;
    const notes = document.getElementById('sip-notes').value.trim();
    const editingId = document.getElementById('sip-id-hidden').value;

    if (!fundName || monthlyAmount <= 0) return;

    const payload = { fundName, monthlyAmount, deductionDay, startDate, initialInvested, notes };

    if (editingId) {
      state.updateSip(editingId, payload);
      showToast(`Updated ${fundName}`, 'success');
    } else {
      state.addSip(payload);
      showToast(`Added ${fundName} (${formatINR(monthlyAmount)}/mo)`, 'success');
    }

    this.hideModal('sip-modal');
  }
}
