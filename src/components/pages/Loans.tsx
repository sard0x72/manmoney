import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, HandCoins, ChevronDown, ChevronRight, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CornerDownRight, Ellipsis, Undo2, Receipt, Wallet } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, formatDate, todayISO } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { MoneyInput } from '../ui/MoneyInput';
import { EmptyState } from '../ui/EmptyState';
import { PageHeader } from '../layout/PageHeader';
import type { Loan, LoanRepayment } from '../../types';

type Direction = Loan['direction'];

const left = (l: Loan) => l.amount - l.returned;
const isSettled = (l: Loan) => left(l) <= 0.000001;

// Loans are grouped per friend by name, ignoring case and stray spaces.
const personKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

interface Friend {
  key: string;
  name: string;
  loans: Loan[];
  /** Positive: they owe you. Negative: you owe them. */
  net: number;
  lentOpen: number;
  borrowedOpen: number;
  openCount: number;
  overdue: boolean;
  /** What a cancel-out would close on each side; matches offset_loans, which skips overpaid loans. */
  cancellable: number;
}

function groupByFriend(loans: Loan[]): Friend[] {
  const byKey = new Map<string, Loan[]>();
  for (const l of loans) {
    const k = personKey(l.person);
    byKey.set(k, [...(byKey.get(k) ?? []), l]);
  }
  const today = todayISO();
  return [...byKey.entries()].map(([key, ls]) => {
    const sorted = [...ls].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
    // Overpaid loans have a negative "left" and are kept on purpose: the extra is owed back the other way.
    const lentOpen = sorted.filter(l => l.direction === 'lent').reduce((s, l) => s + left(l), 0);
    const borrowedOpen = sorted.filter(l => l.direction === 'borrowed').reduce((s, l) => s + left(l), 0);
    const open = sorted.filter(l => !isSettled(l));
    const openOn = (d: Direction) => open.filter(l => l.direction === d).reduce((s, l) => s + left(l), 0);
    // Show the spelling used most often; ties go to the most recent loan.
    const spellings = new Map<string, number>();
    for (const l of sorted) {
      const s = l.person.trim().replace(/\s+/g, ' ');
      spellings.set(s, (spellings.get(s) ?? 0) + 1);
    }
    const name = [...spellings.entries()].reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0];
    return {
      key,
      name,
      loans: sorted,
      net: lentOpen - borrowedOpen,
      lentOpen,
      borrowedOpen,
      openCount: open.length,
      overdue: open.some(l => !!l.due_date && l.due_date < today),
      cancellable: Math.min(openOn('lent'), openOn('borrowed')),
    };
  });
}

const isZero = (n: number) => Math.abs(n) <= 0.000001;
/** Money is open both ways, so the smaller side can be cancelled against the larger. */
const canCancelOut = (f: Friend) => f.cancellable > 0.000001;

function Segmented<T extends string>({ value, onChange, options, disabled, size = 'md' }: {
  value: T;
  onChange: (v: T) => void;
  options: readonly (readonly [T, React.ReactNode])[];
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--paper-sunk)', borderRadius: 'var(--radius)', opacity: disabled ? 0.6 : 1 }}>
      {options.map(([v, label]) => (
        <button key={v} type="button" onClick={() => !disabled && onChange(v)} disabled={disabled} aria-pressed={value === v} style={{
          flex: 1, padding: size === 'sm' ? '5px 0' : '7px 0', borderRadius: 'var(--radius-sm)', border: 'none',
          cursor: disabled ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', fontSize: size === 'sm' ? 12.5 : 13, fontWeight: 600,
          background: value === v ? 'var(--surface)' : 'transparent',
          color: value === v ? 'var(--ink)' : 'var(--ink-faint)',
          boxShadow: value === v ? 'var(--shadow-sm)' : 'none',
          transition: 'background var(--dur-fast), color var(--dur-fast)',
        }}>{label}</button>
      ))}
    </div>
  );
}

type Split = 'all' | 'half' | 'custom';
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * A bill shared with a friend. Whoever paid, your share is an expense (it counts in
 * budgets) and the rest is a loan between you.
 */
function SharedBillForm({ defaultPerson, onSave, onCancel }: { defaultPerson?: string; onSave: () => void; onCancel: () => void }) {
  const { accounts, categories, loans, showToast } = useAppStore();
  const expenseCats = categories.filter(c => c.category_type === 'expense');
  const knownNames = groupByFriend(loans).map(f => f.name);
  const [person, setPerson] = useState(defaultPerson ?? '');
  const [paidBy, setPaidBy] = useState<'friend' | 'me'>('friend');
  const [total, setTotal] = useState('');
  const [split, setSplit] = useState<Split>('all');
  const [customShare, setCustomShare] = useState('');
  const [categoryId, setCategoryId] = useState(() =>
    (expenseCats.find(c => /food|dining|restaurant|eat/i.test(c.name)) ?? expenseCats[0])?.id ?? '');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const friend = person.trim() || 'Your friend';
  const totalNum = parseFloat(total) || 0;
  const myShare = split === 'half' ? round2(totalNum / 2)
    : split === 'all' ? (paidBy === 'friend' ? totalNum : 0)
    : parseFloat(customShare) || 0;
  const owed = paidBy === 'friend' ? myShare : round2(totalNum - myShare);
  const accountName = accounts.find(a => a.id === accountId)?.name ?? 'your account';
  const categoryName = expenseCats.find(c => c.id === categoryId)?.name ?? 'Expense';
  const validShare = myShare >= 0 && myShare <= totalNum + 0.000001;

  const handleSave = async () => {
    if (!person.trim()) return showToast("Enter the friend's name", 'error');
    if (totalNum <= 0) return showToast('Enter the bill amount', 'error');
    if (!validShare) return showToast("Your share can't be more than the bill", 'error');
    if (owed <= 0) return showToast(paidBy === 'friend' ? 'Enter your share of the bill' : 'Nobody owes anything if the whole bill is yours', 'error');
    if (myShare > 0 && !categoryId) return showToast('Pick a category', 'error');
    if (!accountId) return showToast('Select an account', 'error');
    setSaving(true);
    try {
      await api.loans.createShared({
        person: person.trim(), paid_by: paidBy, total: totalNum, my_share: myShare,
        account_id: accountId, category_id: categoryId, date, notes: notes.trim(),
      });
      showToast(paidBy === 'friend' ? `Saved — you owe ${person.trim()} ${formatCurrency(owed)}` : `Saved — ${person.trim()} owes you ${formatCurrency(owed)}`);
      onSave();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  const outcome: { icon: React.ReactNode; text: React.ReactNode; hint?: string }[] = paidBy === 'friend'
    ? [
        { icon: <Receipt size={14} />, text: <><b>{formatCurrency(myShare)}</b> {categoryName} expense</>, hint: 'Counts in your budget' },
        { icon: <HandCoins size={14} />, text: <>You owe {friend} <b>{formatCurrency(owed)}</b></> },
        { icon: <Wallet size={14} />, text: <>{accountName} stays the same</>, hint: 'No money left your account yet' },
      ]
    : [
        { icon: <Wallet size={14} />, text: <><b>{formatCurrency(totalNum)}</b> leaves {accountName}</> },
        ...(myShare > 0 ? [{ icon: <Receipt size={14} />, text: <><b>{formatCurrency(myShare)}</b> {categoryName} expense</>, hint: 'Your share — counts in your budget' }] : []),
        { icon: <HandCoins size={14} />, text: <>{friend} owes you <b>{formatCurrency(owed)}</b></> },
      ];

  return (
    <div className="space-y-4">
      <div>
        <label className="label mb-1.5 block">Friend</label>
        <input type="text" value={person} onChange={e => setPerson(e.target.value)} className="input" placeholder="Friend's name" autoFocus={!defaultPerson} list="loan-friends" />
        <datalist id="loan-friends">{knownNames.map(n => <option key={n} value={n} />)}</datalist>
      </div>
      <div>
        <label className="label mb-1.5 block">Who paid?</label>
        <Segmented value={paidBy} onChange={v => { setPaidBy(v); setSplit('all'); }}
          options={[['friend', `${person.trim() || 'Friend'} paid`], ['me', 'I paid']]} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Total bill</label>
          <MoneyInput value={total} onChange={e => setTotal(e.target.value)} min="0" step="0.01" autoFocus={!!defaultPerson} />
        </div>
        <div>
          <label className="label mb-1.5 block">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
        </div>
      </div>
      <div>
        <label className="label mb-1.5 block">How to split</label>
        <Segmented size="sm" value={split} onChange={setSplit}
          options={[['all', paidBy === 'friend' ? 'All mine' : 'All theirs'], ['half', 'Half each'], ['custom', 'Custom']]} />
        {split === 'custom' && (
          <div style={{ marginTop: 8 }}>
            <MoneyInput value={customShare} onChange={e => setCustomShare(e.target.value)} min="0" step="0.01" placeholder="Your share" autoFocus />
            {!validShare && <p className="text-xs mt-1" style={{ color: 'var(--negative)' }}>Your share can't be more than the bill.</p>}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {myShare > 0 && (
          <div>
            <label className="label mb-1.5 block">Category</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="input">
              {expenseCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div style={{ gridColumn: myShare > 0 ? undefined : '1 / -1' }}>
          <label className="label mb-1.5 block">{paidBy === 'me' ? 'Paid from' : 'Account'}</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} className="input">
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label mb-1.5 block">What was it?</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="Lunch, taxi, tickets…" />
      </div>

      {totalNum > 0 && validShare && owed > 0 && (
        <div style={{ background: 'var(--paper-sunk)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
          <div className="mm-eyebrow" style={{ marginBottom: 6 }}>This will record</div>
          {outcome.map((o, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '3px 0', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink)' }}>
              <span style={{ color: 'var(--clay)', marginTop: 2, flexShrink: 0 }}>{o.icon}</span>
              <span>{o.text}{o.hint && <span style={{ color: 'var(--ink-faint)' }}> · {o.hint}</span>}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save bill'}</button>
      </div>
    </div>
  );
}

function LoanForm({ loan, defaultPerson, onSave, onCancel }: { loan?: Loan; defaultPerson?: string; onSave: () => void; onCancel: () => void }) {
  const { accounts, loans, showToast } = useAppStore();
  const [direction, setDirection] = useState<Direction>(loan?.direction ?? 'borrowed');
  const [person, setPerson] = useState(loan?.person ?? defaultPerson ?? '');
  const knownNames = groupByFriend(loans).map(f => f.name);
  const [amount, setAmount] = useState(loan?.amount?.toString() ?? '');
  const [accountId, setAccountId] = useState(loan?.account_id ?? accounts[0]?.id ?? '');
  const [date, setDate] = useState(loan?.date ?? todayISO());
  const [dueDate, setDueDate] = useState(loan?.due_date ?? '');
  const [notes, setNotes] = useState(loan?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!person.trim()) return showToast("Enter the friend's name", 'error');
    if (!amt || amt <= 0) return showToast('Enter a valid amount', 'error');
    if (!accountId) return showToast('Select an account', 'error');
    setSaving(true);
    try {
      if (loan) {
        await api.loans.update({ id: loan.id, person: person.trim(), amount: amt, due_date: dueDate || undefined, notes });
        showToast('Loan updated');
      } else {
        await api.loans.create({ person: person.trim(), direction, amount: amt, account_id: accountId, date, due_date: dueDate || undefined, notes });
        showToast('Loan added');
      }
      onSave();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* Direction is fixed once a loan exists, since it decides which way money moved. */}
      <Segmented value={direction} onChange={setDirection} disabled={!!loan}
        options={[['borrowed', 'I borrowed'], ['lent', 'I lent']]} />
      <div>
        <label className="label mb-1.5 block">{direction === 'borrowed' ? 'Borrowed from' : 'Lent to'}</label>
        <input type="text" value={person} onChange={e => setPerson(e.target.value)} className="input" placeholder="Friend's name" autoFocus={!defaultPerson} list="loan-friends" />
        <datalist id="loan-friends">{knownNames.map(n => <option key={n} value={n} />)}</datalist>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Amount</label>
          <MoneyInput value={amount} onChange={e => setAmount(e.target.value)} min="0" step="0.01" />
        </div>
        <div>
          <label className="label mb-1.5 block">{direction === 'borrowed' ? 'Received into' : 'Paid from'}</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} className="input" disabled={!!loan}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" disabled={!!loan} />
        </div>
        <div>
          <label className="label mb-1.5 block">Return By (optional)</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input" />
        </div>
      </div>
      <div>
        <label className="label mb-1.5 block">Notes</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="What it was for…" />
      </div>
      <p className="text-xs text-[hsl(var(--text-muted))]">
        {loan?.transaction_id && direction === 'borrowed'
          ? `From a shared bill. Changing the amount also changes your ${loan.category_name ?? ''} expense to match.`
          : loan?.transaction_id
            ? `From a shared bill. Your ${formatCurrency(loan.expense_amount ?? 0)} ${loan.category_name ?? ''} share is a separate expense — edit it on Transactions.`
            : direction === 'borrowed'
              ? 'Adds the money to the account. It is not counted as income.'
              : 'Takes the money out of the account. It is not counted as an expense.'}
      </p>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : loan ? 'Update Loan' : 'Add Loan'}
        </button>
      </div>
    </div>
  );
}

function ReturnForm({ loan, onSave, onCancel }: { loan: Loan; onSave: () => void; onCancel: () => void }) {
  const { accounts, showToast } = useAppStore();
  const remaining = Math.max(0, left(loan));
  const [amount, setAmount] = useState(remaining > 0 ? remaining.toString() : '');
  const [accountId, setAccountId] = useState(loan.account_id);
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const borrowed = loan.direction === 'borrowed';

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return showToast('Enter a valid amount', 'error');
    if (!accountId) return showToast('Select an account', 'error');
    setSaving(true);
    try {
      await api.loans.addRepayment({ loan_id: loan.id, amount: amt, account_id: accountId, date, notes });
      showToast('Return recorded');
      onSave();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label mb-1.5 block">{borrowed ? `Amount you paid back to ${loan.person}` : `Amount ${loan.person} gave back`}</label>
        <MoneyInput value={amount} onChange={e => setAmount(e.target.value)} min="0" step="0.01" autoFocus />
        <p className="text-xs text-[hsl(var(--text-muted))] mt-1">{formatCurrency(remaining)} still open</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">{borrowed ? 'Paid from' : 'Received into'}</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} className="input">
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label mb-1.5 block">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
        </div>
      </div>
      <div>
        <label className="label mb-1.5 block">Notes</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="Optional" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Record Return'}
        </button>
      </div>
    </div>
  );
}

const iconBtn = { color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' } as const;
const mono = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' } as const;
const linkBtn = {
  display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink-muted)',
} as const;

function Pill({ tone, children }: { tone: 'positive' | 'negative' | 'clay'; children: React.ReactNode }) {
  const [bg, fg] = {
    positive: ['var(--positive-tint)', 'var(--positive)'],
    negative: ['var(--negative-tint)', 'var(--negative)'],
    clay: ['var(--clay-tint)', 'var(--clay-ink)'],
  }[tone];
  return (
    <span style={{
      borderRadius: 999, padding: '2px 8px', fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
      background: bg, color: fg,
    }}>{children}</span>
  );
}

interface MenuItem { label: string; icon: React.ReactNode; onSelect: () => void; danger?: boolean }

/** Edit and delete live behind a "⋯" menu so the rows stay calm. */
function RowMenu({ items, className }: { items: MenuItem[]; className?: string }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className={`${className ?? ''} hover:bg-[var(--paper-sunk)] data-[state=open]:bg-[var(--paper-sunk)] data-[state=open]:opacity-100`}
          style={iconBtn} aria-label="More actions" onClick={e => e.stopPropagation()}>
          <Ellipsis size={15} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} style={{
          zIndex: 60, minWidth: 160, padding: 4, background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
        }}>
          {items.map(it => (
            <DropdownMenu.Item key={it.label} onSelect={it.onSelect}
              className="outline-none cursor-pointer data-[highlighted]:bg-[var(--paper-sunk)]"
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-sans)', fontSize: 13, color: it.danger ? 'var(--negative)' : 'var(--ink)',
              }}>
              {it.icon} {it.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function LoanRow({ loan, friendName, returns, onEdit, onDelete, onReturn, onDeleteReturn }: {
  loan: Loan;
  friendName: string;
  returns: LoanRepayment[];
  onEdit: () => void;
  onDelete: () => void;
  onReturn: () => void;
  onDeleteReturn: (r: LoanRepayment) => void;
}) {
  const borrowed = loan.direction === 'borrowed';
  const remaining = left(loan);
  const settled = isSettled(loan);
  const overdue = !settled && !!loan.due_date && loan.due_date < todayISO();
  const pct = loan.amount > 0 ? Math.min(100, (loan.returned / loan.amount) * 100) : 0;
  const bill = !!loan.transaction_id;
  const title = bill
    ? (borrowed ? `${friendName} paid for you` : `You paid for ${friendName}`)
    : (borrowed ? 'You borrowed' : 'You lent');

  return (
    <div style={{ borderTop: '1px solid var(--line)', padding: '14px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span title={bill ? 'Shared bill' : borrowed ? 'Money came in' : 'Money went out'} style={{
          width: 30, height: 30, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: settled ? 'var(--paper-sunk)' : borrowed ? 'var(--negative-tint)' : 'var(--positive-tint)',
          color: settled ? 'var(--ink-faint)' : borrowed ? 'var(--negative)' : 'var(--positive)',
        }}>
          {bill ? <Receipt size={15} /> : borrowed ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: settled ? 'var(--ink-muted)' : 'var(--ink)' }}>
              {title} <span style={{ ...mono, fontWeight: 500 }}>{formatCurrency(loan.amount)}</span>
              {bill && loan.category_name && (
                <span style={{ marginLeft: 8, verticalAlign: 'middle' }}><Pill tone="clay">{loan.category_name}</Pill></span>
              )}
            </div>
            {settled ? (
              <Pill tone="positive">✓ Settled</Pill>
            ) : (
              <span style={{ ...mono, fontSize: 14, fontWeight: 500, color: 'var(--ink-strong)', whiteSpace: 'nowrap' }}>
                {formatCurrency(remaining)} <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 400, color: 'var(--ink-faint)' }}>left</span>
              </span>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 2 }}>
            {formatDate(loan.date)}{loan.account_name ? ` · ${loan.account_name}` : ''}
            {bill && !borrowed && loan.expense_amount !== undefined && loan.expense_amount !== null && (
              <> · bill {formatCurrency(loan.amount + loan.expense_amount)}, your share {formatCurrency(loan.expense_amount)}</>
            )}
            {loan.due_date && !settled && (
              <span style={{ color: overdue ? 'var(--negative)' : 'var(--ink-faint)', fontWeight: overdue ? 600 : 400 }}>
                {' · '}{overdue ? 'Overdue since' : 'Return by'} {formatDate(loan.due_date)}
              </span>
            )}
            {loan.notes && <> · {loan.notes}</>}
          </div>
          {!settled && pct > 0 && (
            <div style={{ marginTop: 8, height: 4, background: 'var(--paper-sunk)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--clay)', borderRadius: 999, transition: 'width 700ms' }} />
            </div>
          )}

          {returns.map(r => (
            <div key={r.id} className="group" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              {r.offset_id
                ? <ArrowLeftRight size={13} style={{ color: 'var(--clay)', flexShrink: 0 }} />
                : <CornerDownRight size={13} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />}
              <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.offset_id ? 'Cancelled out' : borrowed ? 'You paid back' : `${friendName} paid back`}
                <span style={{ color: 'var(--ink-faint)' }}> · {formatDate(r.date)}{!r.offset_id && r.account_name ? ` · ${r.account_name}` : ''}{r.notes ? ` · ${r.notes}` : ''}</span>
              </span>
              <span style={{ ...mono, fontSize: 13, color: 'var(--ink-muted)' }}>{formatCurrency(r.amount)}</span>
              <RowMenu className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" items={[
                r.offset_id
                  ? { label: 'Undo cancel-out', icon: <Undo2 size={13} />, onSelect: () => onDeleteReturn(r), danger: true }
                  : { label: 'Delete', icon: <Trash2 size={13} />, onSelect: () => onDeleteReturn(r), danger: true },
              ]} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {!settled && (
            <button onClick={onReturn} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 12.5 }}>
              <Plus size={12} /> {borrowed ? 'Pay back' : 'Got back'}
            </button>
          )}
          <RowMenu items={[
            { label: 'Edit loan', icon: <Pencil size={13} />, onSelect: onEdit },
            { label: 'Delete loan', icon: <Trash2 size={13} />, onSelect: onDelete, danger: true },
          ]} />
        </div>
      </div>
    </div>
  );
}

function FriendCard({ friend, onEdit, onDelete, onReturn, onDeleteReturn, onNewLoan, onSplitBill, onCancelOut }: {
  friend: Friend;
  onEdit: (l: Loan) => void;
  onDelete: (l: Loan) => void;
  onReturn: (l: Loan) => void;
  onDeleteReturn: (r: LoanRepayment) => void;
  onNewLoan: () => void;
  onSplitBill: () => void;
  onCancelOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showSettled, setShowSettled] = useState(false);
  const [returns, setReturns] = useState<Record<string, LoanRepayment[]>>({});

  // Refetch when a loan is added or removed, or its returns change.
  const loansKey = friend.loans.map(l => `${l.id}:${l.returned}`).join(',');
  useEffect(() => {
    if (!open) return;
    Promise.all(friend.loans.map(l =>
      api.loans.repayments(l.id).catch(() => [] as LoanRepayment[]).then(rs => [l.id, rs] as const),
    )).then(entries => setReturns(Object.fromEntries(entries)));
  }, [open, loansKey]);

  const { name, net, lentOpen, borrowedOpen } = friend;
  const square = isZero(net);
  const canCancel = canCancelOut(friend);
  const cancelAmount = friend.cancellable;
  const openLoans = friend.loans.filter(l => !isSettled(l));
  const settledLoans = friend.loans.filter(isSettled);
  // With nothing open, show the history straight away instead of behind a second toggle.
  const visibleLoans = openLoans.length === 0 || showSettled ? friend.loans : openLoans;
  const netColor = square ? 'var(--ink-faint)' : net > 0 ? 'var(--positive)' : 'var(--negative)';

  return (
    <div className="mm-card" style={{ padding: 0, cursor: 'default', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="hover:bg-[var(--paper-sunk)]"
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background var(--dur-fast)' }}>
        <span aria-hidden style={{
          width: 38, height: 38, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--clay-tint)', color: 'var(--clay-ink)', fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 600,
        }}>{name.charAt(0).toUpperCase()}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, color: 'var(--ink-strong)' }}>{name}</h3>
            {friend.overdue && <Pill tone="negative">Overdue</Pill>}
            {canCancel && <Pill tone="clay">Can cancel out</Pill>}
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 2 }}>
            {canCancel
              ? <>You owe {formatCurrency(borrowedOpen)} · {name} owes {formatCurrency(lentOpen)}</>
              : friend.openCount > 0
                ? <>{friend.openCount} open {friend.openCount === 1 ? 'loan' : 'loans'}</>
                : <>{friend.loans.length} {friend.loans.length === 1 ? 'loan' : 'loans'}, all paid back</>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {!square && (
            <div style={{ ...mono, fontSize: 19, fontWeight: 500, color: netColor }}>{formatCurrency(Math.abs(net))}</div>
          )}
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, marginTop: 1, color: netColor }}>
            {square ? (friend.openCount > 0 ? 'Evens out' : '✓ All square') : net > 0 ? 'owes you' : 'you owe'}
          </div>
        </div>
        <ChevronRight size={16} style={{ color: 'var(--ink-faint)', flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform var(--dur-fast)' }} />
      </button>

      {open && (
        <div style={{ padding: '0 20px 14px' }}>
          {canCancel && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', margin: '2px 0 14px', padding: '12px 14px',
              background: 'var(--clay-tint)', borderRadius: 'var(--radius)',
            }}>
              <ArrowLeftRight size={18} style={{ color: 'var(--clay)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 200, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink)' }}>
                <div style={{ fontWeight: 600 }}>You both owe each other</div>
                <div style={{ color: 'var(--ink-muted)', marginTop: 1 }}>
                  Cancel out {formatCurrency(cancelAmount)} and {square
                    ? 'nobody owes anything.'
                    : net > 0 ? `${name} owes you just ${formatCurrency(net)}.` : `you owe ${name} just ${formatCurrency(-net)}.`}
                  {' '}No money moves.
                </div>
              </div>
              <button onClick={onCancelOut} className="btn-primary" style={{ padding: '6px 12px', fontSize: 13 }}>
                Cancel out {formatCurrency(cancelAmount)}
              </button>
            </div>
          )}

          {visibleLoans.map(l => (
            <LoanRow key={l.id} loan={l} friendName={name} returns={returns[l.id] ?? []}
              onEdit={() => onEdit(l)} onDelete={() => onDelete(l)} onReturn={() => onReturn(l)} onDeleteReturn={onDeleteReturn} />
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            {openLoans.length > 0 && settledLoans.length > 0 ? (
              <button onClick={() => setShowSettled(s => !s)} style={linkBtn}>
                {showSettled ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {showSettled ? 'Hide' : 'Show'} paid-back loans ({settledLoans.length})
              </button>
            ) : <span />}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button onClick={onSplitBill} style={{ ...linkBtn, fontWeight: 600, color: 'var(--clay)' }}>
                <Receipt size={13} /> Split a bill
              </button>
              <button onClick={onNewLoan} style={{ ...linkBtn, fontWeight: 600, color: 'var(--clay)' }}>
                <Plus size={13} /> New loan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, total, children }: { title: string; total?: number; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 className="mm-eyebrow">{title}</h2>
        {total !== undefined && (
          <span style={{ ...mono, fontSize: 13, color: 'var(--ink-muted)' }}>{formatCurrency(total)}</span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </section>
  );
}

function CancelOutSummary({ friend }: { friend: Friend }) {
  const { name, net, lentOpen, borrowedOpen } = friend;
  const amount = friend.cancellable;
  const row = (label: string, value: string, strong = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', fontFamily: 'var(--font-sans)', fontSize: 13.5,
      color: strong ? 'var(--ink-strong)' : 'var(--ink-muted)', fontWeight: strong ? 600 : 400 }}>
      <span>{label}</span><span style={strong ? undefined : { ...mono, fontWeight: 500 }}>{value}</span>
    </div>
  );
  return (
    <div className="space-y-3">
      <div>
        {row(`You owe ${name}`, formatCurrency(borrowedOpen))}
        {row(`${name} owes you`, formatCurrency(lentOpen))}
        <div style={{ borderTop: '1px solid var(--line)', marginTop: 4 }} />
        {row('After cancelling out', isZero(net) ? 'All square' : net > 0 ? `${name} owes you ${formatCurrency(net)}` : `You owe ${formatCurrency(-net)}`, true)}
      </div>
      <p className="text-xs text-[hsl(var(--text-muted))]">
        This records {formatCurrency(amount)} as paid back on both sides, oldest loans first. Account balances don't change,
        since no money changes hands. You can undo it from any loan it touched.
      </p>
    </div>
  );
}

export function Loans() {
  const { loans, fetchLoans, fetchAccounts, fetchDashboard, fetchTransactions, showToast } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editLoan, setEditLoan] = useState<Loan | undefined>();
  const [newLoanPerson, setNewLoanPerson] = useState<string | undefined>();
  const [returnLoan, setReturnLoan] = useState<Loan | undefined>();
  const [deleteLoan, setDeleteLoan] = useState<Loan | undefined>();
  const [deleteReturn, setDeleteReturn] = useState<LoanRepayment | undefined>();
  const [cancelOutKey, setCancelOutKey] = useState<string | undefined>();
  const [cancelling, setCancelling] = useState(false);
  const [showSettled, setShowSettled] = useState(false);

  useEffect(() => { fetchLoans(); }, []);

  // Loans move money between you and friends, so balances need a refresh too.
  // Shared bills also add an expense, so transactions refresh with them.
  const refresh = () => { fetchLoans(); fetchAccounts(); fetchDashboard(); fetchTransactions({ limit: 100 }); };

  const handleDeleteLoan = async () => {
    if (!deleteLoan) return;
    try {
      await api.loans.delete(deleteLoan.id);
      showToast('Loan deleted');
      setDeleteLoan(undefined);
      refresh();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
  };

  const handleDeleteReturn = async () => {
    if (!deleteReturn) return;
    try {
      await api.loans.deleteRepayment(deleteReturn.id);
      showToast(deleteReturn.offset_id ? 'Cancel-out undone' : 'Deleted');
      setDeleteReturn(undefined);
      refresh();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
  };

  const openForm = (loan?: Loan, person?: string) => { setEditLoan(loan); setNewLoanPerson(person); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditLoan(undefined); setNewLoanPerson(undefined); };
  // undefined: closed; '' : open with no friend picked yet.
  const [billPerson, setBillPerson] = useState<string | undefined>();
  const openBill = (person?: string) => setBillPerson(person ?? '');
  const closeBill = () => setBillPerson(undefined);

  const byAmount = (a: Friend, b: Friend) => Math.abs(b.net) - Math.abs(a.net) || a.name.localeCompare(b.name);
  const friends = groupByFriend(loans);
  const cancelOutFriend = friends.find(f => f.key === cancelOutKey);

  const handleCancelOut = async () => {
    if (!cancelOutFriend) return;
    setCancelling(true);
    try {
      const amount = await api.loans.offset(cancelOutFriend.loans.map(l => l.id), todayISO());
      showToast(`Cancelled out ${formatCurrency(amount)} with ${cancelOutFriend.name}`);
      setCancelOutKey(undefined);
      refresh();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setCancelling(false); }
  };

  const youOwe = friends.filter(f => !isZero(f.net) && f.net < 0).sort(byAmount);
  const owedToYou = friends.filter(f => !isZero(f.net) && f.net > 0).sort(byAmount);
  // Open both ways for the same amount: nothing is owed, but the loans are still open.
  const evens = friends.filter(f => isZero(f.net) && f.openCount > 0).sort(byAmount);
  const settled = friends.filter(f => isZero(f.net) && f.openCount === 0).sort(byAmount);
  const youOweTotal = youOwe.reduce((s, f) => s - f.net, 0);
  const owedToYouTotal = owedToYou.reduce((s, f) => s + f.net, 0);

  const lead = loans.length > 0
    ? `Friends owe you ${formatCurrency(owedToYouTotal)} · you owe ${formatCurrency(youOweTotal)}.`
    : undefined;

  const card = (f: Friend) => (
    <FriendCard key={f.key} friend={f}
      onEdit={l => openForm(l)}
      onDelete={setDeleteLoan}
      onReturn={setReturnLoan}
      onDeleteReturn={setDeleteReturn}
      onNewLoan={() => openForm(undefined, f.name)}
      onSplitBill={() => openBill(f.name)}
      onCancelOut={() => setCancelOutKey(f.key)}
    />
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        eyebrow="Between friends"
        title="Loans"
        lead={lead}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => openBill()} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Receipt size={15} /> Split a bill
            </button>
            <button onClick={() => openForm()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} /> New Loan
            </button>
          </div>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '32px 40px 56px' }}>
          {loans.length === 0 ? (
            <EmptyState
              icon={<HandCoins size={22} />}
              title="No loans"
              description="Record money you borrow from or lend to friends, or a bill one of you paid for the other, and track it until it's paid back."
              action={
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openBill()} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Receipt size={14} /> Split a bill</button>
                  <button onClick={() => openForm()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> New Loan</button>
                </div>
              }
            />
          ) : (
            <>
              {youOwe.length > 0 && <Section title="You owe" total={youOweTotal}>{youOwe.map(card)}</Section>}
              {owedToYou.length > 0 && <Section title="Owed to you" total={owedToYouTotal}>{owedToYou.map(card)}</Section>}
              {evens.length > 0 && <Section title="Evens out">{evens.map(card)}</Section>}
              {youOwe.length + owedToYou.length + evens.length === 0 && (
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-muted)', marginBottom: 28 }}>
                  All square — nobody owes anybody right now.
                </p>
              )}
              {settled.length > 0 && (
                <section>
                  <button onClick={() => setShowSettled(s => !s)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 12 }}
                    className="mm-eyebrow">
                    {showSettled ? <ChevronDown size={13} /> : <ChevronRight size={13} />} Settled ({settled.length})
                  </button>
                  {showSettled && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{settled.map(card)}</div>}
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <Modal open={showForm} onClose={closeForm} title={editLoan ? 'Edit Loan' : newLoanPerson ? `New Loan with ${newLoanPerson}` : 'New Loan'} size="sm">
        {!editLoan && (
          <button onClick={() => { const p = newLoanPerson; closeForm(); openBill(p); }}
            style={{ ...linkBtn, width: '100%', gap: 8, marginBottom: 14, padding: '9px 12px', borderRadius: 'var(--radius)', background: 'var(--clay-tint)', color: 'var(--clay-ink)', fontWeight: 600 }}>
            <Receipt size={14} /> A friend paid for something, or you paid for them? Split a bill instead
          </button>
        )}
        <LoanForm
          key={editLoan?.id ?? newLoanPerson ?? 'new'}
          loan={editLoan}
          defaultPerson={newLoanPerson}
          onSave={() => { closeForm(); refresh(); }}
          onCancel={closeForm}
        />
      </Modal>

      <Modal open={billPerson !== undefined} onClose={closeBill} title={billPerson ? `Split a bill with ${billPerson}` : 'Split a bill'} size="sm">
        <SharedBillForm
          key={billPerson ?? 'closed'}
          defaultPerson={billPerson || undefined}
          onSave={() => { closeBill(); refresh(); }}
          onCancel={closeBill}
        />
      </Modal>

      <Modal open={!!returnLoan} onClose={() => setReturnLoan(undefined)}
        title={returnLoan ? (returnLoan.direction === 'borrowed' ? `Pay back ${returnLoan.person}` : `${returnLoan.person} paid you back`) : ''} size="sm">
        {returnLoan && (
          <ReturnForm loan={returnLoan}
            onSave={() => { setReturnLoan(undefined); refresh(); }}
            onCancel={() => setReturnLoan(undefined)} />
        )}
      </Modal>

      <Modal open={!!cancelOutFriend} onClose={() => setCancelOutKey(undefined)} title={cancelOutFriend ? `Cancel out with ${cancelOutFriend.name}` : ''} size="sm"
        footer={<>
          <button onClick={() => setCancelOutKey(undefined)} className="btn-secondary">Not now</button>
          <button onClick={handleCancelOut} disabled={cancelling} className="btn-primary">
            {cancelling ? 'Saving…' : cancelOutFriend ? `Cancel out ${formatCurrency(cancelOutFriend.cancellable)}` : ''}
          </button>
        </>}
      >
        {cancelOutFriend && <CancelOutSummary friend={cancelOutFriend} />}
      </Modal>

      <Modal open={!!deleteLoan} onClose={() => setDeleteLoan(undefined)} title="Delete Loan" size="sm"
        footer={<><button onClick={() => setDeleteLoan(undefined)} className="btn-secondary">Cancel</button><button onClick={handleDeleteLoan} className="btn-danger">Delete</button></>}
      >
        <p className="text-sm text-[hsl(var(--text-muted))]">
          Delete this loan with {deleteLoan?.person}? Every balance change it made, including its returns, will be undone.
          {deleteLoan?.transaction_id && <> The {formatCurrency(deleteLoan.expense_amount ?? 0)} {deleteLoan.category_name ?? ''} expense from the same bill is deleted too.</>}
          If it was cancelled out against other loans, that cancel-out is undone too.
        </p>
      </Modal>

      <Modal open={!!deleteReturn} onClose={() => setDeleteReturn(undefined)} title={deleteReturn?.offset_id ? 'Undo Cancel-out' : 'Delete Return'} size="sm"
        footer={<>
          <button onClick={() => setDeleteReturn(undefined)} className="btn-secondary">Cancel</button>
          <button onClick={handleDeleteReturn} className="btn-danger">{deleteReturn?.offset_id ? 'Undo' : 'Delete'}</button>
        </>}
      >
        <p className="text-sm text-[hsl(var(--text-muted))]">
          {deleteReturn?.offset_id
            ? 'Undo this cancel-out? It is removed from every loan it touched, so both sides open up again. Account balances don\'t change.'
            : <>Delete this {deleteReturn ? formatCurrency(deleteReturn.amount) : ''} return? Its account balance change will be undone.</>}
        </p>
      </Modal>
    </div>
  );
}
