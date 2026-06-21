import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Wallet, Building2, CreditCard, TrendingUp } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import type { Account } from '../../types';

const COLORS = ['#6174f5','#22c55e','#ef4444','#f97316','#a855f7','#06b6d4','#eab308','#ec4899','#14b8a6','#3b82f6'];
const CURRENCIES = ['USD','EUR','GBP','JPY','CAD','AUD','CHF','INR','BRL','MXN','UZS'];

const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  cash: Wallet,
  bank: Building2,
  credit: CreditCard,
  investment: TrendingUp,
};

function AccountForm({ acct, onSave, onCancel }: { acct?: Account; onSave: () => void; onCancel: () => void }) {
  const { showToast } = useAppStore();
  const [name, setName] = useState(acct?.name ?? '');
  const [type, setType] = useState<Account['account_type']>(acct?.account_type ?? 'bank');
  const [balance, setBalance] = useState(acct?.balance?.toString() ?? '0');
  const [currency, setCurrency] = useState(acct?.currency ?? 'USD');
  const [color, setColor] = useState(acct?.color ?? COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return showToast('Enter an account name', 'error');
    setSaving(true);
    try {
      if (acct) {
        await api.accounts.update({ id: acct.id, name: name.trim(), account_type: type, currency, color, icon: 'wallet' });
        showToast('Account updated');
      } else {
        await api.accounts.create({ name: name.trim(), account_type: type, balance: parseFloat(balance) || 0, currency, color, icon: 'wallet' });
        showToast('Account created');
      }
      onSave();
    } catch (e: any) {
      showToast(e?.toString() ?? 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label mb-1.5 block">Account Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. Main Checking, Cash Wallet…" autoFocus />
      </div>
      <div>
        <p className="label mb-2">Account Type</p>
        <div className="grid grid-cols-2 gap-2">
          {(['cash', 'bank', 'credit', 'investment'] as const).map(t => {
            const Icon = TYPE_ICONS[t] ?? Wallet;
            return (
              <button key={t} onClick={() => setType(t)}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium capitalize transition-all ${type === t ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:border-[hsl(var(--text-muted))]'}`}>
                <Icon size={16} />
                {t}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">{acct ? 'Current Balance' : 'Opening Balance'}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] text-sm">$</span>
            <input type="number" value={balance} onChange={e => setBalance(e.target.value)} className="input pl-7" placeholder="0.00" disabled={!!acct} />
          </div>
          {acct && <p className="text-xs text-[hsl(var(--text-muted))] mt-1">Balance is managed through transactions</p>}
        </div>
        <div>
          <label className="label mb-1.5 block">Currency</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)} className="input">
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label mb-2 block">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-[hsl(var(--text))] scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : acct ? 'Update Account' : 'Create Account'}
        </button>
      </div>
    </div>
  );
}

export function Accounts() {
  const { accounts, fetchAccounts, showToast } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editAcct, setEditAcct] = useState<Account | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { fetchAccounts(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.accounts.delete(deleteId);
      showToast('Account deleted');
      setDeleteId(null);
      fetchAccounts();
    } catch (e: any) {
      showToast(e?.toString() ?? 'Error', 'error');
    }
  };

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const byType = accounts.reduce<Record<string, Account[]>>((acc, a) => {
    (acc[a.account_type] = acc[a.account_type] ?? []).push(a);
    return acc;
  }, {});

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-[hsl(var(--text))]">Accounts</h1>
          <p className="text-sm text-[hsl(var(--text-muted))] mt-0.5">Net worth: <span className="font-semibold text-[hsl(var(--text))]">{formatCurrency(totalBalance)}</span></p>
        </div>
        <button onClick={() => { setEditAcct(undefined); setShowForm(true); }} className="btn-primary">
          <Plus size={15} /> Add Account
        </button>
      </div>

      <div className="page-content space-y-5">
        {accounts.length === 0 ? (
          <EmptyState
            icon={<Wallet size={22} />}
            title="No accounts"
            description="Create accounts to track your cash, bank, credit, and investment balances."
            action={<button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={14} /> Add Account</button>}
          />
        ) : (
          Object.entries(byType).map(([type, accts]) => {
            const Icon = TYPE_ICONS[type] ?? Wallet;
            const subtotal = accts.reduce((s, a) => s + a.balance, 0);
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <p className="section-title capitalize">{type} Accounts</p>
                  <div className="h-px flex-1 bg-[hsl(var(--border))]" />
                  <span className="text-sm font-semibold text-[hsl(var(--text))]">{formatCurrency(subtotal)}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {accts.map(a => (
                    <div key={a.id} className="card p-5 group hover:shadow-card-hover transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${a.color}20`, color: a.color }}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[hsl(var(--text))]">{a.name}</p>
                            <p className="text-xs text-[hsl(var(--text-muted))] capitalize">{a.account_type} · {a.currency}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditAcct(a); setShowForm(true); }}
                            className="p-1.5 rounded-lg hover:bg-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeleteId(a.id)}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-[hsl(var(--text-muted))] hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <p className={`text-2xl font-bold tabular-nums ${a.balance >= 0 ? 'text-[hsl(var(--text))]' : 'text-red-500'}`}>
                        {formatCurrency(a.balance, a.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditAcct(undefined); }} title={editAcct ? 'Edit Account' : 'Add Account'} size="sm">
        <AccountForm
          acct={editAcct}
          onSave={() => { setShowForm(false); setEditAcct(undefined); fetchAccounts(); }}
          onCancel={() => { setShowForm(false); setEditAcct(undefined); }}
        />
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Account" size="sm"
        footer={<><button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button><button onClick={handleDelete} className="btn-danger">Delete</button></>}
      >
        <p className="text-sm text-[hsl(var(--text-muted))]">Delete this account? All transactions linked to it will remain but balances won't be tracked.</p>
      </Modal>
    </div>
  );
}
