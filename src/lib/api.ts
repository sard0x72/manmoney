import { invoke } from '@tauri-apps/api/core';
import type {
  Account, Category, Transaction, Budget, SavingsGoal,
  RecurringTransaction, DashboardData, SpendingByCategory, DailySpending,
  TuitionFee, TuitionPayment, Loan, LoanRepayment, Stats, AccountUsage
} from '../types';

// ── Accounts ──────────────────────────────────────────────────────────────────
export const api = {
  accounts: {
    list: () => invoke<Account[]>('get_accounts'),
    create: (data: Omit<Account, 'id' | 'created_at'>) =>
      invoke<Account>('create_account', {
        name: data.name,
        accountType: data.account_type,
        balance: data.balance,
        currency: data.currency,
        color: data.color,
        icon: data.icon,
      }),
    update: (data: Pick<Account, 'id' | 'name' | 'account_type' | 'currency' | 'color' | 'icon'>) =>
      invoke<void>('update_account', {
        id: data.id,
        name: data.name,
        accountType: data.account_type,
        currency: data.currency,
        color: data.color,
        icon: data.icon,
      }),
    setCurrency: (currency: string) => invoke<void>('set_accounts_currency', { currency }),
    delete: (id: string) => invoke<void>('delete_account', { id }),
    usage: () => invoke<AccountUsage[]>('get_account_usage'),
    /** Moves everything from one account into another, then deletes the first. */
    merge: (fromId: string, toId: string) => invoke<void>('merge_account', { fromId, toId }),
  },

  categories: {
    list: () => invoke<Category[]>('get_categories'),
    create: (data: Pick<Category, 'name' | 'category_type' | 'color' | 'icon'>) =>
      invoke<Category>('create_category', {
        name: data.name,
        categoryType: data.category_type,
        color: data.color,
        icon: data.icon,
      }),
    update: (data: Pick<Category, 'id' | 'name' | 'color' | 'icon'>) =>
      invoke<void>('update_category', data),
    delete: (id: string) => invoke<void>('delete_category', { id }),
  },

  transactions: {
    list: (filters?: {
      limit?: number;
      offset?: number;
      account_id?: string;
      category_id?: string;
      transaction_type?: string;
      search?: string;
      date_from?: string;
      date_to?: string;
    }) => invoke<Transaction[]>('get_transactions', filters ? {
      limit: filters.limit,
      offset: filters.offset,
      accountId: filters.account_id,
      categoryId: filters.category_id,
      transactionType: filters.transaction_type,
      search: filters.search,
      dateFrom: filters.date_from,
      dateTo: filters.date_to,
    } : {}),
    create: (data: {
      account_id: string;
      category_id: string;
      transaction_type: string;
      amount: number;
      date: string;
      notes: string;
      payee: string;
      payment_method: string;
      tags: string;
    }) => invoke<Transaction>('create_transaction', {
      accountId: data.account_id,
      categoryId: data.category_id,
      transactionType: data.transaction_type,
      amount: data.amount,
      date: data.date,
      notes: data.notes,
      payee: data.payee,
      paymentMethod: data.payment_method,
      tags: data.tags,
    }),
    update: (data: {
      id: string;
      account_id: string;
      category_id: string;
      transaction_type: string;
      amount: number;
      date: string;
      notes: string;
      payee: string;
      payment_method: string;
      tags: string;
    }) => invoke<void>('update_transaction', {
      id: data.id,
      accountId: data.account_id,
      categoryId: data.category_id,
      transactionType: data.transaction_type,
      amount: data.amount,
      date: data.date,
      notes: data.notes,
      payee: data.payee,
      paymentMethod: data.payment_method,
      tags: data.tags,
    }),
    delete: (id: string) => invoke<void>('delete_transaction', { id }),
  },

  budgets: {
    list: (year: number, month: number) => invoke<Budget[]>('get_budgets', { year, month }),
    upsert: (data: { category_id: string; amount: number; year: number; month: number }) =>
      invoke<void>('upsert_budget', {
        categoryId: data.category_id,
        amount: data.amount,
        year: data.year,
        month: data.month,
      }),
    delete: (id: string) => invoke<void>('delete_budget', { id }),
  },

  goals: {
    list: () => invoke<SavingsGoal[]>('get_savings_goals'),
    create: (data: Omit<SavingsGoal, 'id' | 'created_at'>) =>
      invoke<SavingsGoal>('create_savings_goal', {
        name: data.name,
        targetAmount: data.target_amount,
        currentAmount: data.current_amount,
        deadline: data.deadline,
        color: data.color,
        icon: data.icon,
        notes: data.notes,
      }),
    update: (data: Omit<SavingsGoal, 'created_at'>) =>
      invoke<void>('update_savings_goal', {
        id: data.id,
        name: data.name,
        targetAmount: data.target_amount,
        currentAmount: data.current_amount,
        deadline: data.deadline,
        color: data.color,
        icon: data.icon,
        notes: data.notes,
      }),
    delete: (id: string) => invoke<void>('delete_savings_goal', { id }),
  },

  tuition: {
    list: () => invoke<TuitionFee[]>('get_tuition_fees'),
    create: (data: Pick<TuitionFee, 'name' | 'total_amount' | 'due_date' | 'notes'>) =>
      invoke<void>('create_tuition_fee', {
        name: data.name,
        totalAmount: data.total_amount,
        dueDate: data.due_date,
        notes: data.notes,
      }),
    update: (data: Pick<TuitionFee, 'id' | 'name' | 'total_amount' | 'due_date' | 'notes'>) =>
      invoke<void>('update_tuition_fee', {
        id: data.id,
        name: data.name,
        totalAmount: data.total_amount,
        dueDate: data.due_date,
        notes: data.notes,
      }),
    delete: (id: string) => invoke<void>('delete_tuition_fee', { id }),
    payments: (tuitionId: string) => invoke<TuitionPayment[]>('get_tuition_payments', { tuitionId }),
    pay: (data: { tuition_id: string; account_id: string; amount: number; date: string; notes: string; payment_method: string }) =>
      invoke<void>('add_tuition_payment', {
        tuitionId: data.tuition_id,
        accountId: data.account_id,
        amount: data.amount,
        date: data.date,
        notes: data.notes,
        paymentMethod: data.payment_method,
      }),
  },

  loans: {
    list: () => invoke<Loan[]>('get_loans'),
    create: (data: Pick<Loan, 'person' | 'direction' | 'amount' | 'account_id' | 'date' | 'due_date' | 'notes'>) =>
      invoke<void>('create_loan', {
        person: data.person,
        direction: data.direction,
        amount: data.amount,
        accountId: data.account_id,
        date: data.date,
        dueDate: data.due_date,
        notes: data.notes,
      }),
    update: (data: Pick<Loan, 'id' | 'person' | 'amount' | 'due_date' | 'notes'>) =>
      invoke<void>('update_loan', {
        id: data.id,
        person: data.person,
        amount: data.amount,
        dueDate: data.due_date,
        notes: data.notes,
      }),
    delete: (id: string) => invoke<void>('delete_loan', { id }),
    repayments: (loanId: string) => invoke<LoanRepayment[]>('get_loan_repayments', { loanId }),
    addRepayment: (data: { loan_id: string; amount: number; account_id: string; date: string; notes: string }) =>
      invoke<void>('add_loan_repayment', {
        loanId: data.loan_id,
        amount: data.amount,
        accountId: data.account_id,
        date: data.date,
        notes: data.notes,
      }),
    deleteRepayment: (id: string) => invoke<void>('delete_loan_repayment', { id }),
    /** A bill shared with a friend: your share becomes an expense, the rest a loan. */
    createShared: (data: {
      person: string; paid_by: 'friend' | 'me'; total: number; my_share: number;
      account_id: string; category_id: string; date: string; due_date?: string; notes: string;
    }) =>
      invoke<void>('create_shared_expense', {
        person: data.person,
        paidBy: data.paid_by,
        total: data.total,
        myShare: data.my_share,
        accountId: data.account_id,
        categoryId: data.category_id,
        date: data.date,
        dueDate: data.due_date,
        notes: data.notes,
      }),
    /** Cancels a friend's loans against each other; resolves to the amount cancelled. */
    offset: (loanIds: string[], date: string) => invoke<number>('offset_loans', { loanIds, date }),
  },

  recurring: {
    list: () => invoke<RecurringTransaction[]>('get_recurring_transactions'),
    create: (data: Omit<RecurringTransaction, 'id' | 'next_date' | 'is_active' | 'category_name' | 'account_name'>) =>
      invoke<void>('create_recurring_transaction', {
        accountId: data.account_id,
        categoryId: data.category_id,
        transactionType: data.transaction_type,
        amount: data.amount,
        payee: data.payee,
        notes: data.notes,
        paymentMethod: data.payment_method,
        frequency: data.frequency,
        startDate: data.start_date,
        endDate: data.end_date,
      }),
    update: (data: Omit<RecurringTransaction, 'next_date' | 'is_active' | 'category_name' | 'account_name'>) =>
      invoke<void>('update_recurring_transaction', {
        id: data.id,
        accountId: data.account_id,
        categoryId: data.category_id,
        transactionType: data.transaction_type,
        amount: data.amount,
        payee: data.payee,
        notes: data.notes,
        paymentMethod: data.payment_method,
        frequency: data.frequency,
        startDate: data.start_date,
        endDate: data.end_date,
      }),
    setActive: (id: string, active: boolean) => invoke<void>('set_recurring_active', { id, active }),
    delete: (id: string) => invoke<void>('delete_recurring_transaction', { id }),
    /** Adds the transactions that fell due up to `today`; resolves to how many were added. */
    process: (today: string) => invoke<number>('process_recurring', { today }),
  },

  analytics: {
    dashboard: () => invoke<DashboardData>('get_dashboard_data'),
    byCategory: (date_from: string, date_to: string, transaction_type: string) =>
      invoke<SpendingByCategory[]>('get_spending_by_category', {
        dateFrom: date_from,
        dateTo: date_to,
        transactionType: transaction_type,
      }),
    daily: (date_from: string, date_to: string) =>
      invoke<DailySpending[]>('get_daily_spending', {
        dateFrom: date_from,
        dateTo: date_to,
      }),
  },

  export: {
    csv: () => invoke<string>('export_transactions_csv'),
    dbPath: () => invoke<string>('get_db_path'),
    /** Every table, every row, as JSON text. */
    backup: () => invoke<string>('export_backup'),
    /** Replaces all data with a backup; the current database is copied aside first. */
    restore: (json: string) => invoke<void>('import_backup', { json }),
  },

  stats: () => invoke<Stats>('get_stats'),
};
