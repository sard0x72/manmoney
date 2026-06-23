import { useEffect, useState } from 'react';
import {
  LayoutDashboard, ArrowLeftRight, PieChart, BarChart3,
  Target, Repeat, Tag, Wallet, Settings,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { HideableSection } from '../../store/useAppStore';
import type { Page } from '../../types';

const NAV_ITEMS: { page: Page; label: string; icon: React.ComponentType<{ size?: number }>; hideable?: HideableSection }[] = [
  { page: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { page: 'transactions', label: 'Transactions', icon: ArrowLeftRight,  hideable: 'transactions' },
  { page: 'budgets',      label: 'Budgets',      icon: PieChart,        hideable: 'budgets' },
  { page: 'analytics',   label: 'Analytics',    icon: BarChart3,       hideable: 'analytics' },
  { page: 'goals',        label: 'Goals',        icon: Target,          hideable: 'goals' },
  { page: 'recurring',    label: 'Recurring',    icon: Repeat,          hideable: 'recurring' },
  { page: 'categories',   label: 'Categories',   icon: Tag,             hideable: 'categories' },
  { page: 'accounts',     label: 'Accounts',     icon: Wallet,          hideable: 'accounts' },
];

function useCompact() {
  const [compact, setCompact] = useState(window.innerWidth <= 1099);
  useEffect(() => {
    const handle = () => setCompact(window.innerWidth <= 1099);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return compact;
}

function NavButton({ label, Icon, active, onClick, compact }: {
  label: string; Icon: React.ComponentType<{ size?: number }>;
  active: boolean; onClick: () => void; compact: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={compact ? label : undefined}
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: compact ? 'center' : 'flex-start',
        gap: compact ? 0 : 9,
        padding: compact ? '10px 0' : '8px 11px',
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
      {active && !compact && (
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
      {!compact && label}
    </button>
  );
}

export function Sidebar() {
  const { currentPage, setPage, visibleSections } = useAppStore();
  const compact = useCompact();

  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      flexShrink: 0,
      height: '100%',
      background: 'var(--surface)',
      borderRight: '1px solid var(--line)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 200ms var(--ease-out)',
      overflow: 'hidden',
    }}>
      {/* Wordmark */}
      <div style={{
        padding: compact ? '16px 0 14px' : '22px 20px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: compact ? 'center' : 'flex-start',
        gap: 10,
        flexShrink: 0,
      }}>
        <img
          src="/logo.png"
          alt="ManMoney"
          style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, boxShadow: 'var(--shadow-sm)' }}
        />
        {!compact && (
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--ink-strong)',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
          }}>
            ManMoney
          </span>
        )}
      </div>

      {/* Nav */}
      <nav style={{
        flex: 1,
        padding: compact ? '4px 8px' : '4px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflowY: 'auto',
      }}>
        {NAV_ITEMS.filter(({ hideable }) => !hideable || visibleSections[hideable]).map(({ page, label, icon: Icon }) => (
          <NavButton
            key={page}
            label={label}
            Icon={Icon}
            active={currentPage === page}
            onClick={() => setPage(page)}
            compact={compact}
          />
        ))}
      </nav>

      {/* Foot */}
      <div style={{
        padding: compact ? '10px 8px' : '10px 12px',
        borderTop: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        flexShrink: 0,
      }}>
        <NavButton
          label="Settings"
          Icon={Settings}
          active={currentPage === 'settings'}
          onClick={() => setPage('settings')}
          compact={compact}
        />
      </div>
    </aside>
  );
}
