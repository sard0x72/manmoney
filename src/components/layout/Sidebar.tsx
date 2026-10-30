import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { NAV_ITEMS } from '../../lib/nav';
import type { Page } from '../../types';

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
      aria-label={label}
      aria-current={active ? 'page' : undefined}
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
  const { currentPage, setPage, visibleSections, navOrder } = useAppStore();
  const compact = useCompact();

  // Order stays the user's (Settings); setup pages are just listed apart, under "Manage".
  const shown = navOrder.filter((p): p is Exclude<Page, 'settings'> => {
    if (p === 'settings') return false;
    const { hideable } = NAV_ITEMS[p];
    return !hideable || visibleSections[hideable];
  });
  const button = (page: Exclude<Page, 'settings'>) => {
    const { label, icon } = NAV_ITEMS[page];
    return (
      <NavButton key={page} label={label} Icon={icon} active={currentPage === page} onClick={() => setPage(page)} compact={compact} />
    );
  };

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
          src="/logo.svg"
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
        {shown.filter(p => !NAV_ITEMS[p].manage).map(button)}
        {shown.some(p => NAV_ITEMS[p].manage) && (
          <>
            <div style={{ height: 1, background: 'var(--line)', margin: compact ? '8px 4px' : '10px 4px 6px' }} />
            {!compact && (
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 500, color: 'var(--ink-faint)', padding: '0 11px 4px' }}>
                Manage
              </div>
            )}
            {shown.filter(p => NAV_ITEMS[p].manage).map(button)}
          </>
        )}
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
