import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { todayISO } from '../../lib/utils';
import { FormSheet, useDirty } from '../ui/FormSheet';
import { MoneyInput } from '../ui/MoneyInput';
import { Segmented } from '../ui/Segmented';
import type { Transaction } from '../../types';

/** Stored lowercase; shown capitalised. */
export const PAYMENT_METHODS = ['cash', 'bank transfer', 'credit card', 'debit card', 'mobile payment', 'check', 'other'];
export const methodLabel = (m: string) => m.charAt(0).toUpperCase() + m.slice(1);

type Kind = 'income' | 'expense';

export function TransactionForm({ tx, initialType, onClose, onSaved }: {
  tx?: Transaction;
  /** Type to start with when adding, e.g. from the Dashboard's Income button. */
  initialType?: Kind;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { accounts, categories, showToast } = useAppStore();
  const ofType = (t: Kind) => categories.filter(c => c.category_type === t);
  const startType: Kind = tx?.transaction_type ?? initialType ?? 'expense';
  const [type, setType] = useState<Kind>(startType);
  const [amount, setAmount] = useState(tx?.amount?.toString() ?? '');
  const [date, setDate] = useState(tx?.date ?? todayISO());
  const [accountId, setAccountId] = useState(tx?.account_id ?? accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(tx?.category_id ?? ofType(startType)[0]?.id ?? '');
  const [payee, setPayee] = useState(tx?.payee ?? '');
  const [notes, setNotes] = useState(tx?.notes ?? '');
  const [method, setMethod] = useState(tx?.payment_method ?? 'cash');
  const [tags, setTags] = useState(tx?.tags ?? '');
  const [saving, setSaving] = useState(false);
  const dirty = useDirty({ type, amount, date, accountId, categoryId, payee, notes, method, tags });

  // An expense category on an income (or the reverse) would be saved silently, so switch it too.
  const changeType = (t: Kind) => {
    setType(t);
    if (!ofType(t).some(c => c.id === categoryId)) setCategoryId(ofType(t)[0]?.id ?? '');
  };

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return showToast('Enter an amount', 'error');
    if (!accountId) return showToast('Pick an account', 'error');
    if (!categoryId) return showToast('Pick a category', 'error');
    setSaving(true);
    try {
      const data = { account_id: accountId, category_id: categoryId, transaction_type: type, amount: amt, date, notes, payee, payment_method: method, tags };
      if (tx) await api.transactions.update({ ...data, id: tx.id });
      else await api.transactions.create(data);
      showToast('Saved');
      onSaved();
      onClose();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <FormSheet title={tx ? 'Edit transaction' : 'Add transaction'} size="md" onClose={onClose} onSubmit={handleSave} dirty={dirty} saving={saving}>
      <Segmented value={type} onChange={changeType} label="Type" options={[['expense', 'Expense'], ['income', 'Income']]} />
      <div>
        <label className="label mb-1.5 block">Amount</label>
        <MoneyInput value={amount} onChange={e => setAmount(e.target.value)} min="0" step="0.01" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label mb-1.5 block">Account</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} className="input">
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label mb-1.5 block">Category</label>
        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="input">
          {ofType(type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Payee</label>
          <input type="text" value={payee} onChange={e => setPayee(e.target.value)} className="input" placeholder="Where or to whom" />
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
      <div>
        <label className="label mb-1.5 block">Tags</label>
        <input type="text" value={tags} onChange={e => setTags(e.target.value)} className="input" placeholder="groceries, weekly" />
      </div>
    </FormSheet>
  );
}
