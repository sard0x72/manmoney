import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, GraduationCap, ChevronRight, Check, CornerDownRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, formatDate, todayISO } from '../../lib/utils';
import { useAddRequest } from '../../lib/useAddRequest';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { RowMenu } from '../ui/RowMenu';
import { FormSheet, useDirty } from '../ui/FormSheet';
import { MoneyInput } from '../ui/MoneyInput';
import { EmptyState } from '../ui/EmptyState';
import { MoreOptions } from '../ui/MoreOptions';
import { SummaryBar } from '../ui/SummaryBar';
import { Pill } from '../ui/Pill';
import { PageHeader } from '../layout/PageHeader';
import { PAYMENT_METHODS, methodLabel } from '../forms/TransactionForm';
import type { TuitionFee, TuitionPayment } from '../../types';

const faint = { fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)' } as const;

function TuitionForm({ fee, onSaved, onClose }: { fee?: TuitionFee; onSaved: () => void; onClose: () => void }) {
  const { showToast } = useAppStore();
  const [name, setName] = useState(fee?.name ?? '');
  const [total, setTotal] = useState(fee?.total_amount?.toString() ?? '');
  const [dueDate, setDueDate] = useState(fee?.due_date ?? '');
  const [notes, setNotes] = useState(fee?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const dirty = useDirty({ name, total, dueDate, notes });

  const handleSave = async () => {
    const amt = parseFloat(total);
    if (!name.trim()) return showToast('Enter a name', 'error');
    if (!amt || amt <= 0) return showToast('Enter the total', 'error');
    setSaving(true);
    try {
      const data = { name: name.trim(), total_amount: amt, due_date: dueDate || undefined, notes };
      if (fee) await api.tuition.update({ ...data, id: fee.id });
      else await api.tuition.create(data);
      showToast('Saved');
      onSaved();
      onClose();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <FormSheet title={fee ? 'Edit tuition' : 'Add tuition'} onClose={onClose} onSubmit={handleSave} dirty={dirty} saving={saving}>
      <div>
        <label className="label mb-1.5 block">Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="2026–2027 academic year, Fall semester" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Total</label>
          <MoneyInput value={total} onChange={e => setTotal(e.target.value)} min="0" step="0.01" />
        </div>
        <div>
          <label className="label mb-1.5 block">Due date</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input" />
        </div>
      </div>
      <div>
        <label className="label mb-1.5 block">Note</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="University, contract number" />
      </div>
    </FormSheet>
  );
}

function PaymentForm({ fee, onSaved, onClose }: { fee: TuitionFee; onSaved: () => void; onClose: () => void }) {
  const { accounts, showToast } = useAppStore();
  const remaining = Math.max(0, fee.total_amount - fee.paid);
  const [amount, setAmount] = useState(remaining > 0 ? remaining.toString() : '');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState('bank transfer');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const dirty = useDirty({ amount, accountId, date, method, notes });

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return showToast('Enter an amount', 'error');
    if (!accountId) return showToast('Pick an account', 'error');
    setSaving(true);
    try {
      await api.tuition.pay({ tuition_id: fee.id, account_id: accountId, amount: amt, date, notes, payment_method: method });
      showToast('Saved');
      onSaved();
      onClose();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <FormSheet title={`Pay ${fee.name}`} onClose={onClose} onSubmit={handleSave} dirty={dirty} saving={saving}>
      <div>
        <label className="label mb-1.5 block">Amount</label>
        <MoneyInput value={amount} onChange={e => setAmount(e.target.value)} min="0" step="0.01" autoFocus />
        <p style={{ ...faint, marginTop: 6 }}>Counts as an Education expense</p>
      </div>
      <div>
        <label className="label mb-1.5 block">From</label>
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
            <label className="label mb-1.5 block">Payment method</label>
            <select value={method} onChange={e => setMethod(e.target.value)} className="input">
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{methodLabel(m)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label mb-1.5 block">Note</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="2nd installment" />
        </div>
      </MoreOptions>
    </FormSheet>
  );
}

function TuitionCard({ fee, onEdit, onDelete, onPay, onDeletePayment }: {
  fee: TuitionFee;
  onEdit: () => void;
  onDelete: () => void;
  onPay: () => void;
  onDeletePayment: (p: TuitionPayment) => void;
}) {
  const [open, setOpen] = useState(false);
  const [payments, setPayments] = useState<TuitionPayment[]>([]);
  const pendingDeletes = useAppStore(s => s.pendingDeletes);

  // Reload the history whenever the paid total changes (new or deleted payment).
  useEffect(() => {
    if (open) api.tuition.payments(fee.id).then(setPayments).catch(() => setPayments([]));
  }, [open, fee.paid, fee.id]);

  const pct = fee.total_amount > 0 ? Math.min(100, (fee.paid / fee.total_amount) * 100) : 0;
  const remaining = fee.total_amount - fee.paid;
  const done = remaining <= 0.000001;
  const overdue = !done && !!fee.due_date && fee.due_date < todayISO();
  const shown = payments.filter(p => !pendingDeletes.has(p.id));

  return (
    <div className="mm-card group" style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, color: 'var(--ink-strong)' }}>{fee.name}</h3>
          {done ? (
            <div style={{ marginTop: 4 }}><Pill tone="positive" icon={<Check size={11} />}>Paid</Pill></div>
          ) : fee.due_date && (
            <div style={{ ...faint, marginTop: 3, color: overdue ? 'var(--negative)' : 'var(--ink-faint)' }}>
              {overdue ? 'Overdue since' : 'Due'} {formatDate(fee.due_date)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {!done && (
            <button onClick={onPay} className="btn-primary" style={{ padding: '6px 14px', fontSize: 13 }}>Pay</button>
          )}
          <RowMenu items={[
            { label: 'Edit', icon: <Pencil size={13} />, onSelect: onEdit },
            { label: 'Delete', icon: <Trash2 size={13} />, onSelect: onDelete, danger: true },
          ]} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 18 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 20, fontWeight: 500, color: 'var(--ink-strong)' }}>
          {formatCurrency(fee.paid)}
        </span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-faint)' }}>paid of {formatCurrency(fee.total_amount)}</span>
      </div>
      <div style={{ marginTop: 10, height: 6, background: 'var(--paper-sunk)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: done ? 'var(--positive)' : 'var(--clay)', borderRadius: 999, transition: 'width 700ms' }} />
      </div>
      {!done && <div style={{ ...faint, marginTop: 6 }}>{formatCurrency(remaining)} left</div>}

      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink-muted)' }}>
        <ChevronRight size={14} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform var(--dur-fast)' }} /> Payments
      </button>
      {open && (
        <div style={{ marginTop: 6 }}>
          {shown.length === 0 ? (
            <p style={{ ...faint, padding: '6px 0 0 18px' }}>No payments yet</p>
          ) : shown.map(p => (
            <div key={p.id} className="group" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0 6px 4px' }}>
              <CornerDownRight size={13} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, ...faint, fontSize: 13, color: 'var(--ink-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Paid {formatCurrency(p.amount)}
                <span style={{ color: 'var(--ink-faint)' }}> · {formatDate(p.date)}{p.account_name ? ` · ${p.account_name}` : ''}{p.notes ? ` · ${p.notes}` : ''}</span>
              </span>
              <RowMenu items={[{ label: 'Delete', icon: <Trash2 size={13} />, onSelect: () => onDeletePayment(p), danger: true }]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Tuition() {
  const { tuition, fetchTuition, fetchAccounts, fetchDashboard, showToast, deleteWithUndo } = useAppStore();
  const [form, setForm] = useState<{ fee?: TuitionFee } | null>(null);
  const [payFee, setPayFee] = useState<TuitionFee | undefined>();
  const [deleteFee, setDeleteFee] = useState<TuitionFee | undefined>();
  useAddRequest('tuition', () => setForm({}));

  useEffect(() => { fetchTuition(); }, []);

  // Payments move money, so balances and the dashboard need a refresh too.
  const refreshAfterPayment = () => { fetchTuition(); fetchAccounts(); fetchDashboard(); };

  const handleDeleteFee = async () => {
    if (!deleteFee) return;
    try {
      await api.tuition.delete(deleteFee.id);
      showToast('Tuition deleted');
      fetchTuition();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
  };

  // A payment is an ordinary expense, so deleting it can wait for the Undo window.
  const handleDeletePayment = (p: TuitionPayment) => deleteWithUndo({
    id: p.id, label: 'Payment',
    commit: async () => { await api.transactions.delete(p.id); refreshAfterPayment(); },
  });

  const total = tuition.reduce((s, f) => s + f.total_amount, 0);
  const paid = tuition.reduce((s, f) => s + f.paid, 0);
  const left = tuition.reduce((s, f) => s + Math.max(0, f.total_amount - f.paid), 0);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Tuition"
        actions={
          <button onClick={() => setForm({})} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Add tuition
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: 'calc(32px * var(--v-rhythm)) var(--content-h-pad) 56px' }}>
          {tuition.length === 0 ? (
            <EmptyState
              icon={<GraduationCap size={22} />}
              title="No tuition yet"
              description="Track what you've paid and what's left."
              action={<button onClick={() => setForm({})} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Add tuition</button>}
            />
          ) : (
            <>
              <SummaryBar items={[{ label: 'Paid', value: paid }, { label: 'Left', value: left }, { label: 'Total', value: total }]} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {tuition.map(f => (
                  <TuitionCard key={f.id} fee={f}
                    onEdit={() => setForm({ fee: f })}
                    onDelete={() => setDeleteFee(f)}
                    onPay={() => setPayFee(f)}
                    onDeletePayment={handleDeletePayment}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {form && <TuitionForm key={form.fee?.id ?? 'new'} fee={form.fee} onSaved={fetchTuition} onClose={() => setForm(null)} />}

      {payFee && <PaymentForm key={payFee.id} fee={payFee} onSaved={refreshAfterPayment} onClose={() => setPayFee(undefined)} />}

      {deleteFee && (
        <ConfirmDialog title="Delete tuition" onConfirm={handleDeleteFee} onClose={() => setDeleteFee(undefined)}
          body={<>Deletes {deleteFee.name}. Its payments stay in your transactions as Education expenses, so your balances don't change.</>} />
      )}
    </div>
  );
}
