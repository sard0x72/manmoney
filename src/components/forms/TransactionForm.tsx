import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { localISO, todayISO } from '../../lib/utils';
import { FormSheet, useDirty } from '../ui/FormSheet';
import { MoneyInput } from '../ui/MoneyInput';
import { Segmented } from '../ui/Segmented';
import { MoreOptions } from '../ui/MoreOptions';
import { CategoryIcon } from '../ui/CategoryIcon';
import type { Transaction } from '../../types';

/** Stored lowercase; shown capitalised. */
export const PAYMENT_METHODS = ['cash', 'bank transfer', 'credit card', 'debit card', 'mobile payment', 'check', 'other'];
export const methodLabel = (m: string) => m.charAt(0).toUpperCase() + m.slice(1);

type Kind = 'income' | 'expense';

const LAST_ACCOUNT = 'mm.lastAccount';
function lastAccount(): string | null {
  try { return localStorage.getItem(LAST_ACCOUNT); } catch { return null; }
}
function rememberAccount(id: string) {
  try { localStorage.setItem(LAST_ACCOUNT, id); } catch { /* private mode: fine to forget */ }
}

export const chipStyle = (on: boolean) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, cursor: 'pointer',
  fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
  border: `1px solid ${on ? 'transparent' : 'var(--line)'}`,
  background: on ? 'var(--clay-tint)' : 'var(--surface)', color: on ? 'var(--clay-ink)' : 'var(--ink-muted)',
}) as const;

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localISO(d);
}

export function TransactionForm({ tx, template, initialType, onClose, onSaved }: {
  /** The transaction being edited. */
  tx?: Transaction;
  /** Prefills a new transaction from an existing one (Duplicate); the date becomes today. */
  template?: Transaction;
  /** Type to start with when adding, e.g. from the Dashboard's Income button. */
  initialType?: Kind;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { accounts, categories, transactions, showToast } = useAppStore();
  const src = tx ?? template;
  const ofType = (t: Kind) => categories.filter(c => c.category_type === t);
  // Most used first, from what's loaded; categories never used fall back to alphabetical.
  const ranked = useMemo(() => {
    const uses = new Map<string, number>();
    for (const t of transactions) uses.set(t.category_id, (uses.get(t.category_id) ?? 0) + 1);
    return [...categories].sort((a, b) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) || a.name.localeCompare(b.name));
  }, [categories, transactions]);
  const chipsFor = (t: Kind) => ranked.filter(c => c.category_type === t).slice(0, 8);

  const startType: Kind = src?.transaction_type ?? initialType ?? 'expense';
  const remembered = lastAccount();
  const [type, setType] = useState<Kind>(startType);
  const [amount, setAmount] = useState(src?.amount?.toString() ?? '');
  const [categoryId, setCategoryId] = useState(src?.category_id ?? chipsFor(startType)[0]?.id ?? '');
  const [accountId, setAccountId] = useState(
    src?.account_id ?? (accounts.some(a => a.id === remembered) ? remembered! : accounts[0]?.id ?? ''));
  const [date, setDate] = useState(tx?.date ?? todayISO());
  const [notes, setNotes] = useState(src?.notes ?? '');
  const [payee, setPayee] = useState(src?.payee ?? '');
  const [method, setMethod] = useState(src?.payment_method ?? 'cash');
  const [tags, setTags] = useState(src?.tags ?? '');
  const [saving, setSaving] = useState(false);
  const dirty = useDirty({ type, amount, date, accountId, categoryId, payee, notes, method, tags });

  // An expense category on an income (or the reverse) would be saved silently, so switch it too.
  const changeType = (t: Kind) => {
    setType(t);
    if (!ofType(t).some(c => c.id === categoryId)) setCategoryId(chipsFor(t)[0]?.id ?? '');
  };

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return showToast('Enter an amount', 'error');
    if (!categoryId) return showToast('Pick a category', 'error');
    if (!accountId) return showToast('Pick an account', 'error');
    setSaving(true);
    try {
      const data = { account_id: accountId, category_id: categoryId, transaction_type: type, amount: amt, date, notes, payee, payment_method: method, tags };
      if (tx) await api.transactions.update({ ...data, id: tx.id });
      else await api.transactions.create(data);
      rememberAccount(accountId);
      showToast('Saved');
      onSaved();
      onClose();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  const chips = chipsFor(type);
  // The selected category stays visible even when it isn't one of the chips.
  const inMore = !!categoryId && !chips.some(c => c.id === categoryId);

  return (
    <FormSheet title={tx ? 'Edit transaction' : 'Add transaction'} size="md" onClose={onClose} onSubmit={handleSave} dirty={dirty} saving={saving}>
      <Segmented value={type} onChange={changeType} label="Type" options={[['expense', 'Expense'], ['income', 'Income']]} />
      <div>
        <label className="label mb-1.5 block">Amount</label>
        <MoneyInput value={amount} onChange={e => setAmount(e.target.value)} min="0" step="0.01" autoFocus
          style={{ fontFamily: 'var(--font-mono)', fontSize: 20, padding: '8px 12px' }} />
      </div>
      <div>
        <label className="label mb-1.5 block">Category</label>
        <div role="group" aria-label="Category" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {chips.map(c => (
            <button key={c.id} type="button" aria-pressed={categoryId === c.id} onClick={() => setCategoryId(c.id)} style={chipStyle(categoryId === c.id)}>
              <span style={{ color: c.color, display: 'flex' }}><CategoryIcon icon={c.icon} size={14} /></span> {c.name}
            </button>
          ))}
          {ofType(type).length > chips.length && (
            <select aria-label="More categories" className="input"
              style={{ width: 'auto', padding: '5px 10px', fontSize: 13, borderRadius: 999, ...(inMore ? { background: 'var(--clay-tint)', color: 'var(--clay-ink)', borderColor: 'transparent' } : {}) }}
              value={inMore ? categoryId : ''} onChange={e => e.target.value && setCategoryId(e.target.value)}>
              <option value="">More…</option>
              {ofType(type).filter(c => !chips.includes(c)).sort((a, b) => a.name.localeCompare(b.name))
                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
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
          <label className="label mb-1.5 block">Date</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button type="button" aria-pressed={date === todayISO()} onClick={() => setDate(todayISO())} style={chipStyle(date === todayISO())}>Today</button>
            <button type="button" aria-pressed={date === yesterdayISO()} onClick={() => setDate(yesterdayISO())} style={chipStyle(date === yesterdayISO())}>Yesterday</button>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" aria-label="Date" style={{ flex: 1, minWidth: 0 }} />
          </div>
        </div>
      </div>
      <div>
        <label className="label mb-1.5 block">Note</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="Optional" />
      </div>
      <MoreOptions defaultOpen={!!(tx && (tx.payee || tx.tags || (tx.payment_method && tx.payment_method !== 'cash')))}>
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
          <label className="label mb-1.5 block">Tags</label>
          <input type="text" value={tags} onChange={e => setTags(e.target.value)} className="input" placeholder="groceries, weekly" />
        </div>
      </MoreOptions>
    </FormSheet>
  );
}
