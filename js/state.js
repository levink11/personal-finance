/**
 * State Management & Local Storage Persistence
 * Minimalist, ultra-clean data store for 3 pages: Lent, Debts, Balances
 */

import { uid, getTodayStr, addDays } from './utils.js';

const STORAGE_KEY = 'credipulse_finance_data_v2';

export function generateSampleData() {
  const today = getTodayStr();

  // Based directly on user's real-life notes
  const sampleLoans = [
    {
      id: 'l_1',
      borrowerName: 'Sateesh',
      principal: 30000,
      dateLent: '2026-08-04',
      returnDueDate: addDays(today, 15),
      interestType: 'monthly',
      interestRate: 3,
      interestAmount: 900,
      status: 'extended',
      notes: '+900 dec +900 jan +900 feb +900 march +900 apr +900 may +900 jun +900 +900 +900',
      createdAt: new Date().toISOString(),
      rolloverCount: 10
    },
    {
      id: 'l_2',
      borrowerName: 'Mutty',
      principal: 500000,
      dateLent: addDays(today, -30),
      returnDueDate: addDays(today, 120),
      interestType: 'flat',
      interestRate: 0,
      interestAmount: 0,
      status: 'active',
      notes: 'Main loan',
      createdAt: new Date().toISOString(),
      rolloverCount: 0
    },
    {
      id: 'l_3',
      borrowerName: 'Mutty (Short)',
      principal: 375000,
      dateLent: addDays(today, -20),
      returnDueDate: addDays(today, -11), // 23 Oct (Overdue)
      interestType: 'flat',
      interestRate: 10,
      interestAmount: 37500,
      status: 'active',
      notes: '+ 10% (23 oct)',
      createdAt: new Date().toISOString(),
      rolloverCount: 0
    },
    {
      id: 'l_4',
      borrowerName: 'Dheeraj',
      principal: 100000,
      dateLent: addDays(today, -90),
      returnDueDate: addDays(today, 10),
      interestType: 'monthly',
      interestRate: 11,
      interestAmount: 11000,
      status: 'extended',
      notes: '+ 33000 (aug, sept, oct)',
      createdAt: new Date().toISOString(),
      rolloverCount: 3
    },
    {
      id: 'l_5',
      borrowerName: 'Sarang',
      principal: 25000,
      dateLent: addDays(today, -40),
      returnDueDate: addDays(today, 5),
      interestType: 'flat',
      interestRate: 20,
      interestAmount: 5000,
      status: 'active',
      notes: '+ 5000 (oct)',
      createdAt: new Date().toISOString(),
      rolloverCount: 0
    },
    {
      id: 'l_6',
      borrowerName: 'Safwan',
      principal: 19000,
      dateLent: '2026-06-20',
      returnDueDate: addDays(today, 8),
      interestType: 'monthly',
      interestRate: 7.9,
      interestAmount: 1500,
      status: 'extended',
      notes: '+1500 +1500 +1500 +1500 +1500',
      createdAt: new Date().toISOString(),
      rolloverCount: 5
    },
    {
      id: 'l_7',
      borrowerName: 'Binduma',
      principal: 4000,
      dateLent: addDays(today, -15),
      returnDueDate: addDays(today, 15),
      interestType: 'flat',
      interestRate: 0,
      interestAmount: 0,
      status: 'active',
      notes: '',
      createdAt: new Date().toISOString(),
      rolloverCount: 0
    },
    {
      id: 'l_8',
      borrowerName: 'Amma',
      principal: 50000,
      dateLent: '2026-01-10',
      returnDueDate: addDays(today, -30),
      interestType: 'flat',
      interestRate: 0,
      interestAmount: 0,
      status: 'settled',
      notes: 'Settled in full',
      createdAt: new Date().toISOString(),
      settledAt: addDays(today, -10),
      settledInterestCollected: 0,
      rolloverCount: 0
    }
  ];

  const sampleLedger = [
    {
      id: 'ledg_1',
      loanId: 'l_1',
      borrowerName: 'Sateesh',
      amount: 9000,
      dateCollected: addDays(today, -10),
      type: 'rollover',
      notes: '10 monthly rollovers @ 900/mo',
      createdAt: new Date().toISOString()
    },
    {
      id: 'ledg_2',
      loanId: 'l_4',
      borrowerName: 'Dheeraj',
      amount: 33000,
      dateCollected: addDays(today, -15),
      type: 'rollover',
      notes: 'Aug, Sept, Oct interest @ 11000/mo',
      createdAt: new Date().toISOString()
    },
    {
      id: 'ledg_3',
      loanId: 'l_6',
      borrowerName: 'Safwan',
      amount: 7500,
      dateCollected: addDays(today, -5),
      type: 'rollover',
      notes: '5 rollovers @ 1500',
      createdAt: new Date().toISOString()
    }
  ];

  const sampleDebts = [
    {
      id: 'debt_1',
      creditorName: 'To Appa',
      amount: 200000,
      dueDate: addDays(today, 30),
      notes: 'From SBI',
      status: 'unpaid',
      createdAt: new Date().toISOString()
    }
  ];

  const sampleAccounts = [
    { id: 'acc_1', name: 'SBI Account', balance: 150000 },
    { id: 'acc_2', name: 'IDBI Account', balance: 100000 },
    { id: 'acc_3', name: 'Cash in Hand', balance: 25000 }
  ];

  return {
    loans: sampleLoans,
    interestLedger: sampleLedger,
    debts: sampleDebts,
    bankAccounts: sampleAccounts
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
        if (parsed.loans && Array.isArray(parsed.loans)) {
          return {
            loans: parsed.loans || [],
            interestLedger: parsed.interestLedger || [],
            debts: parsed.debts || [],
            bankAccounts: parsed.bankAccounts || []
          };
        }
      }
    } catch (e) {
      console.error(e);
    }
    const seeded = generateSampleData();
    this.saveDirect(seeded);
    return seeded;
  }

  saveDirect(obj) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.error(e);
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
    for (const cb of this.subscribers) {
      try { cb(this.data); } catch (e) { console.error(e); }
    }
  }

  // --- LOANS API ---
  getLoans() {
    return [...this.data.loans];
  }

  getLoanById(id) {
    return this.data.loans.find(l => l.id === id);
  }

  addLoan(payload) {
    const newLoan = {
      id: uid('loan'),
      createdAt: new Date().toISOString(),
      rolloverCount: 0,
      status: 'active',
      ...payload
    };
    this.data.loans.unshift(newLoan);
    this.save();
    return newLoan;
  }

  updateLoan(id, updates) {
    const idx = this.data.loans.findIndex(l => String(l.id) === String(id));
    if (idx !== -1) {
      this.data.loans[idx] = { ...this.data.loans[idx], ...updates };
      this.save();
      return this.data.loans[idx];
    }
    return null;
  }

  deleteLoan(id) {
    if (!id) return;
    const strId = String(id);
    this.data.loans = this.data.loans.filter(l => String(l.id) !== strId);
    this.data.interestLedger = (this.data.interestLedger || []).filter(e => String(e.loanId) !== strId);
    this.save();
  }

  rolloverLoan(loanId, newDueDate, interestCollected, notes, dateCollected) {
    const loan = this.getLoanById(loanId);
    if (!loan) return null;

    const amount = Number(interestCollected) || 0;
    const collDate = dateCollected || getTodayStr();

    if (amount > 0) {
      this.addLedgerEntry({
        loanId: loan.id,
        borrowerName: loan.borrowerName,
        amount: amount,
        dateCollected: collDate,
        type: 'rollover',
        notes: notes || `Rollover interest received. Extended to ${newDueDate}`
      });
    }

    this.updateLoan(loan.id, {
      returnDueDate: newDueDate,
      status: 'extended',
      rolloverCount: (loan.rolloverCount || 0) + 1,
      notes: loan.notes ? `${loan.notes} +${amount}` : `+${amount}`
    });

    return loan;
  }

  settleLoan(loanId, finalInterest, settlementDate, notes) {
    const loan = this.getLoanById(loanId);
    if (!loan) return null;

    const amount = Number(finalInterest) || 0;
    const settleDate = settlementDate || getTodayStr();

    if (amount > 0) {
      this.addLedgerEntry({
        loanId: loan.id,
        borrowerName: loan.borrowerName,
        amount: amount,
        dateCollected: settleDate,
        type: 'settlement',
        notes: notes || `Final settlement interest collected`
      });
    }

    this.updateLoan(loan.id, {
      status: 'settled',
      settledAt: settleDate,
      settledInterestCollected: amount
    });

    return loan;
  }

  reopenLoan(loanId) {
    return this.updateLoan(loanId, {
      status: 'active',
      settledAt: null
    });
  }

  // --- LEDGER API ---
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

  // --- DEBTS API ---
  getDebts() {
    return [...(this.data.debts || [])];
  }

  addDebt(payload) {
    const newDebt = {
      id: uid('debt'),
      status: 'unpaid',
      createdAt: new Date().toISOString(),
      ...payload
    };
    if (!this.data.debts) this.data.debts = [];
    this.data.debts.unshift(newDebt);
    this.save();
    return newDebt;
  }

  toggleDebtPaid(id) {
    const d = (this.data.debts || []).find(x => x.id === id);
    if (d) {
      d.status = d.status === 'paid' ? 'unpaid' : 'paid';
      this.save();
    }
  }

  deleteDebt(id) {
    if (!id) return;
    const strId = String(id);
    this.data.debts = (this.data.debts || []).filter(x => String(x.id) !== strId);
    this.save();
  }

  // --- BANK ACCOUNTS API ---
  getAccounts() {
    return [...(this.data.bankAccounts || [])];
  }

  updateAccountBalance(id, newBalance) {
    const strId = String(id);
    const acc = (this.data.bankAccounts || []).find(a => String(a.id) === strId);
    if (acc) {
      acc.balance = Number(newBalance) || 0;
      this.save();
    }
  }

  addAccount(name, balance) {
    if (!this.data.bankAccounts) this.data.bankAccounts = [];
    const acc = { id: uid('acc'), name, balance: Number(balance) || 0 };
    this.data.bankAccounts.push(acc);
    this.save();
    return acc;
  }

  deleteAccount(id) {
    if (!id) return;
    const strId = String(id);
    this.data.bankAccounts = (this.data.bankAccounts || []).filter(a => String(a.id) !== strId);
    this.save();
  }

  // --- TOTAL STATS & NET WORTH ---
  getStats() {
    const activeLoans = this.data.loans.filter(l => l.status !== 'settled');
    const settledLoans = this.data.loans.filter(l => l.status === 'settled');

    const totalActiveLent = activeLoans.reduce((sum, l) => sum + (Number(l.principal) || 0), 0);
    const totalSettledLent = settledLoans.reduce((sum, l) => sum + (Number(l.principal) || 0), 0);

    // Only count ledger entries for loans that currently exist (purging orphaned entries from deleted loans)
    const existingLoanIds = new Set(this.data.loans.map(l => String(l.id)));
    const validLedger = (this.data.interestLedger || []).filter(e => !e.loanId || existingLoanIds.has(String(e.loanId)));
    const totalInterest = validLedger.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const totalDebts = (this.data.debts || [])
      .filter(d => d.status !== 'paid')
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    const totalBank = (this.data.bankAccounts || []).reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

    const netWorth = (totalBank + totalActiveLent + totalInterest) - totalDebts;

    const today = getTodayStr();
    const overdueCount = activeLoans.filter(l => l.returnDueDate < today).length;

    // Overall return percentage (Total Interest Collected / Total Active Lent)
    const overallReturnPct = totalActiveLent > 0
      ? Math.round((totalInterest / totalActiveLent) * 10000) / 100
      : 0;

    // Weighted average interest rate across active loans
    const totalActiveWithRate = activeLoans.reduce((sum, l) => sum + ((Number(l.principal) || 0) * (Number(l.interestRate) || 0)), 0);
    const weightedAvgRate = totalActiveLent > 0
      ? Math.round((totalActiveWithRate / totalActiveLent) * 100) / 100
      : 0;

    return {
      totalActiveLent,
      totalSettledLent,
      totalInterest,
      totalDebts,
      totalBank,
      netWorth,
      overallReturnPct,
      weightedAvgRate,
      activeCount: activeLoans.length,
      settledCount: settledLoans.length,
      overdueCount
    };
  }

  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  importJSON(str) {
    try {
      const parsed = JSON.parse(str);
      if (parsed.loans) {
        this.data = parsed;
        this.save();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  resetData() {
    this.data = generateSampleData();
    this.save();
  }
}

export const state = new StateManager();
