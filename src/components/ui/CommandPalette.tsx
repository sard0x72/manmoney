import { useMemo, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import { useAppStore, type HideableSection } from '../../store/useAppStore';
import { NAV_ITEMS } from '../../lib/nav';
import { api } from '../../lib/api';
import { downloadBlob, todayISO } from '../../lib/utils';
import type { Page } from '../../types';

interface Command { label: string; run: () => void }

/** Ctrl/⌘+K: jump to a page or start an action by typing a few letters. */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const { navOrder, visibleSections, setPage, openQuickAdd, addOn, showToast } = useAppStore();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const shown = (p: Page) => {
      const h = p === 'settings' ? undefined : NAV_ITEMS[p].hideable;
      return !h || visibleSections[h as HideableSection];
    };
    const pages: Command[] = [...navOrder, 'settings' as Page].filter(shown).map(p => ({
      label: `Go to ${p === 'settings' ? 'Settings' : NAV_ITEMS[p].label}`,
      run: () => setPage(p),
    }));
    const adds: [string, Page][] = [
      ['Add loan or split a bill', 'loans'], ['Add budget', 'budgets'], ['Add goal', 'goals'],
      ['Add account', 'accounts'], ['Add category', 'categories'], ['Add recurring', 'recurring'], ['Add tuition', 'tuition'],
    ];
    const actions: Command[] = [
      { label: 'Add transaction', run: () => openQuickAdd('transaction') },
      { label: 'Add expense', run: () => openQuickAdd('expense') },
      { label: 'Add income', run: () => openQuickAdd('income') },
      ...adds.filter(([, p]) => shown(p)).map(([label, p]) => ({ label, run: () => addOn(p) })),
      {
        label: 'Export backup',
        run: async () => {
          try {
            downloadBlob(await api.export.backup(), `manmoney-backup-${todayISO()}.json`, 'application/json');
            showToast('Backup saved');
          } catch (e: any) { showToast(e?.toString() ?? 'Backup failed', 'error'); }
        },
      },
    ];
    return [...actions, ...pages];
  }, [navOrder, visibleSections]);

  const q = query.trim().toLowerCase();
  const matches = q ? commands.filter(c => c.label.toLowerCase().includes(q)) : commands;
  const current = Math.min(active, Math.max(matches.length - 1, 0));

  const run = (c?: Command) => { if (!c) return; onClose(); c.run(); };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center animate-fade-in" style={{ paddingTop: '14vh' }}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="relative w-full max-w-md mx-4 card shadow-modal animate-slide-up" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
          <Search size={16} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />
          <input autoFocus value={query} placeholder="Type a command" aria-label="Command"
            role="combobox" aria-expanded aria-controls="palette-list" aria-activedescendant={matches.length ? `palette-${current}` : undefined}
            onChange={e => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((current + 1) % Math.max(matches.length, 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((current - 1 + matches.length) % Math.max(matches.length, 1)); }
              else if (e.key === 'Enter') { e.preventDefault(); run(matches[current]); }
              else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
            }}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--ink)' }} />
        </div>
        <ul id="palette-list" role="listbox" style={{ maxHeight: 320, overflowY: 'auto', padding: 6, margin: 0, listStyle: 'none' }}>
          {matches.length === 0 && (
            <li style={{ padding: '10px 10px', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-faint)' }}>No matches</li>
          )}
          {matches.map((c, i) => (
            <li key={c.label} id={`palette-${i}`} role="option" aria-selected={i === current}
              onMouseEnter={() => setActive(i)} onClick={() => run(c)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--ink)',
                background: i === current ? 'var(--paper-sunk)' : 'transparent',
              }}>
              {c.label}
              {i === current && <CornerDownLeft size={13} style={{ color: 'var(--ink-faint)' }} />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
