import { create } from 'zustand';
import type { Account, Category, Transaction, Budget, SavingsGoal, RecurringTransaction, DashboardData, Page } from '../types';
import { api } from '../lib/api';
import { currentYear, currentMonth } from '../lib/utils';

interface AppState {
  // Navigation
  currentPage: Page;
  setPage: (page: Page) => void;

  // Theme
  isDark: boolean;
  toggleTheme: () => void;

  // Data
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  recurring: RecurringTransaction[];
  dashboard: DashboardData | null;

  // Loading states
  loading: boolean;
  transactionsLoading: boolean;

  // Budget period
  budgetYear: number;
  budgetMonth: number;
  setBudgetPeriod: (year: number, month: number) => void;

  // Fetch actions
  fetchAll: () => Promise<void>;
  fetchAccounts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchTransactions: (filters?: Parameters<typeof api.transactions.list>[0]) => Promise<void>;
  fetchBudgets: () => Promise<void>;
  fetchGoals: () => Promise<void>;
  fetchRecurring: () => Promise<void>;
  fetchDashboard: () => Promise<void>;

  // Toast
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentPage: 'dashboard',
  setPage: (page) => set({ currentPage: page }),

  isDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
  toggleTheme: () => {
    const isDark = !get().isDark;
    set({ isDark });
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  goals: [],
  recurring: [],
  dashboard: null,

  loading: false,
  transactionsLoading: false,

  budgetYear: currentYear(),
  budgetMonth: currentMonth(),
  setBudgetPeriod: (year, month) => {
    set({ budgetYear: year, budgetMonth: month });
    get().fetchBudgets();
  },

  fetchAll: async () => {
    set({ loading: true });
    await Promise.all([
      get().fetchAccounts(),
      get().fetchCategories(),
      get().fetchTransactions({ limit: 100 }),
      get().fetchDashboard(),
      get().fetchBudgets(),
      get().fetchGoals(),
      get().fetchRecurring(),
    ]);
    set({ loading: false });
  },

  fetchAccounts: async () => {
    try {
      const accounts = await api.accounts.list();
      set({ accounts });
    } catch (e) {
      console.error('fetchAccounts', e);
    }
  },

  fetchCategories: async () => {
    try {
      const categories = await api.categories.list();
      set({ categories });
    } catch (e) {
      console.error('fetchCategories', e);
    }
  },

  fetchTransactions: async (filters) => {
    set({ transactionsLoading: true });
    try {
      const transactions = await api.transactions.list(filters ?? { limit: 200 });
      set({ transactions });
    } catch (e) {
      console.error('fetchTransactions', e);
    } finally {
      set({ transactionsLoading: false });
    }
  },

  fetchBudgets: async () => {
    try {
      const { budgetYear, budgetMonth } = get();
      const budgets = await api.budgets.list(budgetYear, budgetMonth);
      set({ budgets });
    } catch (e) {
      console.error('fetchBudgets', e);
    }
  },

  fetchGoals: async () => {
    try {
      const goals = await api.goals.list();
      set({ goals });
    } catch (e) {
      console.error('fetchGoals', e);
    }
  },

  fetchRecurring: async () => {
    try {
      const recurring = await api.recurring.list();
      set({ recurring });
    } catch (e) {
      console.error('fetchRecurring', e);
    }
  },

  fetchDashboard: async () => {
    try {
      const dashboard = await api.analytics.dashboard();
      set({ dashboard });
    } catch (e) {
      console.error('fetchDashboard', e);
    }
  },

  toast: null,
  showToast: (message, type = 'success') => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3500);
  },
  clearToast: () => set({ toast: null }),
}));
