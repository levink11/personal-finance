/**
 * Two-Way Reactive Interest Calculator & Date Presets
 */

import { getDaysDiff, addDays, addMonths, formatINR, getTodayStr } from './utils.js';

export class LoanCalculator {
  constructor(elements) {
    this.principalInput = elements.principal;
    this.rateInput = elements.rate;
    this.amountInput = elements.amount;
    this.typeSelect = elements.type; // 'flat' or 'monthly'
    this.dateLentInput = elements.dateLent;
    this.dueDateInput = elements.dueDate;
    this.tenureDisplay = elements.tenureDisplay;
    this.totalRepaymentDisplay = elements.totalRepaymentDisplay;
    this.dailyReturnDisplay = elements.dailyReturnDisplay;

    this.isUpdating = false; // prevents infinite reactive loops

    this.initListeners();
  }

  initListeners() {
    if (this.principalInput) {
      this.principalInput.addEventListener('input', () => this.handlePrincipalChange());
    }

    if (this.rateInput) {
      this.rateInput.addEventListener('input', () => this.handleRateInput());
    }

    if (this.amountInput) {
      this.amountInput.addEventListener('input', () => this.handleAmountInput());
    }

    if (this.typeSelect) {
      this.typeSelect.addEventListener('change', () => this.handleTypeChange());
    }

    if (this.dateLentInput) {
      this.dateLentInput.addEventListener('change', () => this.handleDatesChange());
    }

    if (this.dueDateInput) {
      this.dueDateInput.addEventListener('change', () => this.handleDatesChange());
    }
  }

  getPrincipal() {
    return Math.max(0, parseFloat(this.principalInput?.value) || 0);
  }

  getTenureDays() {
    const lent = this.dateLentInput?.value || getTodayStr();
    const due = this.dueDateInput?.value || lent;
    const diff = getDaysDiff(lent, due);
    return Math.max(1, diff); // at least 1 day for calculations
  }

  getActualTenureDays() {
    const lent = this.dateLentInput?.value || getTodayStr();
    const due = this.dueDateInput?.value || lent;
    return getDaysDiff(lent, due);
  }

  getType() {
    return this.typeSelect?.value || 'flat';
  }

  // When User types Interest Rate %
  handleRateInput() {
    if (this.isUpdating) return;
    this.isUpdating = true;

    const principal = this.getPrincipal();
    const rate = parseFloat(this.rateInput?.value) || 0;
    const type = this.getType();
    const tenureDays = this.getTenureDays();

    let computedAmount = 0;
    if (principal > 0 && rate >= 0) {
      if (type === 'monthly') {
        // Monthly pro-rata formula: Principal * (Rate / 100) * (days / 30)
        computedAmount = Math.round(principal * (rate / 100) * (tenureDays / 30));
      } else {
        // Flat period formula: Principal * (Rate / 100)
        computedAmount = Math.round(principal * (rate / 100));
      }
    }

    if (this.amountInput) {
      this.amountInput.value = computedAmount > 0 ? computedAmount : (rate === 0 ? 0 : '');
    }

    this.updateSummary();
    this.isUpdating = false;
  }

  // When User types Interest Amount (₹)
  handleAmountInput() {
    if (this.isUpdating) return;
    this.isUpdating = true;

    const principal = this.getPrincipal();
    const amount = parseFloat(this.amountInput?.value) || 0;
    const type = this.getType();
    const tenureDays = this.getTenureDays();

    let computedRate = 0;
    if (principal > 0 && amount >= 0) {
      if (type === 'monthly') {
        // Rate = (Amount / Principal) * (30 / days) * 100
        computedRate = (amount / principal) * (30 / tenureDays) * 100;
      } else {
        // Rate = (Amount / Principal) * 100
        computedRate = (amount / principal) * 100;
      }
      // Round to 2 decimal places
      computedRate = Math.round(computedRate * 100) / 100;
    }

    if (this.rateInput) {
      this.rateInput.value = computedRate > 0 ? computedRate : (amount === 0 ? 0 : '');
    }

    this.updateSummary();
    this.isUpdating = false;
  }

  // When Principal amount changes
  handlePrincipalChange() {
    if (this.isUpdating) return;
    // If rate was already entered, recompute amount based on rate
    if (this.rateInput && this.rateInput.value !== '') {
      this.handleRateInput();
    } else if (this.amountInput && this.amountInput.value !== '') {
      this.handleAmountInput();
    } else {
      this.updateSummary();
    }
  }

  // When Calculation Type (flat vs monthly) changes
  handleTypeChange() {
    if (this.isUpdating) return;
    // Prefer keeping rate fixed and recalculating amount
    if (this.rateInput && this.rateInput.value !== '') {
      this.handleRateInput();
    } else if (this.amountInput && this.amountInput.value !== '') {
      this.handleAmountInput();
    }
  }

  // When dates change
  handleDatesChange() {
    this.updateTenureDisplay();
    // If monthly pro-rata, changing dates affects interest amount
    if (this.getType() === 'monthly') {
      if (this.rateInput && this.rateInput.value !== '') {
        this.handleRateInput();
      }
    } else {
      this.updateSummary();
    }
  }

  // Update Tenure live display badge
  updateTenureDisplay() {
    const days = this.getActualTenureDays();
    if (this.tenureDisplay) {
      if (days < 0) {
        this.tenureDisplay.textContent = `${Math.abs(days)}d before start (Invalid)`;
        this.tenureDisplay.className = 'text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30';
      } else if (days === 0) {
        this.tenureDisplay.textContent = 'Same Day (0 Days)';
        this.tenureDisplay.className = 'text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30';
      } else {
        const monthsApprox = (days / 30).toFixed(1);
        const text = days >= 30 ? `${days} Days (~${monthsApprox} mo)` : `${days} Days`;
        this.tenureDisplay.textContent = text;
        this.tenureDisplay.className = 'text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      }
    }
  }

  // Update Total Repayable & Daily Rate Summary
  updateSummary() {
    const principal = this.getPrincipal();
    const amount = parseFloat(this.amountInput?.value) || 0;
    const total = principal + amount;
    const days = this.getTenureDays();

    if (this.totalRepaymentDisplay) {
      this.totalRepaymentDisplay.textContent = formatINR(total);
    }

    if (this.dailyReturnDisplay) {
      const dailyReturn = days > 0 ? (amount / days).toFixed(1) : 0;
      this.dailyReturnDisplay.textContent = `₹${dailyReturn}/day`;
    }

    this.updateTenureDisplay();
  }

  // Quick Preset Helper for adding days/months from Date Lent
  applyPreset(presetType) {
    const baseDate = this.dateLentInput?.value || getTodayStr();
    let targetDate = baseDate;

    switch (presetType) {
      case '7d':
        targetDate = addDays(baseDate, 7);
        break;
      case '15d':
        targetDate = addDays(baseDate, 15);
        break;
      case '30d':
      case '1m':
        targetDate = addMonths(baseDate, 1);
        break;
      case '45d':
        targetDate = addDays(baseDate, 45);
        break;
      case '60d':
      case '2m':
        targetDate = addMonths(baseDate, 2);
        break;
      case '90d':
      case '3m':
        targetDate = addMonths(baseDate, 3);
        break;
      case '6m':
        targetDate = addMonths(baseDate, 6);
        break;
      default:
        return;
    }

    if (this.dueDateInput) {
      this.dueDateInput.value = targetDate;
      this.handleDatesChange();
    }
  }

  // Reset form inputs
  reset(initialPrincipal = 0, initialDate = getTodayStr(), defaultDays = 30) {
    this.isUpdating = true;
    if (this.principalInput) this.principalInput.value = initialPrincipal || '';
    if (this.rateInput) this.rateInput.value = '';
    if (this.amountInput) this.amountInput.value = '';
    if (this.typeSelect) this.typeSelect.value = 'flat';
    if (this.dateLentInput) this.dateLentInput.value = initialDate;
    if (this.dueDateInput) this.dueDateInput.value = addDays(initialDate, defaultDays);
    this.isUpdating = false;

    this.updateSummary();
  }
}
