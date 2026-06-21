import { invoke } from '@tauri-apps/api/core';
import type {
  Account, Category, Transaction, Budget, SavingsGoal,
  RecurringTransaction, DashboardData, SpendingByCategory, DailySpending
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
    delete: (id: string) => invoke<void>('delete_account', { id }),
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
      transfer_account_id?: string;
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
      transferAccountId: data.transfer_account_id,
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
    delete: (id: string) => invoke<void>('delete_recurring_transaction', { id }),
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
  },
};
