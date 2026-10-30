import { useState, useEffect } from 'react';
import { Plus, Trash2, Repeat, Calendar, Pencil, Pause, Play } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, formatDate, todayISO } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { FormSheet, useDirty } from '../ui/FormSheet';
import { MoneyInput } from '../ui/MoneyInput';
import { EmptyState } from '../ui/EmptyState';
import { Segmented } from '../ui/Segmented';
import { RowMenu } from '../ui/RowMenu';
import { PageHeader } from '../layout/PageHeader';
import { PAYMENT_METHODS, methodLabel } from '../forms/TransactionForm';
import type { RecurringTransaction } from '../../types';

type Frequency = RecurringTransaction['frequency'];
type Kind = 'income' | 'expense';

function RecurringForm({ item, onSaved, onClose }: { item?: RecurringTransaction; onSaved: () => void; onClose: () => void }) {
  const { accounts, categories, showToast } = useAppStore();
  const ofType = (t: Kind) => categories.filter(c => c.category_type === t);
  const initialType: Kind = item?.transaction_type === 'income' ? 'income' : 'expense';
  const [type, setType] = useState<Kind>(initialType);
  const [amount, setAmount] = useState(item?.amount?.toString() ?? '');
  const [accountId, setAccountId] = useState(item?.account_id ?? accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(item?.category_id ?? ofType(initialType)[0]?.id ?? '');
  const [payee, setPayee] = useState(item?.payee ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [method, setMethod] = useState(item?.payment_method ?? 'bank transfer');
  const [frequency, setFrequency] = useState<Frequency>(item?.frequency ?? 'monthly');
  const [startDate, setStartDate] = useState(item?.start_date ?? todayISO());
  const [endDate, setEndDate] = useState(item?.end_date ?? '');
  const [saving, setSaving] = useState(false);
  const dirty = useDirty({ type, amount, accountId, categoryId, payee, notes, method, frequency, startDate, endDate });

  const changeType = (t: Kind) => {
    setType(t);
    if (!ofType(t).some(c => c.id === categoryId)) setCategoryId(ofType(t)[0]?.id ?? '');
  };

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return showToast('Enter an amount', 'error');
    if (!categoryId) return showToast('Pick a category', 'error');
    if (!accountId) return showToast('Pick an account', 'error');
    if (endDate && endDate < startDate) return showToast('End after it starts', 'error');
    setSaving(true);
    try {
      const data = {
        account_id: accountId, category_id: categoryId, transaction_type: type,
        amount: amt, payee, notes, payment_method: method, frequency, start_date: startDate,
        end_date: endDate || undefined,
      };
      if (item) await api.recurring.update({ ...data, id: item.id });
      else await api.recurring.create(data);
      showToast('Saved');
      onSaved();
      onClose();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <FormSheet title={item ? 'Edit recurring' : 'Add recurring'} size="md" onClose={onClose} onSubmit={handleSave} dirty={dirty} saving={saving}>
      <Segmented value={type} onChange={changeType} label="Type" options={[['expense', 'Expense'], ['income', 'Income']]} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Amount</label>
          <MoneyInput value={amount} onChange={e => setAmount(e.target.value)} min="0" step="0.01" autoFocus />
        </div>
        <div>
          <label className="label mb-1.5 block">Category</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="input">
            {ofType(type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
          <label className="label mb-1.5 block">Frequency</label>
          <select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)} className="input">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Starts</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label mb-1.5 block">Ends</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Payee</label>
          <input type="text" value={payee} onChange={e => setPayee(e.target.value)} className="input" placeholder="Payee or merchant" />
        </div>
        <div>
          <label className="label mb-1.5 block">Payment method</label>
          <select value={method} onChange={e => setMethod(e.target.value)} className="input">
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{methodLabel(m)}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label mb-1.5 block">Note</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="Optional" />
      </div>
    </FormSheet>
  );
}

export function Recurring() {
  const { recurring, fetchRecurring, fetchAccounts, fetchDashboard, bumpData, showToast } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<RecurringTransaction | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Post anything that fell due since the app started (it may have been open overnight).
  useEffect(() => {
    api.recurring.process(todayISO())
      .then(added => {
        if (added > 0) {
          showToast(`Added ${added} recurring transaction${added === 1 ? '' : 's'}`, 'info');
          fetchAccounts(); fetchDashboard(); bumpData();
        }
      })
      .catch(e => console.error('processRecurring', e))
      .finally(fetchRecurring);
  }, []);

  // A save may make entries fall due right away (a start date in the past).
  const afterSave = async () => {
    try {
      const added = await api.recurring.process(todayISO());
      if (added > 0) {
        showToast(`Added ${added} recurring transaction${added === 1 ? '' : 's'}`, 'info');
        fetchAccounts(); fetchDashboard(); bumpData();
      }
    } catch (e) { console.error('processRecurring', e); }
    fetchRecurring();
  };

  const setActive = async (r: RecurringTransaction, active: boolean) => {
    try {
      await api.recurring.setActive(r.id, active);
      showToast(active ? 'Resumed' : 'Paused');
      fetchRecurring();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.recurring.delete(deleteId);
      showToast('Recurring deleted');
      setDeleteId(null);
      fetchRecurring();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
  };

  const openEdit = (r?: RecurringTransaction) => { setEditItem(r); setShowForm(true); };

  const monthlyOut = recurring.filter(r => r.is_active && r.transaction_type === 'expense')
    .reduce((s, r) => s + r.amount * ({ daily: 30, weekly: 4.3, monthly: 1, yearly: 1/12 }[r.frequency] ?? 1), 0);
  const monthlyIn = recurring.filter(r => r.is_active && r.transaction_type === 'income')
    .reduce((s, r) => s + r.amount * ({ daily: 30, weekly: 4.3, monthly: 1, yearly: 1/12 }[r.frequency] ?? 1), 0);

  const lead = recurring.length > 0
    ? `${formatCurrency(monthlyIn)} in and ${formatCurrency(monthlyOut)} out each month.`
    : undefined;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        eyebrow="Scheduled"
        title="Recurring"
        lead={lead}
        actions={
          <button onClick={() => openEdit()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Add recurring
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: 'calc(32px * var(--v-rhythm)) var(--content-h-pad) calc(56px * var(--v-rhythm))' }}>
          {recurring.length === 0 ? (
            <EmptyState
              icon={<Repeat size={22} />}
              title="No recurring transactions"
              description="Bills, subscriptions and income that repeat are added for you on each date."
              action={<button onClick={() => openEdit()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Add recurring</button>}
            />
          ) : (
            <>
              {recurring.map(r => (
                <div key={r.id} className="mm-acctrow group" role="button" tabIndex={0}
                  onClick={() => openEdit(r)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) openEdit(r); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
                    padding: '16px 8px', borderBottom: '1px solid var(--line)', opacity: r.is_active ? 1 : 0.6,
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
                        {r.is_active ? r.frequency : 'Paused'}
                      </span>
                      {r.is_active && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)' }}>
                          <Calendar size={12} /> Next {formatDate(r.next_date)}
                        </span>
                      )}
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
                  <RowMenu items={[
                    { label: 'Edit', icon: <Pencil size={13} />, onSelect: () => openEdit(r) },
                    r.is_active
                      ? { label: 'Pause', icon: <Pause size={13} />, onSelect: () => setActive(r, false) }
                      : { label: 'Resume', icon: <Play size={13} />, onSelect: () => setActive(r, true) },
                    { label: 'Delete', icon: <Trash2 size={13} />, onSelect: () => setDeleteId(r.id), danger: true },
                  ]} />
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

      {showForm && (
        <RecurringForm key={editItem?.id ?? 'new'} item={editItem} onSaved={afterSave}
          onClose={() => { setShowForm(false); setEditItem(undefined); }} />
      )}

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete recurring" size="sm"
        footer={<><button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button><button onClick={handleDelete} className="btn-danger">Delete</button></>}
      >
        <p className="text-sm text-[hsl(var(--text-muted))]">Stops future entries. Entries already added stay.</p>
      </Modal>
    </div>
  );
}
