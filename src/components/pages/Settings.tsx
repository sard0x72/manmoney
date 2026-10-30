import { useEffect, useRef, useState } from 'react';
import { Download, Upload, Database, FileText, FileSpreadsheet, ShieldCheck, ReceiptText, Tag, Wallet, HandCoins, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { useAppStore, DEFAULT_NAV_ORDER } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { downloadBlob, CURRENCIES, todayISO } from '../../lib/utils';
import { NAV_ITEMS } from '../../lib/nav';
import { PageHeader } from '../layout/PageHeader';
import { Modal } from '../ui/Modal';
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

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
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
      <h2 className="mm-eyebrow" style={{ marginBottom: 4 }}>{title}</h2>
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
  const { currency, setCurrency, fetchAll, showToast, visibleSections, toggleSection, navOrder, moveNavItem, resetNavOrder } = useAppStore();
  const isDefaultOrder = navOrder.every((p, i) => p === DEFAULT_NAV_ORDER[i]);
  const [dbPath, setDbPath] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [restore, setRestore] = useState<{ json: string; summary: string } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Real totals from the database; the store only holds what the open pages loaded.
  const loadStats = () => api.stats().then(setStats).catch(e => console.error('stats', e));
  useEffect(() => { loadStats(); }, []);

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
    setRestoring(true);
    try {
      await api.export.restore(restore.json);
      setRestore(null);
      await fetchAll();
      loadStats();
      showToast('Restored');
    } catch (e: any) { showToast(e?.toString() ?? 'Restore failed', 'error'); }
    finally { setRestoring(false); }
  };

  const showDbPath = async () => {
    try { setDbPath(await api.export.dbPath()); }
    catch { showToast("Couldn't find the database", 'error'); }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader eyebrow="Preferences" title="Settings" />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 'var(--prose-max)', padding: 'calc(36px * var(--v-rhythm)) var(--content-h-pad) calc(56px * var(--v-rhythm))' }}>

          <Group title="Sidebar menu">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '6px 0 4px' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)' }}>
                Use the arrows to reorder the sidebar. Switch a section off to hide it.
              </p>
              {!isDefaultOrder && (
                <button onClick={resetNavOrder} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', fontSize: 12, flexShrink: 0 }}>
                  <RotateCcw size={12} /> Reset order
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
                    ? <Toggle on={visibleSections[hideable]} onChange={() => toggleSection(hideable)} />
                    : <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-faint)' }}>Always shown</span>}
                </div>
              );
            })}
          </Group>

          <Group title="General">
            <Row label="Currency" desc="The one currency used for every account and amount in the app.">
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="input" style={{ width: 110 }}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Row>
          </Group>

          <Group title="Export data">
            <Row label="Export as CSV" desc="Download all transactions as a spreadsheet-compatible file.">
              <button onClick={exportCSV} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <FileText size={14} /> CSV
              </button>
            </Row>
            <Row label="Export as Excel" desc="Download all transactions as an Excel (.xlsx) workbook.">
              <button onClick={exportExcel} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <FileSpreadsheet size={14} /> Excel
              </button>
            </Row>
            <Row label="Backup" desc="Every account, transaction, loan and setting in one file.">
              <button onClick={exportBackup} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Download size={14} /> Backup
              </button>
            </Row>
            <Row label="Restore from backup" desc="Replaces all data with a backup file.">
              <input ref={fileRef} type="file" accept=".json,application/json" hidden
                onChange={e => { pickBackup(e.target.files?.[0]); e.target.value = ''; }} />
              <button onClick={() => fileRef.current?.click()} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Upload size={14} /> Restore
              </button>
            </Row>
          </Group>

          <Group title="Your data">
            <Row label="Database location" desc="SQLite file stored locally on your device.">
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

          {/* Privacy promise */}
          <div style={{
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--line)',
            overflow: 'hidden',
            marginTop: 8,
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '16px 20px',
              background: 'var(--surface)',
              borderBottom: '1px solid var(--line)',
            }}>
              <span style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: 'color-mix(in srgb, var(--positive) 12%, transparent)',
                color: 'var(--positive)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShieldCheck size={17} />
              </span>
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                  About
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 1 }}>
                  Everything stays on your device. No account, no sync, no telemetry.
                </div>
              </div>
            </div>
            {/* Stats row */}
            <div style={{
              display: 'flex',
              background: 'var(--paper-sunk)',
            }}>
              {[
                { icon: <ReceiptText size={13} />, value: stats?.transactions, label: 'transactions' },
                { icon: <Wallet size={13} />, value: stats?.accounts, label: 'accounts' },
                { icon: <Tag size={13} />, value: stats?.categories, label: 'categories' },
                { icon: <HandCoins size={13} />, value: stats?.loans, label: 'loans' },
              ].map((stat, i, all) => (
                <div key={i} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '12px 8px',
                  borderRight: i < all.length - 1 ? '1px solid var(--line)' : 'none',
                }}>
                  <span style={{ color: 'var(--ink-faint)', display: 'flex' }}>{stat.icon}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{stat.value?.toLocaleString('en-US') ?? '–'}</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-faint)' }}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <Modal open={!!restore} onClose={() => !restoring && setRestore(null)} title="Restore from backup" size="sm"
        footer={<>
          <button onClick={() => setRestore(null)} disabled={restoring} className="btn-secondary" autoFocus>Cancel</button>
          <button onClick={doRestore} disabled={restoring} className="btn-danger">{restoring ? 'Restoring…' : 'Restore'}</button>
        </>}
      >
        <p className="text-sm text-[hsl(var(--text-muted))]">
          Replace all your data with this backup? {restore?.summary}. Your current data is saved first
          as manmoney-before-restore-&lt;date&gt;.db next to the database.
        </p>
      </Modal>
    </div>
  );
}
