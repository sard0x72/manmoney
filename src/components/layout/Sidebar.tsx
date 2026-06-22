import {
  LayoutDashboard, ArrowLeftRight, PieChart, BarChart3,
  Target, Repeat, Tag, Wallet, Settings,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { Page } from '../../types';

const NAV_ITEMS: { page: Page; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { page: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { page: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { page: 'budgets',      label: 'Budgets',      icon: PieChart },
  { page: 'analytics',   label: 'Analytics',    icon: BarChart3 },
  { page: 'goals',        label: 'Goals',        icon: Target },
  { page: 'recurring',    label: 'Recurring',    icon: Repeat },
  { page: 'categories',   label: 'Categories',   icon: Tag },
  { page: 'accounts',     label: 'Accounts',     icon: Wallet },
];

function NavButton({ label, Icon, active, onClick }: {
  label: string; Icon: React.ComponentType<{ size?: number }>;
  active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '8px 11px',
        borderRadius: 'var(--radius)',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 13.5,
        fontWeight: active ? 600 : 500,
        background: active ? 'var(--clay-tint)' : 'transparent',
        color: active ? 'var(--clay-ink)' : 'var(--ink-muted)',
        textAlign: 'left',
        transition: 'background 120ms, color 120ms',
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--paper-sunk)';
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {active && (
        <span style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 3,
          height: 20,
          borderRadius: '0 2px 2px 0',
          background: 'var(--clay)',
        }} />
      )}
      <Icon size={17} />
      {label}
    </button>
  );
}

export function Sidebar() {
  const { currentPage, setPage } = useAppStore();

  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      flexShrink: 0,
      height: '100%',
      background: 'var(--surface)',
      borderRight: '1px solid var(--line)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Wordmark */}
      <div style={{ padding: '22px 20px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src="/logo.png"
          alt="ManMoney"
          style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, boxShadow: 'var(--shadow-sm)' }}
        />
        <span style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--ink-strong)',
          letterSpacing: '-0.01em',
        }}>
          ManMoney
        </span>
      </div>


      {/* Nav */}
      <nav style={{
        flex: 1,
        padding: '4px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflowY: 'auto',
      }}>
        {NAV_ITEMS.map(({ page, label, icon: Icon }) => (
          <NavButton
            key={page}
            label={label}
            Icon={Icon}
            active={currentPage === page}
            onClick={() => setPage(page)}
          />
        ))}
      </nav>

      {/* Foot */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        <NavButton
          label="Settings"
          Icon={Settings}
          active={currentPage === 'settings'}
          onClick={() => setPage('settings')}
        />
      </div>
    </aside>
  );
}
