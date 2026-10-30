import { useMemo, useState } from 'react';
import { Banknote } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, todayISO } from '../../lib/utils';
import { groupByFriend } from '../../lib/friends';
import { FormSheet, useDirty } from '../ui/FormSheet';
import { MoneyInput } from '../ui/MoneyInput';
import { Segmented } from '../ui/Segmented';
import { MoreOptions } from '../ui/MoreOptions';
import { CategoryIcon } from '../ui/CategoryIcon';
import { chipStyle } from './TransactionForm';

type Payer = 'friend' | 'me';
type Split = 'all' | 'half' | 'custom';
const round2 = (n: number) => Math.round(n * 100) / 100;
const CASH = 'cash';

/**
 * The one way to record money with a friend. Cash is a plain loan; picking a
 * category makes it a shared bill, where your share is an expense and the
 * rest is owed between you.
 *
 * | Who paid | For what | Command |
 * | Friend   | Cash     | create_loan(borrowed) |
 * | Me       | Cash     | create_loan(lent) |
 * | Friend   | Category | create_shared_expense(paid_by=friend) |
 * | Me       | Category | create_shared_expense(paid_by=me) |
 */
export function AddFriendForm({ defaultPerson, onSaved, onClose }: { defaultPerson?: string; onSaved: () => void; onClose: () => void }) {
  const { accounts, categories, loans, transactions, showToast } = useAppStore();
  const knownNames = groupByFriend(loans).map(f => f.name);
  const expenseCats = categories.filter(c => c.category_type === 'expense');
  // The six expense categories used most, from what's loaded; ties go alphabetical.
  const topCats = useMemo(() => {
    const uses = new Map<string, number>();
    for (const t of transactions) uses.set(t.category_id, (uses.get(t.category_id) ?? 0) + 1);
    return [...expenseCats].sort((a, b) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) || a.name.localeCompare(b.name)).slice(0, 6);
  }, [categories, transactions]);

  const [person, setPerson] = useState(defaultPerson ?? '');
  const [paidBy, setPaidBy] = useState<Payer>('friend');
  const [forWhat, setForWhat] = useState(CASH);
  const [amount, setAmount] = useState('');
  const [split, setSplit] = useState<Split>('all');
  const [customShare, setCustomShare] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [date, setDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const dirty = useDirty({ person, paidBy, forWhat, amount, split, customShare, accountId, date, dueDate, notes });

  const name = person.trim() || 'Friend';
  const cash = forWhat === CASH;
  const total = parseFloat(amount) || 0;
  const myShare = cash ? 0
    : split === 'half' ? round2(total / 2)
    : split === 'all' ? (paidBy === 'friend' ? total : 0)
    : parseFloat(customShare) || 0;
  const validShare = cash || (myShare >= 0 && myShare <= total + 0.000001);
  // What ends up owed between you, and which way.
  const owed = cash ? total : paidBy === 'friend' ? myShare : round2(total - myShare);
  const accountName = accounts.find(a => a.id === accountId)?.name ?? 'Account';
  const category = expenseCats.find(c => c.id === forWhat);

  const handleSave = async () => {
    if (!person.trim()) return showToast('Enter a name', 'error');
    if (total <= 0) return showToast('Enter an amount', 'error');
    if (!validShare) return showToast("Your share can't be more than the bill", 'error');
    if (owed <= 0) return showToast(paidBy === 'friend' ? 'Enter your share' : 'Nothing is owed if the whole bill is yours', 'error');
    if (!accountId) return showToast('Pick an account', 'error');
    setSaving(true);
    try {
      const common = { person: person.trim(), account_id: accountId, date, due_date: dueDate || undefined, notes: notes.trim() };
      if (cash) await api.loans.create({ ...common, direction: paidBy === 'friend' ? 'borrowed' : 'lent', amount: total });
      else await api.loans.createShared({ ...common, paid_by: paidBy, total, my_share: myShare, category_id: forWhat });
      showToast('Saved');
      onSaved();
      onClose();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  const tags: string[] = cash
    ? paidBy === 'friend'
      ? [`You owe ${name} ${formatCurrency(owed)}`, `${accountName} +${formatCurrency(total)}`]
      : [`${name} owes you ${formatCurrency(owed)}`, `${accountName} −${formatCurrency(total)}`]
    : [
        ...(myShare > 0 ? [`${category?.name ?? 'Expense'} ${formatCurrency(myShare)}`] : []),
        paidBy === 'friend' ? `You owe ${name} ${formatCurrency(owed)}` : `${name} owes you ${formatCurrency(owed)}`,
        ...(paidBy === 'me' ? [`${accountName} −${formatCurrency(total)}`] : []),
      ];

  const accountLabel = paidBy === 'me' ? 'From' : cash ? 'Into' : 'Account';

  return (
    <FormSheet title={defaultPerson ? `Add with ${defaultPerson}` : 'Add'} onClose={onClose} onSubmit={handleSave} dirty={dirty} saving={saving}>
      <div>
        <label className="label mb-1.5 block">Friend</label>
        <input type="text" value={person} onChange={e => setPerson(e.target.value)} className="input" placeholder="Name"
          autoFocus={!defaultPerson} list="loan-friends" />
        <datalist id="loan-friends">{knownNames.map(n => <option key={n} value={n} />)}</datalist>
      </div>
      <div>
        <label className="label mb-1.5 block">Who paid?</label>
        <Segmented value={paidBy} onChange={v => { setPaidBy(v); setSplit('all'); }} label="Who paid"
          options={[['friend', `${name} paid`], ['me', 'I paid']]} />
      </div>
      <div>
        <label className="label mb-1.5 block">For what?</label>
        <div role="group" aria-label="For what" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button type="button" aria-pressed={cash} onClick={() => setForWhat(CASH)} style={chipStyle(cash)}>
            <Banknote size={14} /> Cash
          </button>
          {topCats.map(c => (
            <button key={c.id} type="button" aria-pressed={forWhat === c.id} onClick={() => setForWhat(c.id)} style={chipStyle(forWhat === c.id)}>
              <span style={{ color: c.color, display: 'flex' }}><CategoryIcon icon={c.icon} size={14} /></span> {c.name}
            </button>
          ))}
          <select aria-label="More categories" className="input" style={{ width: 'auto', padding: '5px 10px', fontSize: 13, borderRadius: 999 }}
            value={!cash && !topCats.some(c => c.id === forWhat) ? forWhat : ''}
            onChange={e => e.target.value && setForWhat(e.target.value)}>
            <option value="">More…</option>
            {expenseCats.filter(c => !topCats.includes(c)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label mb-1.5 block">{cash ? 'Amount' : 'Total bill'}</label>
        <MoneyInput value={amount} onChange={e => setAmount(e.target.value)} min="0" step="0.01" autoFocus={!!defaultPerson} />
      </div>
      {!cash && (
        <div>
          <label className="label mb-1.5 block">Split</label>
          <Segmented size="sm" value={split} onChange={setSplit} label="Split"
            options={[['all', paidBy === 'friend' ? 'All mine' : 'All theirs'], ['half', 'Half'], ['custom', 'Custom']]} />
          {split === 'custom' && (
            <div style={{ marginTop: 8 }}>
              <MoneyInput value={customShare} onChange={e => setCustomShare(e.target.value)} min="0" step="0.01" placeholder="Your share" aria-label="Your share" autoFocus />
              {!validShare && <p className="text-xs mt-1" style={{ color: 'var(--negative)' }}>Your share can't be more than the bill</p>}
            </div>
          )}
        </div>
      )}
      <div>
        <label className="label mb-1.5 block">{accountLabel}</label>
        <select value={accountId} onChange={e => setAccountId(e.target.value)} className="input">
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <MoreOptions>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label mb-1.5 block">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label mb-1.5 block">Return by</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input" />
          </div>
        </div>
        <div>
          <label className="label mb-1.5 block">Note</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="Lunch, taxi, tickets" />
        </div>
      </MoreOptions>
      {total > 0 && validShare && owed > 0 && (
        <div aria-live="polite" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {tags.map(t => (
            <span key={t} style={{
              borderRadius: 999, padding: '3px 10px', background: 'var(--paper-sunk)',
              fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-muted)',
            }}>{t}</span>
          ))}
        </div>
      )}
    </FormSheet>
  );
}
