import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, HandCoins, ChevronDown, ChevronRight } from 'lucide-react';
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

function LoanForm({ loan, onSave, onCancel }: { loan?: Loan; onSave: () => void; onCancel: () => void }) {
  const { accounts, showToast } = useAppStore();
  const [direction, setDirection] = useState<Direction>(loan?.direction ?? 'borrowed');
  const [person, setPerson] = useState(loan?.person ?? '');
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
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--paper-sunk)', borderRadius: 'var(--radius)', opacity: loan ? 0.6 : 1 }}>
        {([['borrowed', 'I borrowed'], ['lent', 'I lent']] as const).map(([d, label]) => (
          <button key={d} onClick={() => !loan && setDirection(d)} disabled={!!loan} style={{
            flex: 1, padding: '7px 0', borderRadius: 'var(--radius-sm)', border: 'none', cursor: loan ? 'default' : 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
            background: direction === d ? 'var(--surface)' : 'transparent',
            color: direction === d ? 'var(--ink)' : 'var(--ink-faint)',
            boxShadow: direction === d ? 'var(--shadow-sm)' : 'none',
          }}>{label}</button>
        ))}
      </div>
      <div>
        <label className="label mb-1.5 block">{direction === 'borrowed' ? 'Borrowed from' : 'Lent to'}</label>
        <input type="text" value={person} onChange={e => setPerson(e.target.value)} className="input" placeholder="Friend's name" autoFocus />
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
        {direction === 'borrowed'
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

function LoanCard({ loan, onEdit, onDelete, onReturn, onDeleteReturn }: {
  loan: Loan;
  onEdit: () => void;
  onDelete: () => void;
  onReturn: () => void;
  onDeleteReturn: (r: LoanRepayment) => void;
}) {
  const [open, setOpen] = useState(false);
  const [returns, setReturns] = useState<LoanRepayment[]>([]);

  useEffect(() => {
    if (open) api.loans.repayments(loan.id).then(setReturns).catch(() => setReturns([]));
  }, [open, loan.returned, loan.id]);

  const borrowed = loan.direction === 'borrowed';
  const remaining = left(loan);
  const settled = isSettled(loan);
  const pct = loan.amount > 0 ? Math.min(100, (loan.returned / loan.amount) * 100) : 0;
  const overdue = !settled && !!loan.due_date && loan.due_date < todayISO();

  return (
    <div className="mm-card" style={{ padding: '18px 22px', cursor: 'default', opacity: settled ? 0.75 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, color: 'var(--ink-strong)' }}>{loan.person}</h3>
            <span style={{
              borderRadius: 999, padding: '2px 8px', fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600,
              background: borrowed ? 'var(--negative-tint)' : 'var(--positive-tint)',
              color: borrowed ? 'var(--negative)' : 'var(--positive)',
            }}>{borrowed ? 'You owe' : 'Owes you'}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 3 }}>
            {borrowed ? 'Borrowed' : 'Lent'} {formatDate(loan.date)}{loan.account_name ? ` · ${loan.account_name}` : ''}
            {loan.due_date && !settled && (
              <span style={{ color: overdue ? 'var(--negative)' : 'var(--ink-faint)' }}>
                {' · '}{overdue ? 'Overdue since' : 'Return by'} {formatDate(loan.due_date)}
              </span>
            )}
            {loan.notes && <> · {loan.notes}</>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {settled ? (
            <span style={{
              borderRadius: 999, padding: '3px 10px', background: 'var(--positive-tint)', color: 'var(--positive)',
              fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
            }}>✓ Settled</span>
          ) : (
            <button onClick={onReturn} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 13 }}>
              <Plus size={13} /> {borrowed ? 'Record payback' : 'Record return'}
            </button>
          )}
          <button onClick={onEdit} style={iconBtn}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--paper-sunk)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}>
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} style={iconBtn}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--negative)'; (e.currentTarget as HTMLElement).style.background = 'var(--negative-tint)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-faint)'; (e.currentTarget as HTMLElement).style.background = 'none'; }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 36, marginTop: 16, flexWrap: 'wrap' }}>
        {[
          { label: borrowed ? 'Borrowed' : 'Lent', value: loan.amount, color: 'var(--ink-muted)' },
          { label: borrowed ? 'Paid back' : 'Returned', value: loan.returned, color: 'var(--positive)' },
          { label: remaining < 0 ? 'Overpaid' : 'Still open', value: Math.abs(remaining), color: settled ? 'var(--ink-faint)' : 'var(--ink-strong)' },
        ].map(s => (
          <div key={s.label}>
            <div className="mm-eyebrow" style={{ marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 18, fontWeight: 500, color: s.color }}>
              {formatCurrency(s.value)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, height: 5, background: 'var(--paper-sunk)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: settled ? 'var(--positive)' : 'var(--clay)', borderRadius: 999, transition: 'width 700ms' }} />
      </div>

      <button onClick={() => setOpen(o => !o)}
        style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink-muted)' }}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {borrowed ? 'Paybacks' : 'Returns'}
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          {returns.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-faint)', padding: '6px 0' }}>Nothing returned yet.</p>
          ) : returns.map(r => (
            <div key={r.id} className="group" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: '1px solid var(--line)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-muted)', width: 96, flexShrink: 0 }}>{formatDate(r.date)}</span>
              <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.account_name ?? ''}{r.notes ? ` · ${r.notes}` : ''}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>
                {formatCurrency(r.amount)}
              </span>
              <button onClick={() => onDeleteReturn(r)} className="opacity-0 group-hover:opacity-100" style={iconBtn} title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
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
          <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 13, color: 'var(--ink-muted)' }}>{formatCurrency(total)}</span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </section>
  );
}

export function Loans() {
  const { loans, fetchLoans, fetchAccounts, fetchDashboard, showToast } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editLoan, setEditLoan] = useState<Loan | undefined>();
  const [returnLoan, setReturnLoan] = useState<Loan | undefined>();
  const [deleteLoan, setDeleteLoan] = useState<Loan | undefined>();
  const [deleteReturn, setDeleteReturn] = useState<LoanRepayment | undefined>();
  const [showSettled, setShowSettled] = useState(false);

  useEffect(() => { fetchLoans(); }, []);

  // Loans move money between you and friends, so balances need a refresh too.
  const refresh = () => { fetchLoans(); fetchAccounts(); fetchDashboard(); };

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
      showToast('Deleted');
      setDeleteReturn(undefined);
      refresh();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
  };

  const open = loans.filter(l => !isSettled(l));
  const settled = loans.filter(isSettled);
  const youOwe = open.filter(l => l.direction === 'borrowed');
  const owedToYou = open.filter(l => l.direction === 'lent');
  const youOweTotal = youOwe.reduce((s, l) => s + left(l), 0);
  const owedToYouTotal = owedToYou.reduce((s, l) => s + left(l), 0);

  const lead = loans.length > 0
    ? `Friends owe you ${formatCurrency(owedToYouTotal)} · you owe ${formatCurrency(youOweTotal)}.`
    : undefined;

  const card = (l: Loan) => (
    <LoanCard key={l.id} loan={l}
      onEdit={() => { setEditLoan(l); setShowForm(true); }}
      onDelete={() => setDeleteLoan(l)}
      onReturn={() => setReturnLoan(l)}
      onDeleteReturn={setDeleteReturn}
    />
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        eyebrow="Between friends"
        title="Loans"
        lead={lead}
        actions={
          <button onClick={() => { setEditLoan(undefined); setShowForm(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> New Loan
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '32px 40px 56px' }}>
          {loans.length === 0 ? (
            <EmptyState
              icon={<HandCoins size={22} />}
              title="No loans"
              description="Record money you borrow from or lend to friends, and track it until it's paid back."
              action={<button onClick={() => setShowForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> New Loan</button>}
            />
          ) : (
            <>
              {youOwe.length > 0 && <Section title="You owe" total={youOweTotal}>{youOwe.map(card)}</Section>}
              {owedToYou.length > 0 && <Section title="Owed to you" total={owedToYouTotal}>{owedToYou.map(card)}</Section>}
              {open.length === 0 && (
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
                  {showSettled && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{settled.map(card)}</div>}
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditLoan(undefined); }} title={editLoan ? 'Edit Loan' : 'New Loan'} size="sm">
        <LoanForm
          loan={editLoan}
          onSave={() => { setShowForm(false); setEditLoan(undefined); refresh(); }}
          onCancel={() => { setShowForm(false); setEditLoan(undefined); }}
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

      <Modal open={!!deleteLoan} onClose={() => setDeleteLoan(undefined)} title="Delete Loan" size="sm"
        footer={<><button onClick={() => setDeleteLoan(undefined)} className="btn-secondary">Cancel</button><button onClick={handleDeleteLoan} className="btn-danger">Delete</button></>}
      >
        <p className="text-sm text-[hsl(var(--text-muted))]">
          Delete this loan with {deleteLoan?.person}? Every balance change it made, including its returns, will be undone.
        </p>
      </Modal>

      <Modal open={!!deleteReturn} onClose={() => setDeleteReturn(undefined)} title="Delete Return" size="sm"
        footer={<><button onClick={() => setDeleteReturn(undefined)} className="btn-secondary">Cancel</button><button onClick={handleDeleteReturn} className="btn-danger">Delete</button></>}
      >
        <p className="text-sm text-[hsl(var(--text-muted))]">
          Delete this {deleteReturn ? formatCurrency(deleteReturn.amount) : ''} return? Its account balance change will be undone.
        </p>
      </Modal>
    </div>
  );
}
