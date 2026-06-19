import { useState } from 'react';
import { Download, Database, Info, Sun, Moon, FileText, FileSpreadsheet, Shield } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { downloadBlob } from '../../lib/utils';
import * as XLSX from 'xlsx';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-[hsl(var(--text))] mb-4 pb-3 border-b border-[hsl(var(--border))]">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SettingRow({ label, desc, action }: { label: string; desc?: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <p className="text-sm font-medium text-[hsl(var(--text))]">{label}</p>
        {desc && <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function Settings() {
  const { isDark, toggleTheme, transactions, categories, accounts, showToast } = useAppStore();
  const [dbPath, setDbPath] = useState('');

  const exportCSV = async () => {
    try {
      const csv = await api.export.csv();
      downloadBlob(csv, `manmoney-export-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
      showToast('CSV exported');
    } catch (e: any) {
      showToast(e?.toString() ?? 'Export failed', 'error');
    }
  };

  const exportExcel = async () => {
    try {
      const rows = transactions.map(t => ({
        Date: t.date,
        Type: t.transaction_type,
        Amount: t.amount,
        Category: t.category_name ?? '',
        Payee: t.payee,
        Notes: t.notes,
        Account: t.account_name ?? '',
        'Payment Method': t.payment_method,
        Tags: t.tags,
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
      XLSX.writeFile(wb, `manmoney-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast('Excel file exported');
    } catch (e: any) {
      showToast('Export failed', 'error');
    }
  };

  const exportJSON = () => {
    const data = JSON.stringify({ transactions, categories, accounts }, null, 2);
    downloadBlob(data, `manmoney-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    showToast('JSON backup exported');
  };

  const showDbPath = async () => {
    try {
      const path = await api.export.dbPath();
      setDbPath(path);
    } catch (e) {
      showToast('Failed to get DB path', 'error');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-xl font-bold text-[hsl(var(--text))]">Settings</h1>
      </div>

      <div className="page-content space-y-4">
        {/* Appearance */}
        <Section title="Appearance">
          <SettingRow
            label="Theme"
            desc="Switch between light and dark mode"
            action={
              <button onClick={toggleTheme} className="btn-secondary gap-2">
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </button>
            }
          />
        </Section>

        {/* Export */}
        <Section title="Export Data">
          <SettingRow
            label="Export as CSV"
            desc="Download all transactions as a spreadsheet-compatible CSV file"
            action={
              <button onClick={exportCSV} className="btn-secondary gap-2">
                <FileText size={14} />
                Export CSV
              </button>
            }
          />
          <SettingRow
            label="Export as Excel"
            desc="Download all transactions as an Excel (.xlsx) workbook"
            action={
              <button onClick={exportExcel} className="btn-secondary gap-2">
                <FileSpreadsheet size={14} />
                Export Excel
              </button>
            }
          />
          <SettingRow
            label="Backup as JSON"
            desc="Export all data (transactions, categories, accounts) as JSON"
            action={
              <button onClick={exportJSON} className="btn-secondary gap-2">
                <Download size={14} />
                Backup JSON
              </button>
            }
          />
        </Section>

        {/* Database */}
        <Section title="Database">
          <SettingRow
            label="Database Location"
            desc="SQLite file stored locally on your device"
            action={
              <button onClick={showDbPath} className="btn-secondary gap-2">
                <Database size={14} />
                Show Path
              </button>
            }
          />
          {dbPath && (
            <div className="mt-2 p-3 rounded-xl bg-[hsl(var(--bg))] border border-[hsl(var(--border))]">
              <p className="text-xs font-mono text-[hsl(var(--text-muted))] break-all">{dbPath}</p>
            </div>
          )}
        </Section>

        {/* Privacy */}
        <Section title="Privacy & Security">
          <SettingRow
            label="Local Storage Only"
            desc="All your financial data is stored locally on your device. No data is ever sent to any server."
            action={
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <Shield size={15} />
                <span className="text-sm font-medium">100% Local</span>
              </div>
            }
          />
        </Section>

        {/* About */}
        <Section title="About">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[hsl(var(--bg))] border border-[hsl(var(--border))]">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
              <Info size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[hsl(var(--text))]">ManMoney v1.0.0</p>
              <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
                A private, offline-first personal finance manager built with Tauri + React.
                Your data never leaves your device.
              </p>
              <p className="text-xs text-[hsl(var(--text-muted))] mt-2">
                {transactions.length} transactions · {accounts.length} accounts · {categories.length} categories
              </p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
