import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { Sidebar } from './components/layout/Sidebar';
import { Toast } from './components/ui/Toast';
import { Dashboard } from './components/pages/Dashboard';
import { Transactions } from './components/pages/Transactions';
import { Budgets } from './components/pages/Budgets';
import { Analytics } from './components/pages/Analytics';
import { Goals } from './components/pages/Goals';
import { Recurring } from './components/pages/Recurring';
import { Categories } from './components/pages/Categories';
import { Accounts } from './components/pages/Accounts';
import { Settings } from './components/pages/Settings';

const PAGE_MAP = {
  dashboard: Dashboard,
  transactions: Transactions,
  budgets: Budgets,
  analytics: Analytics,
  goals: Goals,
  recurring: Recurring,
  categories: Categories,
  accounts: Accounts,
  settings: Settings,
} as const;

export default function App() {
  const { currentPage, isDark, fetchAll, loading } = useAppStore();

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  useEffect(() => {
    fetchAll();
  }, []);

  const PageComponent = PAGE_MAP[currentPage] ?? Dashboard;

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--bg))]">
      <Sidebar />
      <main className="flex-1 min-w-0 h-full overflow-hidden animate-fade-in">
        {loading && currentPage === 'dashboard' ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[hsl(var(--text-muted))]">Loading your finances…</p>
            </div>
          </div>
        ) : (
          <PageComponent />
        )}
      </main>
      <Toast />
    </div>
  );
}
