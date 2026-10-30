import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, HandCoins, ChevronRight, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CornerDownRight, Undo2, Receipt, Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, formatDate, formatSigned, todayISO } from '../../lib/utils';
import { groupByFriend, left, isSettled, isZero, type Friend } from '../../lib/friends';
import { useAddRequest } from '../../lib/useAddRequest';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { FormSheet, useDirty } from '../ui/FormSheet';
import { MoneyInput } from '../ui/MoneyInput';
import { EmptyState } from '../ui/EmptyState';
import { RowMenu } from '../ui/RowMenu';
import { MoreOptions } from '../ui/MoreOptions';
import { SummaryBar } from '../ui/SummaryBar';
import { Pill } from '../ui/Pill';
import { PageHeader } from '../layout/PageHeader';
import { AddFriendForm } from '../forms/AddFriendForm';
import type { Loan, LoanRepayment } from '../../types';

const mono = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' } as const;
const faint = { fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)' } as const;
const linkBtn = {
  display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink-muted)',
} as const;

/** Editing keeps to what can change; direction, account and date are fixed once money has moved. */
function LoanForm({ loan, onSaved, onClose }: { loan: Loan; onSaved: () => void; onClose: () => void }) {
  const { loans, showToast } = useAppStore();
  const knownNames = groupByFriend(loans).map(f => f.name);
  const [person, setPerson] = useState(loan.person);
  const [amount, setAmount] = useState(loan.amount.toString());
  const [dueDate, setDueDate] = useState(loan.due_date ?? '');
  const [notes, setNotes] = useState(loan.notes);
  const [saving, setSaving] = useState(false);
  const dirty = useDirty({ person, amount, dueDate, notes });
  const borrowed = loan.direction === 'borrowed';

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!person.trim()) return showToast('Enter a name', 'error');
    if (!amt || amt <= 0) return showToast('Enter an amount', 'error');
    setSaving(true);
    try {
      await api.loans.update({ id: loan.id, person: person.trim(), amount: amt, due_date: dueDate || undefined, notes });
      showToast('Saved');
      onSaved();
      onClose();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <FormSheet title="Edit loan" onClose={onClose} onSubmit={handleSave} dirty={dirty} saving={saving}>
      <p style={faint}>
        {borrowed ? 'Borrowed' : 'Lent'} {formatDate(loan.date)} {borrowed ? 'into' : 'from'} {loan.account_name ?? 'an account'}
      </p>
      <div>
        <label className="label mb-1.5 block">Friend</label>
        <input type="text" value={person} onChange={e => setPerson(e.target.value)} className="input" list="loan-friends" autoFocus />
        <datalist id="loan-friends">{knownNames.map(n => <option key={n} value={n} />)}</datalist>
      </div>
      <div>
        <label className="label mb-1.5 block">Amount</label>
        <MoneyInput value={amount} onChange={e => setAmount(e.target.value)} min="0" step="0.01" />
        {loan.transaction_id && (
          <p style={{ ...faint, marginTop: 6 }}>
            {borrowed
              ? `Also changes your ${loan.category_name ?? ''} expense`.replace('  ', ' ')
              : `Your ${formatCurrency(loan.expense_amount ?? 0)} ${loan.category_name ?? ''} share is edited on Transactions`.replace('  ', ' ')}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Return by</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label mb-1.5 block">Note</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="Optional" />
        </div>
      </div>
    </FormSheet>
  );
}

function ReturnForm({ loan, onSaved, onClose }: { loan: Loan; onSaved: () => void; onClose: () => void }) {
  const { accounts, showToast } = useAppStore();
  const remaining = Math.max(0, left(loan));
  const [amount, setAmount] = useState(remaining > 0 ? remaining.toString() : '');
  const [accountId, setAccountId] = useState(loan.account_id);
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const borrowed = loan.direction === 'borrowed';
  const dirty = useDirty({ amount, accountId, date, notes });

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return showToast('Enter an amount', 'error');
    if (!accountId) return showToast('Pick an account', 'error');
    setSaving(true);
    try {
      await api.loans.addRepayment({ loan_id: loan.id, amount: amt, account_id: accountId, date, notes });
      showToast('Saved');
      onSaved();
      onClose();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <FormSheet title={borrowed ? `Pay back ${loan.person}` : `${loan.person} paid you back`} onClose={onClose} onSubmit={handleSave} dirty={dirty} saving={saving}>
      <div>
        <label className="label mb-1.5 block">Amount</label>
        <MoneyInput value={amount} onChange={e => setAmount(e.target.value)} min="0" step="0.01" autoFocus />
        <p style={{ ...faint, marginTop: 6 }}>of {formatCurrency(remaining)} left</p>
      </div>
      <div>
        <label className="label mb-1.5 block">{borrowed ? 'From' : 'Into'}</label>
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
            <label className="label mb-1.5 block">Note</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="Optional" />
          </div>
        </div>
      </MoreOptions>
    </FormSheet>
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
  const bill = !!loan.transaction_id;
  const total = bill && !borrowed ? loan.amount + (loan.expense_amount ?? 0) : loan.amount;
  const title = bill
    ? (borrowed ? `${friendName} paid ${formatCurrency(total)}` : `You paid ${formatCurrency(total)}`)
    : `${borrowed ? 'Borrowed' : 'Lent'} ${formatCurrency(total)}`;

  return (
    <div className="group" style={{ borderTop: '1px solid var(--line)', padding: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span aria-hidden style={{
          width: 30, height: 30, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: settled ? 'var(--paper-sunk)' : borrowed ? 'var(--paper-sunk)' : 'var(--positive-tint)',
          color: settled ? 'var(--ink-faint)' : borrowed ? 'var(--ink-muted)' : 'var(--positive)',
        }}>
          {bill ? <Receipt size={15} /> : borrowed ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: settled ? 'var(--ink-muted)' : 'var(--ink)' }}>
            {title}
            {bill && loan.category_name && <Pill tone="clay">{loan.category_name}</Pill>}
          </div>
          <div style={{ ...faint, marginTop: 1 }}>
            {formatDate(loan.date)}{loan.account_name ? ` · ${loan.account_name}` : ''}
            {loan.due_date && !settled && (
              <span style={{ color: overdue ? 'var(--negative)' : undefined }}> · due {formatDate(loan.due_date)}</span>
            )}
            {loan.notes && <> · {loan.notes}</>}
          </div>
        </div>
        {settled
          ? <Pill tone="positive" icon={<Check size={11} />}>Settled</Pill>
          : <span style={{ ...mono, fontSize: 14, fontWeight: 500, color: 'var(--ink-strong)', whiteSpace: 'nowrap' }}>{formatCurrency(remaining)} left</span>}
        {!settled && (
          <button onClick={onReturn} className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12.5 }}>
            {borrowed ? 'Pay back' : 'Got paid back'}
          </button>
        )}
        <RowMenu items={[
          { label: 'Edit', icon: <Pencil size={13} />, onSelect: onEdit },
          { label: 'Delete', icon: <Trash2 size={13} />, onSelect: onDelete, danger: true },
        ]} />
      </div>

      {returns.map(r => (
        <div key={r.id} className="group" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 0 42px' }}>
          {r.offset_id
            ? <ArrowLeftRight size={13} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />
            : <CornerDownRight size={13} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />}
          <span style={{ flex: 1, minWidth: 0, ...faint, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.offset_id ? 'Settled both ways' : 'Paid back'} {formatCurrency(r.amount)} · {formatDate(r.date)}
            {!r.offset_id && r.account_name ? ` · ${r.account_name}` : ''}{r.notes ? ` · ${r.notes}` : ''}
          </span>
          <RowMenu items={[
            r.offset_id
              ? { label: 'Undo settle', icon: <Undo2 size={13} />, onSelect: () => onDeleteReturn(r), danger: true }
              : { label: 'Delete', icon: <Trash2 size={13} />, onSelect: () => onDeleteReturn(r), danger: true },
          ]} />
        </div>
      ))}
    </div>
  );
}

function FriendCard({ friend, onEdit, onDelete, onReturn, onDeleteReturn, onAdd, onSettle }: {
  friend: Friend;
  onEdit: (l: Loan) => void;
  onDelete: (l: Loan, returns: LoanRepayment[]) => void;
  onReturn: (l: Loan) => void;
  onDeleteReturn: (r: LoanRepayment, all: LoanRepayment[]) => void;
  onAdd: () => void;
  onSettle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showSettled, setShowSettled] = useState(false);
  const [returns, setReturns] = useState<Record<string, LoanRepayment[]>>({});
  const pendingDeletes = useAppStore(s => s.pendingDeletes);

  // Refetch when a loan is added or removed, or its paybacks change.
  const loansKey = friend.loans.map(l => `${l.id}:${l.returned}`).join(',');
  useEffect(() => {
    if (!open) return;
    Promise.all(friend.loans.map(l =>
      api.loans.repayments(l.id).catch(() => [] as LoanRepayment[]).then(rs => [l.id, rs] as const),
    )).then(entries => setReturns(Object.fromEntries(entries)));
  }, [open, loansKey]);

  const { name, net, openCount, overdueCount } = friend;
  const allReturns = Object.values(returns).flat();
  const openLoans = friend.loans.filter(l => !isSettled(l));
  const settledLoans = friend.loans.filter(isSettled);
  // With nothing open, show the history straight away instead of behind a second toggle.
  const visibleLoans = openLoans.length === 0 || showSettled ? friend.loans : openLoans;

  return (
    <div className="mm-card" style={{ padding: 0, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="hover:bg-[var(--paper-sunk)]"
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background var(--dur-fast)' }}>
        <span aria-hidden style={{
          width: 36, height: 36, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--clay-tint)', color: 'var(--clay-ink)', fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600,
        }}>{name.charAt(0).toUpperCase()}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 600, color: 'var(--ink-strong)' }}>{name}</h3>
          <div style={{ ...faint, marginTop: 1 }}>
            {openCount > 0 ? `${openCount} open` : 'Settled'}
            {overdueCount > 0 && <span style={{ color: 'var(--negative)' }}> · {overdueCount} overdue</span>}
          </div>
        </div>
        {!isZero(net) && (
          <span style={{ ...mono, fontSize: 17, fontWeight: 500, color: net > 0 ? 'var(--positive)' : 'var(--ink)' }}>{formatSigned(net)}</span>
        )}
        <ChevronRight size={16} style={{ color: 'var(--ink-faint)', flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform var(--dur-fast)' }} />
      </button>

      {open && (
        <div style={{ padding: '0 18px 12px' }}>
          {friend.cancellable > 0.000001 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0 12px' }}>
              <ArrowLeftRight size={15} style={{ color: 'var(--clay)' }} />
              <button onClick={onSettle} className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12.5 }}>
                Settle {formatCurrency(friend.cancellable)} both ways
              </button>
            </div>
          )}

          {visibleLoans.map(l => (
            <LoanRow key={l.id} loan={l} friendName={name}
              returns={(returns[l.id] ?? []).filter(r => !pendingDeletes.has(r.id))}
              onEdit={() => onEdit(l)} onDelete={() => onDelete(l, returns[l.id] ?? [])}
              onReturn={() => onReturn(l)} onDeleteReturn={r => onDeleteReturn(r, allReturns)} />
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
            {openLoans.length > 0 && settledLoans.length > 0 ? (
              <button onClick={() => setShowSettled(s => !s)} style={linkBtn} aria-expanded={showSettled}>
                <ChevronRight size={14} style={{ transform: showSettled ? 'rotate(90deg)' : 'none', transition: 'transform var(--dur-fast)' }} />
                {showSettled ? 'Hide settled' : `Show settled (${settledLoans.length})`}
              </button>
            ) : <span />}
            <button onClick={onAdd} style={{ ...linkBtn, fontWeight: 600, color: 'var(--clay)' }}>
              <Plus size={13} /> Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)', marginBottom: 10 }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </section>
  );
}

function SettleSummary({ friend }: { friend: Friend }) {
  const { name, net, lentOpen, borrowedOpen } = friend;
  const row = (label: string, value: string, strong = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', fontSize: 13.5,
      color: strong ? 'var(--ink-strong)' : 'var(--ink-muted)', fontWeight: strong ? 600 : 400 }}>
      <span>{label}</span><span style={{ ...mono, fontWeight: 500 }}>{value}</span>
    </div>
  );
  return (
    <div>
      {row('You owe', formatCurrency(borrowedOpen))}
      {row(`${name} owes you`, formatCurrency(lentOpen))}
      <div style={{ borderTop: '1px solid var(--line)', marginTop: 4 }} />
      {row('After', isZero(net) ? 'Even' : formatSigned(net), true)}
      <p style={{ marginTop: 10, color: 'var(--ink-faint)' }}>No money moves. You can undo it later.</p>
    </div>
  );
}

/** ", 2 paybacks and your $50 Food expense": what goes along with a loan. */
function describeLoanDelete(loan: Loan, paybacks: number, settled: boolean): string {
  const parts: string[] = [];
  if (paybacks > 0) parts.push(`${paybacks} payback${paybacks === 1 ? '' : 's'}`);
  if (loan.transaction_id && loan.expense_amount) parts.push(`your ${formatCurrency(loan.expense_amount)} ${loan.category_name ? `${loan.category_name} ` : ''}expense`);
  if (settled) parts.push('its settle with your other loans');
  if (parts.length === 0) return '';
  return `, ${parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`}`;
}

export function Loans() {
  const { loans: allLoans, fetchLoans, fetchAccounts, fetchDashboard, bumpData, showToast, pendingDeletes, deleteWithUndo } = useAppStore();
  const loans = allLoans.filter(l => !pendingDeletes.has(l.id));
  // undefined: closed; '' : open with no friend picked yet.
  const [addPerson, setAddPerson] = useState<string | undefined>();
  const [editLoan, setEditLoan] = useState<Loan | undefined>();
  const [returnLoan, setReturnLoan] = useState<Loan | undefined>();
  const [confirmLoan, setConfirmLoan] = useState<{ loan: Loan; paybacks: number; settled: boolean } | undefined>();
  const [undoSettle, setUndoSettle] = useState<{ row: LoanRepayment; amount: number } | undefined>();
  const [settleKey, setSettleKey] = useState<string | undefined>();
  const [showSettled, setShowSettled] = useState(false);
  useAddRequest('loans', () => setAddPerson(''));

  useEffect(() => { fetchLoans(); }, []);

  // Loans move money, so balances need a refresh too; shared bills also add an
  // expense, so open lists reload.
  const refresh = () => { fetchLoans(); fetchAccounts(); fetchDashboard(); bumpData(); };

  const deleteLoanNow = async (l: Loan) => {
    try {
      await api.loans.delete(l.id);
      showToast('Loan deleted');
      refresh();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
  };

  // A plain loan goes with an Undo toast. One that takes paybacks, a settle or a
  // shared-bill expense with it asks first, and says what goes.
  const handleDeleteLoan = (l: Loan, returns: LoanRepayment[]) => {
    if (l.returned > 0.000001 || returns.length > 0 || l.transaction_id) {
      setConfirmLoan({ loan: l, paybacks: returns.filter(r => !r.offset_id).length, settled: returns.some(r => !!r.offset_id) });
      return;
    }
    deleteWithUndo({ id: l.id, label: 'Loan', commit: async () => { await api.loans.delete(l.id); refresh(); } });
  };

  const handleDeleteReturn = (r: LoanRepayment, all: LoanRepayment[]) => {
    if (r.offset_id) {
      // A settle closes the same amount on both sides, so the lent side alone is the amount.
      const amount = all
        .filter(x => x.offset_id === r.offset_id && allLoans.find(l => l.id === x.loan_id)?.direction === 'lent')
        .reduce((s, x) => s + x.amount, 0);
      setUndoSettle({ row: r, amount });
      return;
    }
    deleteWithUndo({ id: r.id, label: 'Payback', commit: async () => { await api.loans.deleteRepayment(r.id); refresh(); } });
  };

  const undoSettleNow = async () => {
    if (!undoSettle) return;
    try {
      await api.loans.deleteRepayment(undoSettle.row.id);
      refresh();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
  };

  const byAmount = (a: Friend, b: Friend) => Math.abs(b.net) - Math.abs(a.net) || a.name.localeCompare(b.name);
  const friends = groupByFriend(loans);
  const settleFriend = friends.find(f => f.key === settleKey);

  const handleSettle = async () => {
    if (!settleFriend) return;
    try {
      const amount = await api.loans.offset(settleFriend.loans.map(l => l.id), todayISO());
      showToast(`Settled ${formatCurrency(amount)}`);
      refresh();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
  };

  const oweYou = friends.filter(f => !isZero(f.net) && f.net > 0).sort(byAmount);
  const youOwe = friends.filter(f => !isZero(f.net) && f.net < 0).sort(byAmount);
  // Open both ways for the same amount: nothing is owed, but the loans are still open.
  const even = friends.filter(f => isZero(f.net) && f.openCount > 0).sort(byAmount);
  const settled = friends.filter(f => isZero(f.net) && f.openCount === 0).sort(byAmount);
  const oweYouTotal = oweYou.reduce((s, f) => s + f.net, 0);
  const youOweTotal = youOwe.reduce((s, f) => s - f.net, 0);

  const card = (f: Friend) => (
    <FriendCard key={f.key} friend={f}
      onEdit={setEditLoan}
      onDelete={handleDeleteLoan}
      onReturn={setReturnLoan}
      onDeleteReturn={handleDeleteReturn}
      onAdd={() => setAddPerson(f.name)}
      onSettle={() => setSettleKey(f.key)}
    />
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Loans"
        actions={
          <button onClick={() => setAddPerson('')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Add
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: 'calc(32px * var(--v-rhythm)) var(--content-h-pad) 56px' }}>
          {loans.length === 0 ? (
            <EmptyState
              icon={<HandCoins size={22} />}
              title="No loans"
              description="Money between you and friends, including bills one of you paid."
              action={<button onClick={() => setAddPerson('')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Add</button>}
            />
          ) : (
            <>
              <SummaryBar items={[
                { label: 'Owe you', value: oweYouTotal, tone: 'positive', sign: true },
                { label: 'You owe', value: -youOweTotal, sign: true },
              ]} />
              {oweYou.length > 0 && <Section title="Owe you">{oweYou.map(card)}</Section>}
              {youOwe.length > 0 && <Section title="You owe">{youOwe.map(card)}</Section>}
              {even.length > 0 && <Section title="Even">{even.map(card)}</Section>}
              {settled.length > 0 && (
                <section>
                  <button onClick={() => setShowSettled(s => !s)} aria-expanded={showSettled}
                    style={{ ...linkBtn, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                    <ChevronRight size={14} style={{ transform: showSettled ? 'rotate(90deg)' : 'none', transition: 'transform var(--dur-fast)' }} />
                    Settled ({settled.length})
                  </button>
                  {showSettled && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{settled.map(card)}</div>}
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {addPerson !== undefined && (
        <AddFriendForm key={addPerson} defaultPerson={addPerson || undefined} onSaved={refresh} onClose={() => setAddPerson(undefined)} />
      )}

      {editLoan && <LoanForm key={editLoan.id} loan={editLoan} onSaved={refresh} onClose={() => setEditLoan(undefined)} />}

      {returnLoan && <ReturnForm key={returnLoan.id} loan={returnLoan} onSaved={refresh} onClose={() => setReturnLoan(undefined)} />}

      {settleFriend && (
        <ConfirmDialog title={`Settle both ways with ${settleFriend.name}`} danger={false}
          confirmLabel={`Settle ${formatCurrency(settleFriend.cancellable)}`}
          onConfirm={handleSettle} onClose={() => setSettleKey(undefined)}
          body={<SettleSummary friend={settleFriend} />} />
      )}

      {confirmLoan && (
        <ConfirmDialog title="Delete loan" onConfirm={() => deleteLoanNow(confirmLoan.loan)} onClose={() => setConfirmLoan(undefined)}
          body={<>Deletes this loan{describeLoanDelete(confirmLoan.loan, confirmLoan.paybacks, confirmLoan.settled)}. Every balance change goes back.</>} />
      )}

      {undoSettle && (
        <ConfirmDialog title="Undo settle" confirmLabel="Undo settle" danger={false}
          onConfirm={undoSettleNow} onClose={() => setUndoSettle(undefined)}
          body={`Reopens ${formatCurrency(undoSettle.amount)} on both sides. No money moves.`} />
      )}
    </div>
  );
}
