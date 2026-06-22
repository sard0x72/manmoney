import { useState } from 'react';
import { Download, Database, Sun, Moon, FileText, FileSpreadsheet, ShieldCheck, ArrowLeftRight, Tag, Wallet } from 'lucide-react';
import { useAppStore, HIDEABLE_SECTIONS } from '../../store/useAppStore';
import type { HideableSection } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { downloadBlob } from '../../lib/utils';
import { PageHeader } from '../layout/PageHeader';
import * as XLSX from 'xlsx';

const SECTION_META: Record<HideableSection, { label: string; desc: string }> = {
  transactions: { label: 'Transactions',  desc: 'Log and browse every income and expense entry.' },
  budgets:      { label: 'Budgets',       desc: 'Set monthly spending limits per category.' },
  analytics:    { label: 'Analytics',     desc: 'Charts and trends across your financial data.' },
  goals:        { label: 'Goals',         desc: 'Track savings targets and milestones.' },
  recurring:    { label: 'Recurring',     desc: 'Manage bills, subscriptions, and regular income.' },
  categories:   { label: 'Categories',   desc: 'Organise transactions with custom categories.' },
  accounts:     { label: 'Accounts',      desc: 'Bank accounts, wallets, and credit cards.' },
};

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
  const { isDark, toggleTheme, transactions, categories, accounts, showToast, visibleSections, toggleSection } = useAppStore();
  const [dbPath, setDbPath] = useState('');

  const exportCSV = async () => {
    try {
      const csv = await api.export.csv();
      downloadBlob(csv, `manmoney-export-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
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
      XLSX.writeFile(wb, `manmoney-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast('Excel file exported');
    } catch { showToast('Export failed', 'error'); }
  };

  const exportJSON = () => {
    const data = JSON.stringify({ transactions, categories, accounts }, null, 2);
    downloadBlob(data, `manmoney-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
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
        <div style={{ maxWidth: 'var(--prose-max)', padding: '36px 44px 56px' }}>

          <Group title="Navigation sections">
            {HIDEABLE_SECTIONS.map(section => {
              const { label, desc } = SECTION_META[section];
              return (
                <Row key={section} label={label} desc={desc}>
                  <Toggle on={visibleSections[section]} onChange={() => toggleSection(section)} />
                </Row>
              );
            })}
          </Group>

          <Group title="Appearance">
            <Row label="Theme" desc="Switch between light and dark mode.">
              <button onClick={toggleTheme} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </button>
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
                { icon: <ArrowLeftRight size={13} />, value: transactions.length, label: 'transactions' },
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
