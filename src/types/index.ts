export interface Account {
  id: string;
  name: string;
  account_type: 'cash' | 'bank' | 'credit' | 'investment';
  balance: number;
  currency: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  category_type: 'income' | 'expense';
  color: string;
  icon: string;
  is_default: boolean;
}

export interface Transaction {
  id: string;
  account_id: string;
  category_id: string;
  transaction_type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  notes: string;
  payee: string;
  payment_method: string;
  tags: string;
  is_recurring: boolean;
  recurring_id?: string;
  transfer_account_id?: string;
  created_at: string;
  updated_at: string;
  // joined
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  account_name?: string;
}

export interface Budget {
  id: string;
  category_id: string;
  amount: number;
  period: string;
  year: number;
  month: number;
  spent?: number;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  color: string;
  icon: string;
  notes: string;
  created_at: string;
}

export interface RecurringTransaction {
  id: string;
  account_id: string;
  category_id: string;
  transaction_type: string;
  amount: number;
  payee: string;
  notes: string;
  payment_method: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  next_date: string;
  end_date?: string;
  is_active: boolean;
  category_name?: string;
  account_name?: string;
}

export interface DashboardData {
  total_balance: number;
  month_income: number;
  month_expenses: number;
  month_savings: number;
  month_budget_total: number;
  month_budget_spent: number;
  net_worth: number;
  accounts: Account[];
}

export interface SpendingByCategory {
  category_id: string;
  category_name: string;
  category_color: string;
  category_icon: string;
  amount: number;
  count: number;
}

export interface DailySpending {
  date: string;
  income: number;
  expenses: number;
}

export type Page =
  | 'dashboard'
  | 'transactions'
  | 'budgets'
  | 'analytics'
  | 'goals'
  | 'recurring'
  | 'categories'
  | 'accounts'
  | 'settings';
