import { useEffect, useRef, useState } from 'react';
import { Download, Upload, Database, FileText, FileSpreadsheet, ShieldCheck, ReceiptText, Tag, Wallet, HandCoins, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { useAppStore, DEFAULT_NAV_ORDER } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { downloadBlob, CURRENCIES, todayISO } from '../../lib/utils';
import { NAV_ITEMS } from '../../lib/nav';
import { PageHeader } from '../layout/PageHeader';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { getVersion } from '@tauri-apps/api/app';
import type { Stats } from '../../types';
import * as XLSX from 'xlsx';

function MoveButton({ dir, disabled, onClick, label }: { dir: 'up' | 'down'; disabled: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={label}
      style={{
        display: 'flex', padding: 3, borderRadius: 6, border: 'none', background: 'none',
        cursor: disabled ? 'default' : 'pointer',
        color: disabled ? 'var(--line-strong)' : 'var(--ink-muted)',
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = 'var(--paper-sunk)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}>
      {dir === 'up' ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
    </button>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      style={{
        width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer',
        background: on ? 'var(--clay)' : 'var(--line)',
        position: 'relative', flexShrink: 0,
        transition: 'background 160ms',
        padding: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3,
        left: on ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 160ms',
        display: 'block',
      }} />
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)', marginBottom: 4 }}>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 24, padding: '16px 0', borderBottom: '1px solid var(--line)',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14.5, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
        {desc && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// What a restore would bring in, for the confirm dialog: "1,204 transactions, 6 accounts and 9 loans".
const RESTORE_COUNTS: [string, string][] = [
  ['transactions', 'transaction'], ['accounts', 'account'], ['categories', 'category'], ['loans', 'loan'],
  ['budgets', 'budget'], ['savings_goals', 'goal'], ['recurring_transactions', 'recurring item'], ['tuition_fees', 'tuition fee'],
];

function describeBackup(data: Record<string, unknown>): string {
  const parts = RESTORE_COUNTS.map(([key, noun]) => {
    const n = Array.isArray(data[key]) ? (data[key] as unknown[]).length : 0;
    if (n === 0) return '';
    const plural = noun.endsWith('y') && !noun.endsWith('ay') ? `${noun.slice(0, -1)}ies` : `${noun}s`;
    return `${n.toLocaleString('en-US')} ${n === 1 ? noun : plural}`;
  }).filter(Boolean);
  if (parts.length === 0) return 'It has no data';
  return `It has ${parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`}`;
}

export function Settings() {
  const { currency, setCurrency, fetchAll, showToast, clearToast, visibleSections, toggleSection, navOrder, moveNavItem, resetNavOrder } = useAppStore();
  const isDefaultOrder = navOrder.every((p, i) => p === DEFAULT_NAV_ORDER[i]);
  const [dbPath, setDbPath] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [restore, setRestore] = useState<{ json: string; summary: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Real totals from the database; the store only holds what the open pages loaded.
  const loadStats = () => api.stats().then(setStats).catch(e => console.error('stats', e));
  const [version, setVersion] = useState('');
  useEffect(() => {
    loadStats();
    getVersion().then(setVersion).catch(() => setVersion(''));
  }, []);

  const exportCSV = async () => {
    try {
      const csv = await api.export.csv();
      downloadBlob(csv, `manmoney-export-${todayISO()}.csv`, 'text/csv');
      showToast('Exported');
    } catch (e: any) { showToast(e?.toString() ?? 'Export failed', 'error'); }
  };

  const exportExcel = async () => {
    try {
      // No limit: every transaction, not just the ones a page happens to have loaded.
      const all = await api.transactions.list();
      const rows = all.map(t => ({
        Date: t.date, Type: t.transaction_type, Amount: t.amount,
        Category: t.category_name ?? '', Payee: t.payee, Notes: t.notes,
        Account: t.account_name ?? '', 'Payment Method': t.payment_method, Tags: t.tags,
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Transactions');
      XLSX.writeFile(wb, `manmoney-export-${todayISO()}.xlsx`);
      showToast('Exported');
    } catch { showToast('Export failed', 'error'); }
  };

  const exportBackup = async () => {
    try {
      const json = await api.export.backup();
      downloadBlob(json, `manmoney-backup-${todayISO()}.json`, 'application/json');
      showToast('Backup saved');
    } catch (e: any) { showToast(e?.toString() ?? 'Backup failed', 'error'); }
  };

  const pickBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const json = await file.text();
      const data = JSON.parse(json);
      if (data?.app !== 'manmoney') throw new Error();
      setRestore({ json, summary: describeBackup(data) });
    } catch { showToast("This file isn't a ManMoney backup", 'error'); }
  };

  const doRestore = async () => {
    if (!restore) return;
    try {
      await api.export.restore(restore.json);
      await fetchAll();
      loadStats();
      showToast('Restored');
    } catch (e: any) { showToast(e?.toString() ?? 'Restore failed', 'error'); }
  };

  const showDbPath = async () => {
    try { setDbPath(await api.export.dbPath()); }
    catch { showToast("Couldn't find the database", 'error'); }
  };

  // Only the symbol changes, so switching back is always safe: offer Undo.
  const changeCurrency = (next: string) => {
    const previous = currency;
    if (next === previous) return;
    setCurrency(next);
    showToast(`Currency set to ${next}`, 'success', { label: 'Undo', run: () => { setCurrency(previous); clearToast(); } });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Settings" />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 'var(--prose-max)', padding: 'calc(36px * var(--v-rhythm)) var(--content-h-pad) calc(56px * var(--v-rhythm))' }}>

          <Group title="General">
            <Row label="Currency" desc="Only changes the symbol. Amounts aren't converted.">
              <select value={currency} onChange={e => changeCurrency(e.target.value)} className="input" style={{ width: 110 }} aria-label="Currency">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Row>
          </Group>

          <Group title="Sidebar">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '6px 0 4px' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)' }}>
                Reorder with the arrows. Turn a section off to hide it.
              </p>
              {!isDefaultOrder && (
                <button onClick={resetNavOrder} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', fontSize: 12, flexShrink: 0 }}>
                  <RotateCcw size={12} /> Reset
                </button>
              )}
            </div>
            {navOrder.map((page, i) => {
              if (page === 'settings') return null;
              const { label, desc, icon: Icon, hideable } = NAV_ITEMS[page];
              const hidden = !!hideable && !visibleSections[hideable];
              return (
                <div key={page} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                    <MoveButton dir="up" label={`Move ${label} up`} disabled={i === 0} onClick={() => moveNavItem(page, -1)} />
                    <MoveButton dir="down" label={`Move ${label} down`} disabled={i === navOrder.length - 1} onClick={() => moveNavItem(page, 1)} />
                  </div>
                  <span style={{ color: hidden ? 'var(--ink-faint)' : 'var(--ink-muted)', display: 'flex', flexShrink: 0 }}><Icon size={17} /></span>
                  <div style={{ flex: 1, minWidth: 0, opacity: hidden ? 0.55 : 1 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14.5, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 2 }}>{desc}</div>
                  </div>
                  {hideable
                    ? <Toggle on={visibleSections[hideable]} onChange={() => toggleSection(hideable)} label={`Show ${label}`} />
                    : <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-faint)' }}>Always shown</span>}
                </div>
              );
            })}
          </Group>

          <Group title="Data">
            <Row label="Export transactions" desc="Every transaction, as a spreadsheet.">
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={exportCSV} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <FileText size={14} /> CSV
                </button>
                <button onClick={exportExcel} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <FileSpreadsheet size={14} /> Excel
                </button>
              </div>
            </Row>
            <Row label="Backup" desc="Everything, in one file you can restore later.">
              <button onClick={exportBackup} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Download size={14} /> Backup
              </button>
            </Row>
            <Row label="Restore from backup" desc="Replaces all your data with a backup file.">
              <input ref={fileRef} type="file" accept=".json,application/json" hidden
                onChange={e => { pickBackup(e.target.files?.[0]); e.target.value = ''; }} />
              <button onClick={() => fileRef.current?.click()} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Upload size={14} /> Restore
              </button>
            </Row>
            <Row label="Database location" desc="One SQLite file on this computer.">
              <button onClick={showDbPath} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Database size={14} /> Show path
              </button>
            </Row>
            {dbPath && (
              <div style={{
                marginTop: 8, padding: '10px 14px', borderRadius: 'var(--radius)',
                background: 'var(--paper-sunk)', border: '1px solid var(--line)',
              }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-muted)', wordBreak: 'break-all' }}>{dbPath}</p>
              </div>
            )}
          </Group>

          <Group title="About">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
              <ShieldCheck size={16} style={{ color: 'var(--positive)', flexShrink: 0 }} />
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--ink)' }}>
                Everything stays on this computer. No account, no sync, no tracking.
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 22px', padding: '4px 0 10px' }}>
              {[
                { icon: <ReceiptText size={13} />, value: stats?.transactions, label: 'transactions' },
                { icon: <Wallet size={13} />, value: stats?.accounts, label: 'accounts' },
                { icon: <Tag size={13} />, value: stats?.categories, label: 'categories' },
                { icon: <HandCoins size={13} />, value: stats?.loans, label: 'loans' },
              ].map(stat => (
                <span key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--ink-faint)', display: 'flex' }}>{stat.icon}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>
                    {stat.value?.toLocaleString('en-US') ?? '–'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)' }}>{stat.label}</span>
                </span>
              ))}
            </div>
            {version && (
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)' }}>ManMoney {version}</p>
            )}
          </Group>

        </div>
      </div>

      {restore && (
        <ConfirmDialog title="Restore from backup" confirmLabel="Restore" onConfirm={doRestore} onClose={() => setRestore(null)}
          body={<>Replace all your data with this backup? {restore.summary}. Your current data is saved first as
            manmoney-before-restore-&lt;date&gt;.db next to the database.</>} />
      )}
    </div>
  );
}
