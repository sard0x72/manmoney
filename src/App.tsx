import { useEffect } from 'react';
import { isTauri } from '@tauri-apps/api/core';
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

function NotTauriScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-[hsl(var(--bg))]">
      <div className="text-center max-w-sm px-6">
        <div className="text-5xl mb-4">🖥️</div>
        <h1 className="text-xl font-bold text-[hsl(var(--text))] mb-2">Desktop App Required</h1>
        <p className="text-sm text-[hsl(var(--text-muted))] mb-6">
          ManMoney must run as a desktop application. Open a terminal in the project folder and run:
        </p>
        <code className="block bg-[hsl(var(--surface))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 text-sm font-mono text-[hsl(var(--text))]">
          npm run tauri dev
        </code>
      </div>
    </div>
  );
}

export default function App() {
  const { currentPage, isDark, fetchAll, loading } = useAppStore();

  if (!isTauri()) return <NotTauriScreen />;

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
