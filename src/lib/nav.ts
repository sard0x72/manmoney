import type { ComponentType } from 'react';
import {
  LayoutDashboard, ReceiptText, PieChart, BarChart3,
  Target, GraduationCap, HandCoins, Repeat, Tag, Wallet,
} from 'lucide-react';
import type { Page } from '../types';
import type { HideableSection } from '../store/useAppStore';

export interface NavItem {
  label: string;
  desc: string;
  icon: ComponentType<{ size?: number }>;
  hideable?: HideableSection;
}

/** Sidebar entries, shared by the Sidebar and the Settings menu editor. Order lives in the store. */
export const NAV_ITEMS: Record<Exclude<Page, 'settings'>, NavItem> = {
  dashboard:    { label: 'Dashboard',    icon: LayoutDashboard, desc: 'Your overview: balances, this month, recent activity.' },
  transactions: { label: 'Transactions', icon: ReceiptText,     desc: 'Log and browse every income and expense entry.',   hideable: 'transactions' },
  budgets:      { label: 'Budgets',      icon: PieChart,        desc: 'Set monthly spending limits per category.',        hideable: 'budgets' },
  analytics:    { label: 'Analytics',    icon: BarChart3,       desc: 'Charts and trends across your financial data.',    hideable: 'analytics' },
  goals:        { label: 'Goals',        icon: Target,          desc: 'Track savings targets and milestones.',            hideable: 'goals' },
  tuition:      { label: 'Tuition',      icon: GraduationCap,   desc: 'Track tuition fees: what you paid and what is left.', hideable: 'tuition' },
  loans:        { label: 'Loans',        icon: HandCoins,       desc: 'Money you borrowed from or lent to friends.',      hideable: 'loans' },
  recurring:    { label: 'Recurring',    icon: Repeat,          desc: 'Manage bills, subscriptions, and regular income.', hideable: 'recurring' },
  categories:   { label: 'Categories',   icon: Tag,             desc: 'Organise transactions with custom categories.',   hideable: 'categories' },
  accounts:     { label: 'Accounts',     icon: Wallet,          desc: 'Bank accounts, wallets, and credit cards.',        hideable: 'accounts' },
};
