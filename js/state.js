/**
 * State Management & Local Storage Persistence
 */

import { uid, getTodayStr, addDays, addMonths } from './utils.js';

const STORAGE_KEY = 'credipulse_finance_data_v1';

// Default initial state
const defaultState = {
  loans: [],
  interestLedger: [],
  bankAccounts: [
    { id: 'acc_1', name: 'HDFC Savings', balance: 145000, type: 'bank' },
    { id: 'acc_2', name: 'SBI Salary Account', balance: 82500, type: 'bank' },
    { id: 'acc_3', name: 'Cash in Hand', balance: 15000, type: 'cash' }
  ],
  debts: [],
  investments: {
    mutualFunds: [],
    stocks: []
  },
  settings: {
    currency: 'INR',
    theme: 'dark'
  }
};

// Seed sample data for Sprint 1 demo
export function generateSampleData() {
  const today = getTodayStr();

  const sampleLoans = [
    {
      id: 'loan_demo_1',
      borrowerName: 'Rahul Verma',
      principal: 50000,
      dateLent: addDays(today, -20),
      returnDueDate: addDays(today, 10), // due in 10 days
      interestType: 'flat',
      interestRate: 4,
      interestAmount: 2000,
      status: 'active',
      notes: 'Lent for urgent medical emergency. Promised to return with 4% interest.',
      createdAt: new Date().toISOString(),
      rolloverCount: 0
    },
    {
      id: 'loan_demo_2',
      borrowerName: 'Priya Sharma (Design Studio)',
      principal: 100000,
      dateLent: addDays(today, -45),
      returnDueDate: addDays(today, 15), // Extended
      interestType: 'monthly',
      interestRate: 2.5,
      interestAmount: 2500,
      status: 'extended',
      notes: 'Working capital for freelance equipment. Paid interest once on 30-day rollover.',
      createdAt: new Date().toISOString(),
      rolloverCount: 1
    },
    {
      id: 'loan_demo_3',
      borrowerName: 'Amit Saxena',
      principal: 30000,
      dateLent: addDays(today, -25),
      returnDueDate: addDays(today, -5), // Overdue by 5 days
      interestType: 'flat',
      interestRate: 5,
      interestAmount: 1500,
      status: 'active',
      notes: 'Short term bridge loan. Need to follow up for return.',
      createdAt: new Date().toISOString(),
      rolloverCount: 0
    },
    {
      id: 'loan_demo_4',
      borrowerName: 'Vikram Patel',
      principal: 75000,
      dateLent: addDays(today, -75),
      returnDueDate: addDays(today, -15),
      interestType: 'flat',
      interestRate: 4,
      interestAmount: 3000,
      status: 'settled',
      notes: 'Fully returned on time with complete ₹3,000 interest via IMPS.',
      createdAt: new Date().toISOString(),
      settledAt: addDays(today, -15),
      settledInterestCollected: 3000,
      rolloverCount: 0
    }
  ];

  const sampleLedger = [
    {
      id: 'ledg_1',
      loanId: 'loan_demo_2',
      borrowerName: 'Priya Sharma (Design Studio)',
      amount: 2500,
      dateCollected: addDays(today, -15),
      type: 'rollover',
      previousDueDate: addDays(today, -15),
      newDueDate: addDays(today, 15),
      notes: '1st Rollover interest paid via UPI. Due extended by 30 days.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'ledg_2',
      loanId: 'loan_demo_4',
      borrowerName: 'Vikram Patel',
      amount: 3000,
      dateCollected: addDays(today, -15),
      type: 'settlement',
      previousDueDate: addDays(today, -15),
      newDueDate: null,
      notes: 'Final settlement interest. Full ₹78,000 returned to HDFC.',
      createdAt: new Date().toISOString()
    }
  ];

  return {
    ...defaultState,
    loans: sampleLoans,
    interestLedger: sampleLedger
  };
}

class StateManager {
  constructor() {
    this.subscribers = [];
    this.data = this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...defaultState,
          ...parsed,
          loans: parsed.loans || [],
          interestLedger: parsed.interestLedger || []
        };
      }
    } catch (e) {
      console.error('Failed to parse local storage:', e);
    }
    // First time load: provide sample data so user immediately sees full engine
    const seeded = generateSampleData();
    this.saveDirect(seeded);
    return seeded;
  }

  saveDirect(stateObj) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateObj));
    } catch (e) {
      console.error('Failed to write to local storage:', e);
    }
  }

  save() {
    this.saveDirect(this.data);
    this.notify();
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify() {
    for (const callback of this.subscribers) {
      try {
        callback(this.data);
      } catch (e) {
        console.error('Error in state listener:', e);
      }
    }
  }

  // Loans API
  getLoans() {
    return [...this.data.loans];
  }

  getLoanById(id) {
    return this.data.loans.find(l => l.id === id);
  }

  addLoan(loanData) {
    const newLoan = {
      id: uid('loan'),
      createdAt: new Date().toISOString(),
      rolloverCount: 0,
      status: 'active',
      ...loanData
    };
    this.data.loans.unshift(newLoan);
    this.save();
    return newLoan;
  }

  updateLoan(id, updates) {
    const idx = this.data.loans.findIndex(l => l.id === id);
    if (idx !== -1) {
      this.data.loans[idx] = {
        ...this.data.loans[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.save();
      return this.data.loans[idx];
    }
    return null;
  }

  deleteLoan(id) {
    this.data.loans = this.data.loans.filter(l => l.id !== id);
    // Optionally clean up ledger or keep it for audit
    this.save();
  }

  // Rollover loan
  rolloverLoan(loanId, newDueDate, interestCollected, notes, dateCollected) {
    const loan = this.getLoanById(loanId);
    if (!loan) return null;

    const oldDueDate = loan.returnDueDate;
    const amount = Number(interestCollected) || 0;
    const collDate = dateCollected || getTodayStr();

    // 1. Record in Interest Ledger
    if (amount > 0) {
      this.addLedgerEntry({
        loanId: loan.id,
        borrowerName: loan.borrowerName,
        amount: amount,
        dateCollected: collDate,
        type: 'rollover',
        previousDueDate: oldDueDate,
        newDueDate: newDueDate,
        notes: notes || `Rollover interest payment. Due extended to ${newDueDate}`
      });
    }

    // 2. Update loan due date and status
    this.updateLoan(loan.id, {
      returnDueDate: newDueDate,
      status: 'extended',
      rolloverCount: (loan.rolloverCount || 0) + 1
    });

    return loan;
  }

  // Settle loan
  settleLoan(loanId, finalInterestCollected, settlementDate, notes) {
    const loan = this.getLoanById(loanId);
    if (!loan) return null;

    const amount = Number(finalInterestCollected) || 0;
    const settleDate = settlementDate || getTodayStr();

    // 1. Record final accrued interest in Ledger
    if (amount > 0) {
      this.addLedgerEntry({
        loanId: loan.id,
        borrowerName: loan.borrowerName,
        amount: amount,
        dateCollected: settleDate,
        type: 'settlement',
        previousDueDate: loan.returnDueDate,
        newDueDate: null,
        notes: notes || `Final settlement interest collected. Principal ₹${loan.principal} closed.`
      });
    }

    // 2. Mark loan as settled
    this.updateLoan(loan.id, {
      status: 'settled',
      settledAt: settleDate,
      settledInterestCollected: amount,
      notes: loan.notes ? `${loan.notes}\n[Settled on ${settleDate}]` : `Settled on ${settleDate}`
    });

    return loan;
  }

  // Reopen a settled loan
  reopenLoan(loanId) {
    const loan = this.getLoanById(loanId);
    if (!loan) return null;
    return this.updateLoan(loanId, {
      status: 'active',
      settledAt: null
    });
  }

  // Interest Ledger API
  getLedger() {
    return [...this.data.interestLedger];
  }

  getLedgerForLoan(loanId) {
    return this.data.interestLedger.filter(e => e.loanId === loanId);
  }

  addLedgerEntry(entry) {
    const newEntry = {
      id: uid('ledg'),
      createdAt: new Date().toISOString(),
      ...entry
    };
    this.data.interestLedger.unshift(newEntry);
    this.save();
    return newEntry;
  }

  deleteLedgerEntry(id) {
    this.data.interestLedger = this.data.interestLedger.filter(e => e.id !== id);
    this.save();
  }

  // Aggregated Stats
  getStats() {
    const loans = this.data.loans;
    const ledger = this.data.interestLedger;

    const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'extended');
    const settledLoans = loans.filter(l => l.status === 'settled');

    const totalActivePrincipal = activeLoans.reduce((sum, l) => sum + (Number(l.principal) || 0), 0);
    const totalSettledPrincipal = settledLoans.reduce((sum, l) => sum + (Number(l.principal) || 0), 0);
    
    // Total interest collected from all ledger transactions (rollovers + settlements)
    const totalInterestCollected = ledger.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    // Expected future interest on currently active loans
    const totalExpectedActiveInterest = activeLoans.reduce((sum, l) => sum + (Number(l.interestAmount) || 0), 0);

    // Overdue count
    const today = getTodayStr();
    const overdueCount = activeLoans.filter(l => l.returnDueDate < today).length;

    // Bank funds (from parked accounts)
    const totalBankFunds = (this.data.bankAccounts || []).reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

    // Debts
    const totalDebts = (this.data.debts || []).filter(d => d.status !== 'paid').reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    // Net worth = Bank Balances + Active Principal + Total Interest Collected - Debts
    const netWorth = (totalBankFunds + totalActivePrincipal + totalInterestCollected) - totalDebts;

    return {
      totalActivePrincipal,
      totalSettledPrincipal,
      totalInterestCollected,
      totalExpectedActiveInterest,
      activeCount: activeLoans.length,
      settledCount: settledLoans.length,
      overdueCount,
      totalBankFunds,
      totalDebts,
      netWorth
    };
  }

  // Backup & Restore
  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.loans || !Array.isArray(parsed.loans)) {
        throw new Error('Invalid format: missing loans array');
      }
      this.data = {
        ...defaultState,
        ...parsed
      };
      this.save();
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  resetData() {
    this.data = generateSampleData();
    this.save();
  }

  clearAllData() {
    this.data = {
      ...defaultState,
      loans: [],
      interestLedger: []
    };
    this.save();
  }
}

export const state = new StateManager();
