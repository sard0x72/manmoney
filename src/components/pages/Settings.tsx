import { useState } from 'react';
import { Download, Database, FileText, FileSpreadsheet, ShieldCheck, ReceiptText, Tag, Wallet, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { useAppStore, DEFAULT_NAV_ORDER } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { downloadBlob, CURRENCIES, todayISO } from '../../lib/utils';
import { NAV_ITEMS } from '../../lib/nav';
import { PageHeader } from '../layout/PageHeader';
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

export function Settings() {
  const { currency, setCurrency, transactions, categories, accounts, showToast, visibleSections, toggleSection, navOrder, moveNavItem, resetNavOrder } = useAppStore();
  const isDefaultOrder = navOrder.every((p, i) => p === DEFAULT_NAV_ORDER[i]);
  const [dbPath, setDbPath] = useState('');

  const exportCSV = async () => {
    try {
      const csv = await api.export.csv();
      downloadBlob(csv, `manmoney-export-${todayISO()}.csv`, 'text/csv');
      showToast('CSV exported');
    } catch (e: any) { showToast(e?.toString() ?? 'Export failed', 'error'); }
  };

  const exportExcel = async () => {
    try {
      const rows = transactions.map(t => ({
        Date: t.date, Type: t.transaction_type, Amount: t.amount,
        Category: t.category_name ?? '', Payee: t.payee, Notes: t.notes,
        Account: t.account_name ?? '', 'Payment Method': t.payment_method, Tags: t.tags,
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Transactions');
      XLSX.writeFile(wb, `manmoney-export-${todayISO()}.xlsx`);
      showToast('Excel file exported');
    } catch { showToast('Export failed', 'error'); }
  };

  const exportJSON = () => {
    const data = JSON.stringify({ transactions, categories, accounts }, null, 2);
    downloadBlob(data, `manmoney-backup-${todayISO()}.json`, 'application/json');
    showToast('JSON backup exported');
  };

  const showDbPath = async () => {
    try { setDbPath(await api.export.dbPath()); }
    catch { showToast('Failed to get DB path', 'error'); }
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
            <Row label="Backup as JSON" desc="Export all data (transactions, categories, accounts) as JSON.">
              <button onClick={exportJSON} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Download size={14} /> JSON
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
                { icon: <ReceiptText size={13} />, value: transactions.length, label: 'transactions' },
                { icon: <Wallet size={13} />, value: accounts.length, label: 'accounts' },
                { icon: <Tag size={13} />, value: categories.length, label: 'categories' },
              ].map((stat, i) => (
                <div key={i} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '12px 8px',
                  borderRight: i < 2 ? '1px solid var(--line)' : 'none',
                }}>
                  <span style={{ color: 'var(--ink-faint)', display: 'flex' }}>{stat.icon}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{stat.value}</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-faint)' }}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
