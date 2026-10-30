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
  /** Setup pages, listed apart under "Manage" since they aren't daily use. */
  manage?: boolean;
}

/** Sidebar entries, shared by the Sidebar and the Settings menu editor. Order lives in the store. */
export const NAV_ITEMS: Record<Exclude<Page, 'settings'>, NavItem> = {
  dashboard:    { label: 'Dashboard',    icon: LayoutDashboard, desc: 'Today at a glance' },
  transactions: { label: 'Transactions', icon: ReceiptText,     desc: 'Everything you spent and earned', hideable: 'transactions' },
  budgets:      { label: 'Budgets',      icon: PieChart,        desc: 'Monthly limits per category',     hideable: 'budgets' },
  analytics:    { label: 'Analytics',    icon: BarChart3,       desc: 'Trends over the year',            hideable: 'analytics' },
  goals:        { label: 'Goals',        icon: Target,          desc: 'Saving toward something',         hideable: 'goals' },
  tuition:      { label: 'Tuition',      icon: GraduationCap,   desc: "Fees and what's left to pay",     hideable: 'tuition' },
  loans:        { label: 'Loans',        icon: HandCoins,       desc: 'Money between you and friends',   hideable: 'loans' },
  recurring:    { label: 'Recurring',    icon: Repeat,          desc: 'Bills and income that repeat',    hideable: 'recurring' },
  categories:   { label: 'Categories',   icon: Tag,             desc: 'How entries are grouped',         hideable: 'categories', manage: true },
  accounts:     { label: 'Accounts',     icon: Wallet,          desc: 'Cash, cards and banks',           hideable: 'accounts', manage: true },
};
