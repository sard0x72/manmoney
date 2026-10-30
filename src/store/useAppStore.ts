import { create } from 'zustand';
import type { Account, Category, Transaction, Budget, SavingsGoal, TuitionFee, Loan, RecurringTransaction, DashboardData, Page } from '../types';
import { api } from '../lib/api';
import { currentYear, currentMonth, setAppCurrency, todayISO } from '../lib/utils';

export type HideableSection = 'transactions' | 'budgets' | 'analytics' | 'goals' | 'tuition' | 'loans' | 'recurring' | 'categories' | 'accounts';

export const HIDEABLE_SECTIONS: HideableSection[] = ['transactions', 'budgets', 'analytics', 'goals', 'tuition', 'loans', 'recurring', 'categories', 'accounts'];

const DEFAULT_VISIBLE: Record<HideableSection, boolean> = {
  transactions: true, budgets: true, analytics: true, goals: true, tuition: true,
  loans: true, recurring: true, categories: true, accounts: true,
};

// Sidebar order (Settings stays pinned at the bottom).
export const DEFAULT_NAV_ORDER: Page[] = ['dashboard', 'transactions', 'budgets', 'analytics', 'goals', 'tuition', 'loans', 'recurring', 'categories', 'accounts'];

// Keeps a saved order valid across app updates: drops pages that no longer
// exist and appends new ones at the end.
function loadNavOrder(): Page[] {
  try {
    const raw = localStorage.getItem('mm_nav_order');
    if (raw) {
      const saved = (JSON.parse(raw) as Page[]).filter(p => DEFAULT_NAV_ORDER.includes(p));
      return [...saved, ...DEFAULT_NAV_ORDER.filter(p => !saved.includes(p))];
    }
  } catch {}
  return [...DEFAULT_NAV_ORDER];
}

function loadVisibleSections(): Record<HideableSection, boolean> {
  try {
    const raw = localStorage.getItem('mm_visible_sections');
    if (raw) return { ...DEFAULT_VISIBLE, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_VISIBLE };
}

function saveVisibleSections(v: Record<HideableSection, boolean>) {
  localStorage.setItem('mm_visible_sections', JSON.stringify(v));
}

function loadCurrency(): string | null {
  try { return localStorage.getItem('mm_currency'); } catch { return null; }
}

const savedCurrency = loadCurrency();
const initialCurrency = savedCurrency ?? 'USD';
setAppCurrency(initialCurrency);
let currencyChosen = savedCurrency !== null;

// One timer for the one toast on screen. A new toast clears the old timer, so
// it can't hide the new toast early.
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let toastSeq = 0;

export type QuickAddKind = 'transaction';

interface AppState {
  // Navigation
  currentPage: Page;
  setPage: (page: Page) => void;

  // Section visibility
  visibleSections: Record<HideableSection, boolean>;
  toggleSection: (section: HideableSection) => void;

  // Sidebar order
  navOrder: Page[];
  moveNavItem: (page: Page, direction: -1 | 1) => void;
  resetNavOrder: () => void;

  // The single currency used for every account and amount
  currency: string;
  setCurrency: (currency: string) => Promise<void>;

  // Data
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  tuition: TuitionFee[];
  loans: Loan[];
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
  fetchTuition: () => Promise<void>;
  fetchLoans: () => Promise<void>;
  fetchRecurring: () => Promise<void>;
  fetchDashboard: () => Promise<void>;

  // Toast
  toast: { id: number; message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;

  // The one add form that can open from anywhere
  quickAdd: { kind: QuickAddKind } | null;
  openQuickAdd: (kind: QuickAddKind) => void;
  closeQuickAdd: () => void;

  // Bumped after a save from outside the page (quick add), so open lists reload with their own filters
  dataVersion: number;
  bumpData: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentPage: 'dashboard',
  setPage: (page) => {
    const { visibleSections } = get();
    const hideable = HIDEABLE_SECTIONS as readonly string[];
    if (hideable.includes(page) && !visibleSections[page as HideableSection]) {
      set({ currentPage: 'dashboard' });
    } else {
      set({ currentPage: page });
    }
  },

  visibleSections: loadVisibleSections(),
  toggleSection: (section) => {
    const next = { ...get().visibleSections, [section]: !get().visibleSections[section] };
    saveVisibleSections(next);
    set({ visibleSections: next });
    // If currently on a section that just got hidden, go to dashboard
    if (!next[section] && get().currentPage === section) {
      set({ currentPage: 'dashboard' });
    }
  },

  navOrder: loadNavOrder(),
  moveNavItem: (page, direction) => {
    const order = [...get().navOrder];
    const i = order.indexOf(page);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    try { localStorage.setItem('mm_nav_order', JSON.stringify(order)); } catch {}
    set({ navOrder: order });
  },
  resetNavOrder: () => {
    try { localStorage.removeItem('mm_nav_order'); } catch {}
    set({ navOrder: [...DEFAULT_NAV_ORDER] });
  },

  currency: initialCurrency,
  setCurrency: async (currency) => {
    currencyChosen = true;
    setAppCurrency(currency);
    try { localStorage.setItem('mm_currency', currency); } catch {}
    set({ currency });
    try {
      await api.accounts.setCurrency(currency);
      await get().fetchAccounts();
    } catch (e) {
      console.error('setCurrency', e);
    }
  },

  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  goals: [],
  tuition: [],
  loans: [],
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
    // Recurring items post first, so balances and lists below already include them.
    try {
      const added = await api.recurring.process(todayISO());
      if (added > 0) get().showToast(`Added ${added} recurring transaction${added === 1 ? '' : 's'}`, 'info');
    } catch (e) {
      console.error('processRecurring', e);
    }
    await Promise.all([
      get().fetchAccounts(),
      get().fetchCategories(),
      get().fetchTransactions({ limit: 100 }),
      get().fetchDashboard(),
      get().fetchBudgets(),
      get().fetchGoals(),
      get().fetchTuition(),
      get().fetchLoans(),
      get().fetchRecurring(),
    ]);
    set({ loading: false });
  },

  fetchAccounts: async () => {
    try {
      const accounts = await api.accounts.list();
      set({ accounts });
      // First run after the single-currency change: adopt the currency the
      // user's accounts already use instead of defaulting to USD.
      if (!currencyChosen && accounts.length > 0) await get().setCurrency(accounts[0].currency);
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

  fetchTuition: async () => {
    try {
      const tuition = await api.tuition.list();
      set({ tuition });
    } catch (e) {
      console.error('fetchTuition', e);
    }
  },

  fetchLoans: async () => {
    try {
      const loans = await api.loans.list();
      set({ loans });
    } catch (e) {
      console.error('fetchLoans', e);
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
    clearTimeout(toastTimer);
    set({ toast: { id: ++toastSeq, message, type } });
    toastTimer = setTimeout(() => set({ toast: null }), 3500);
  },
  clearToast: () => {
    clearTimeout(toastTimer);
    set({ toast: null });
  },

  quickAdd: null,
  openQuickAdd: (kind) => set({ quickAdd: { kind } }),
  closeQuickAdd: () => set({ quickAdd: null }),

  dataVersion: 0,
  bumpData: () => set(s => ({ dataVersion: s.dataVersion + 1 })),
}));
