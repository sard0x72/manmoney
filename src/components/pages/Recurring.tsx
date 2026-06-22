import { useState, useEffect } from 'react';
import { Plus, Trash2, Repeat, Calendar } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, formatDate, todayISO } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { PageHeader } from '../layout/PageHeader';

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
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="label mb-2">Type</p>
        <div className="flex gap-1 p-1 bg-[hsl(var(--bg))] rounded-xl">
          {(['expense', 'income'] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${type === t ? 'bg-[var(--surface)] shadow-card text-[hsl(var(--text))]' : 'text-[hsl(var(--text-muted))]'}`}>
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
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
  };

  const monthlyOut = recurring.filter(r => r.is_active && r.transaction_type === 'expense')
    .reduce((s, r) => s + r.amount * ({ daily: 30, weekly: 4.3, monthly: 1, yearly: 1/12 }[r.frequency] ?? 1), 0);
  const monthlyIn = recurring.filter(r => r.is_active && r.transaction_type === 'income')
    .reduce((s, r) => s + r.amount * ({ daily: 30, weekly: 4.3, monthly: 1, yearly: 1/12 }[r.frequency] ?? 1), 0);

  const lead = recurring.length > 0
    ? `${formatCurrency(monthlyIn)} in and ${formatCurrency(monthlyOut)} out each month, on autopilot.`
    : undefined;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        eyebrow="Scheduled"
        title="Recurring"
        lead={lead}
        actions={
          <button onClick={() => setShowForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> New Schedule
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 44px 56px' }}>
          {recurring.length === 0 ? (
            <EmptyState
              icon={<Repeat size={22} />}
              title="No recurring transactions"
              description="Set up recurring transactions for bills, subscriptions, and regular income."
              action={<button onClick={() => setShowForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Add Recurring</button>}
            />
          ) : (
            <>
              {recurring.map(r => (
                <div key={r.id} className="mm-acctrow" style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '16px 8px', borderBottom: '1px solid var(--line)',
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: r.transaction_type === 'income' ? 'var(--positive-tint)' : 'var(--clay-tint)',
                    color: r.transaction_type === 'income' ? 'var(--positive)' : 'var(--clay)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Repeat size={17} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
                      {r.payee || r.category_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        borderRadius: 999, padding: '2px 8px',
                        background: 'var(--paper-sunk)',
                        fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 500,
                        color: 'var(--ink-muted)', textTransform: 'capitalize',
                      }}>
                        {r.frequency}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)' }}>
                        <Calendar size={12} /> Next {formatDate(r.next_date)}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
                      fontSize: 16, fontWeight: 500,
                      color: r.transaction_type === 'income' ? 'var(--positive)' : 'var(--negative)',
                    }}>
                      {r.transaction_type === 'income' ? '+' : '−'}{formatCurrency(r.amount)}
                    </div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--ink-faint)' }}>
                      {r.account_name}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteId(r.id)}
                    style={{ color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', marginLeft: 4 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--negative)'; (e.currentTarget as HTMLElement).style.background = 'var(--negative-tint)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-faint)'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {/* Net monthly footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, padding: '0 8px' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--ink-muted)' }}>Net monthly</span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
                  fontSize: 16, fontWeight: 500,
                  color: monthlyIn - monthlyOut >= 0 ? 'var(--positive)' : 'var(--negative)',
                }}>
                  {monthlyIn - monthlyOut >= 0 ? '+' : '−'}{formatCurrency(Math.abs(monthlyIn - monthlyOut))}
                </span>
              </div>
            </>
          )}
        </div>
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
