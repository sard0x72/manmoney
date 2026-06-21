import { useState, useEffect } from 'react';
import { Plus, Trash2, Repeat, Calendar } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, formatDate, todayISO } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';

const PAYMENT_METHODS = ['cash', 'bank transfer', 'credit card', 'debit card', 'mobile payment', 'check', 'other'];

function RecurringForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const { accounts, categories, showToast } = useAppStore();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [payee, setPayee] = useState('');
  const [notes, setNotes] = useState('');
  const [method, setMethod] = useState('bank transfer');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredCategories = categories.filter(c => c.category_type === type);

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return showToast('Enter a valid amount', 'error');
    if (!accountId) return showToast('Select an account', 'error');
    setSaving(true);
    try {
      const catId = categoryId || filteredCategories[0]?.id || categories[0]?.id || '';
      await api.recurring.create({
        account_id: accountId, category_id: catId, transaction_type: type,
        amount: amt, payee, notes, payment_method: method, frequency, start_date: startDate,
        end_date: endDate || undefined,
      });
      showToast('Recurring transaction created');
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
        <p className="label mb-2">Type</p>
        <div className="flex gap-1 p-1 bg-[hsl(var(--bg))] rounded-xl">
          {(['expense', 'income'] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${type === t ? 'bg-[hsl(var(--surface))] shadow-card text-[hsl(var(--text))]' : 'text-[hsl(var(--text-muted))]'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] text-sm">$</span>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input pl-7" placeholder="0.00" autoFocus />
          </div>
        </div>
        <div>
          <label className="label mb-1.5 block">Frequency</label>
          <select value={frequency} onChange={e => setFrequency(e.target.value as any)} className="input">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Account</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} className="input">
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label mb-1.5 block">Category</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="input">
            <option value="">Auto-select</option>
            {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label mb-1.5 block">End Date (optional)</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Payee</label>
          <input type="text" value={payee} onChange={e => setPayee(e.target.value)} className="input" placeholder="Payee / merchant" />
        </div>
        <div>
          <label className="label mb-1.5 block">Payment Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)} className="input">
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label mb-1.5 block">Notes</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="Optional notes…" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Create Recurring'}
        </button>
      </div>
    </div>
  );
}

const FREQ_COLORS: Record<string, string> = {
  daily: '#ef4444', weekly: '#f97316', monthly: '#6174f5', yearly: '#22c55e'
};

export function Recurring() {
  const { recurring, fetchRecurring, showToast } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { fetchRecurring(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.recurring.delete(deleteId);
      showToast('Recurring transaction removed');
      setDeleteId(null);
      fetchRecurring();
    } catch (e: any) {
      showToast(e?.toString() ?? 'Error', 'error');
    }
  };

  const totalMonthly = recurring
    .filter(r => r.is_active)
    .reduce((s, r) => {
      const m = { daily: 30, weekly: 4.3, monthly: 1, yearly: 1 / 12 }[r.frequency] ?? 1;
      return r.transaction_type === 'expense' ? s + r.amount * m : s - r.amount * m;
    }, 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-[hsl(var(--text))]">Recurring Transactions</h1>
          {recurring.length > 0 && (
            <p className="text-sm text-[hsl(var(--text-muted))] mt-0.5">
              Monthly net impact: <span className={totalMonthly >= 0 ? 'amount-negative' : 'amount-positive'}>{formatCurrency(Math.abs(totalMonthly))}</span>
            </p>
          )}
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={15} /> Add Recurring
        </button>
      </div>

      <div className="page-content">
        {recurring.length === 0 ? (
          <EmptyState
            icon={<Repeat size={22} />}
            title="No recurring transactions"
            description="Set up recurring transactions for bills, subscriptions, and regular income."
            action={<button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={14} /> Add Recurring</button>}
          />
        ) : (
          <div className="space-y-3">
            {recurring.map(r => (
              <div key={r.id} className="card p-4 flex items-center gap-4 group hover:shadow-card-hover transition-shadow">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${FREQ_COLORS[r.frequency]}15` }}>
                  <Repeat size={18} style={{ color: FREQ_COLORS[r.frequency] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-[hsl(var(--text))]">{r.payee || r.category_name}</p>
                    <span className="badge capitalize" style={{ backgroundColor: `${FREQ_COLORS[r.frequency]}15`, color: FREQ_COLORS[r.frequency] }}>
                      {r.frequency}
                    </span>
                    <span className={`badge ${r.transaction_type === 'income' ? 'bg-green-100 dark:bg-green-900/20 text-green-600' : 'bg-red-100 dark:bg-red-900/20 text-red-500'}`}>
                      {r.transaction_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[hsl(var(--text-muted))]">
                    <span>{r.account_name}</span>
                    <span className="flex items-center gap-1"><Calendar size={11} /> Next: {formatDate(r.next_date)}</span>
                    {r.end_date && <span>Ends: {formatDate(r.end_date)}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-base font-bold tabular-nums ${r.transaction_type === 'income' ? 'amount-positive' : 'amount-negative'}`}>
                    {r.transaction_type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
                  </p>
                  <p className="text-xs text-[hsl(var(--text-muted))]">{r.payment_method}</p>
                </div>
                <button
                  onClick={() => setDeleteId(r.id)}
                  className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-[hsl(var(--text-muted))] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Recurring Transaction" size="md">
        <RecurringForm onSave={() => { setShowForm(false); fetchRecurring(); }} onCancel={() => setShowForm(false)} />
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Remove Recurring" size="sm"
        footer={<><button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button><button onClick={handleDelete} className="btn-danger">Remove</button></>}
      >
        <p className="text-sm text-[hsl(var(--text-muted))]">Remove this recurring transaction? Existing transactions are not affected.</p>
      </Modal>
    </div>
  );
}
