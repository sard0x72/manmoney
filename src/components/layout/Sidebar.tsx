import {
  LayoutDashboard, ArrowLeftRight, PieChart, BarChart3,
  Target, Repeat, Tag, Wallet, Settings, Sun, Moon, BadgeDollarSign
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';
import type { Page } from '../../types';

const NAV_ITEMS: { page: Page; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { page: 'budgets', label: 'Budgets', icon: PieChart },
  { page: 'analytics', label: 'Analytics', icon: BarChart3 },
  { page: 'goals', label: 'Goals', icon: Target },
  { page: 'recurring', label: 'Recurring', icon: Repeat },
  { page: 'categories', label: 'Categories', icon: Tag },
  { page: 'accounts', label: 'Accounts', icon: Wallet },
];

export function Sidebar() {
  const { currentPage, setPage, isDark, toggleTheme } = useAppStore();

  return (
    <aside className="w-[220px] flex-shrink-0 h-full bg-[hsl(var(--surface))] border-r border-[hsl(var(--border))] flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[hsl(var(--border))]">
        <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
          <BadgeDollarSign size={18} className="text-white" />
        </div>
        <span className="text-base font-bold text-[hsl(var(--text))] tracking-tight">ManMoney</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ page, label, icon: Icon }) => {
          const active = currentPage === page;
          return (
            <button
              key={page}
              onClick={() => setPage(page)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-100',
                active
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--text))]'
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-[hsl(var(--border))] space-y-0.5">
        <button
          onClick={() => setPage('settings')}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-100',
            currentPage === 'settings'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--text))]'
          )}
        >
          <Settings size={16} />
          Settings
        </button>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--text))] transition-all duration-100"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
    </aside>
  );
}
