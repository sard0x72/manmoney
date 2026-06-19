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
      invoke<Account>('create_account', data),
    update: (data: Pick<Account, 'id' | 'name' | 'account_type' | 'currency' | 'color' | 'icon'>) =>
      invoke<void>('update_account', data),
    delete: (id: string) => invoke<void>('delete_account', { id }),
  },

  categories: {
    list: () => invoke<Category[]>('get_categories'),
    create: (data: Pick<Category, 'name' | 'category_type' | 'color' | 'icon'>) =>
      invoke<Category>('create_category', data),
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
    }) => invoke<Transaction[]>('get_transactions', filters ?? {}),
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
    }) => invoke<Transaction>('create_transaction', data),
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
    }) => invoke<void>('update_transaction', data),
    delete: (id: string) => invoke<void>('delete_transaction', { id }),
  },

  budgets: {
    list: (year: number, month: number) => invoke<Budget[]>('get_budgets', { year, month }),
    upsert: (data: { category_id: string; amount: number; year: number; month: number }) =>
      invoke<void>('upsert_budget', data),
    delete: (id: string) => invoke<void>('delete_budget', { id }),
  },

  goals: {
    list: () => invoke<SavingsGoal[]>('get_savings_goals'),
    create: (data: Omit<SavingsGoal, 'id' | 'created_at'>) =>
      invoke<SavingsGoal>('create_savings_goal', data),
    update: (data: Omit<SavingsGoal, 'created_at'>) =>
      invoke<void>('update_savings_goal', data),
    delete: (id: string) => invoke<void>('delete_savings_goal', { id }),
  },

  recurring: {
    list: () => invoke<RecurringTransaction[]>('get_recurring_transactions'),
    create: (data: Omit<RecurringTransaction, 'id' | 'next_date' | 'is_active' | 'category_name' | 'account_name'>) =>
      invoke<void>('create_recurring_transaction', data),
    delete: (id: string) => invoke<void>('delete_recurring_transaction', { id }),
  },

  analytics: {
    dashboard: () => invoke<DashboardData>('get_dashboard_data'),
    byCategory: (date_from: string, date_to: string, transaction_type: string) =>
      invoke<SpendingByCategory[]>('get_spending_by_category', { date_from, date_to, transaction_type }),
    daily: (date_from: string, date_to: string) =>
      invoke<DailySpending[]>('get_daily_spending', { date_from, date_to }),
  },

  export: {
    csv: () => invoke<string>('export_transactions_csv'),
    dbPath: () => invoke<string>('get_db_path'),
  },
};
