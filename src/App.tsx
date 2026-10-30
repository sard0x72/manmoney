import { useEffect } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { Monitor } from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { Sidebar } from './components/layout/Sidebar';
import { Toast } from './components/ui/Toast';
import { QuickAdd } from './components/forms/QuickAdd';
import { Dashboard } from './components/pages/Dashboard';
import { Transactions } from './components/pages/Transactions';
import { Budgets } from './components/pages/Budgets';
import { Analytics } from './components/pages/Analytics';
import { Goals } from './components/pages/Goals';
import { Tuition } from './components/pages/Tuition';
import { Loans } from './components/pages/Loans';
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
  tuition: Tuition,
  loans: Loans,
  recurring: Recurring,
  categories: Categories,
  accounts: Accounts,
  settings: Settings,
} as const;

function NotTauriScreen() {
  return (
    <div className="flex h-screen items-center justify-center" style={{ background: 'var(--paper)' }}>
      <div className="text-center max-w-sm px-6 flex flex-col items-center">
        <div style={{
          width: 56, height: 56, borderRadius: 16, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--paper-sunk)', color: 'var(--ink-muted)',
        }}>
          <Monitor size={24} />
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Desktop app required</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          ManMoney must run as a desktop application. Open a terminal in the project folder and run:
        </p>
        <code className="block rounded-xl px-4 py-3 text-sm font-mono" style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text-primary)' }}>
          npm run tauri dev
        </code>
      </div>
    </div>
  );
}

export default function App() {
  // Checked before any hook runs: hooks can't follow an early return in the same component.
  if (!isTauri()) return <NotTauriScreen />;
  return <AppShell />;
}

function AppShell() {
  const { currentPage, fetchAll, loading } = useAppStore();

  useEffect(() => {
    fetchAll();
  }, []);

  const PageComponent = PAGE_MAP[currentPage] ?? Dashboard;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--paper)' }}>
      <Sidebar />
      <main className="flex-1 min-w-0 h-full overflow-hidden animate-fade-in">
        {loading && currentPage === 'dashboard' ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--clay)', borderTopColor: 'transparent' }} />
              <p className="text-sm text-[hsl(var(--text-muted))]">Loading your finances…</p>
            </div>
          </div>
        ) : (
          <PageComponent />
        )}
      </main>
      <QuickAdd />
      <Toast />
    </div>
  );
}
