import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, GraduationCap, ChevronDown, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, formatDate, todayISO } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { MoneyInput } from '../ui/MoneyInput';
import { EmptyState } from '../ui/EmptyState';
import { PageHeader } from '../layout/PageHeader';
import type { TuitionFee, TuitionPayment } from '../../types';

const PAYMENT_METHODS = ['cash', 'bank transfer', 'credit card', 'debit card', 'mobile payment', 'check', 'other'];

function TuitionForm({ fee, onSave, onCancel }: { fee?: TuitionFee; onSave: () => void; onCancel: () => void }) {
  const { showToast } = useAppStore();
  const [name, setName] = useState(fee?.name ?? '');
  const [total, setTotal] = useState(fee?.total_amount?.toString() ?? '');
  const [dueDate, setDueDate] = useState(fee?.due_date ?? '');
  const [notes, setNotes] = useState(fee?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const amt = parseFloat(total);
    if (!name.trim()) return showToast('Enter a name, e.g. the academic year', 'error');
    if (!amt || amt <= 0) return showToast('Enter the total tuition fee', 'error');
    setSaving(true);
    try {
      const data = { name: name.trim(), total_amount: amt, due_date: dueDate || undefined, notes };
      if (fee) { await api.tuition.update({ ...data, id: fee.id }); showToast('Tuition updated'); }
      else { await api.tuition.create(data); showToast('Tuition added'); }
      onSave();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label mb-1.5 block">Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. 2026–2027 academic year, Fall semester…" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Total Fee</label>
          <MoneyInput value={total} onChange={e => setTotal(e.target.value)} />
        </div>
        <div>
          <label className="label mb-1.5 block">Due Date (optional)</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input" />
        </div>
      </div>
      <div>
        <label className="label mb-1.5 block">Notes</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="University, contract number…" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : fee ? 'Update Tuition' : 'Add Tuition'}
        </button>
      </div>
    </div>
  );
}

function PaymentForm({ fee, onSave, onCancel }: { fee: TuitionFee; onSave: () => void; onCancel: () => void }) {
  const { accounts, showToast } = useAppStore();
  const remaining = Math.max(0, fee.total_amount - fee.paid);
  const [amount, setAmount] = useState(remaining > 0 ? remaining.toString() : '');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState('bank transfer');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return showToast('Enter a valid amount', 'error');
    if (!accountId) return showToast('Select an account', 'error');
    setSaving(true);
    try {
      await api.tuition.pay({ tuition_id: fee.id, account_id: accountId, amount: amt, date, notes, payment_method: method });
      showToast('Payment recorded');
      onSave();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label mb-1.5 block">Amount</label>
        <MoneyInput value={amount} onChange={e => setAmount(e.target.value)} min="0" step="0.01" autoFocus />
        <p className="text-xs text-[hsl(var(--text-muted))] mt-1">{formatCurrency(remaining)} still to pay</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Paid From</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} className="input">
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label mb-1.5 block">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Payment Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)} className="input capitalize">
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label mb-1.5 block">Notes</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="e.g. 2nd installment" />
        </div>
      </div>
      <p className="text-xs text-[hsl(var(--text-muted))]">Saved as an Education expense, so it comes out of the account's balance.</p>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Record Payment'}
        </button>
      </div>
    </div>
  );
}

const iconBtn = { color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' } as const;

function TuitionCard({ fee, onEdit, onDelete, onPay, onDeletePayment }: {
  fee: TuitionFee;
  onEdit: () => void;
  onDelete: () => void;
  onPay: () => void;
  onDeletePayment: (p: TuitionPayment) => void;
}) {
  const [open, setOpen] = useState(false);
  const [payments, setPayments] = useState<TuitionPayment[]>([]);

  // Reload the history whenever the paid total changes (new or deleted payment).
  useEffect(() => {
    if (open) api.tuition.payments(fee.id).then(setPayments).catch(() => setPayments([]));
  }, [open, fee.paid, fee.id]);

  const pct = fee.total_amount > 0 ? Math.min(100, (fee.paid / fee.total_amount) * 100) : 0;
  const remaining = fee.total_amount - fee.paid;
  const done = remaining <= 0;
  const overdue = !done && !!fee.due_date && fee.due_date < todayISO();

  return (
    <div className="mm-card" style={{ padding: 24, cursor: 'default' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, color: 'var(--ink-strong)' }}>
            {fee.name}
          </h3>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: overdue ? 'var(--negative)' : 'var(--ink-faint)', marginTop: 3 }}>
            {fee.due_date ? `${overdue ? 'Overdue since' : 'Due'} ${formatDate(fee.due_date)}` : 'No due date'}
            {fee.notes && <span style={{ color: 'var(--ink-faint)' }}> · {fee.notes}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {done ? (
            <span style={{
              borderRadius: 999, padding: '3px 10px',
              background: 'var(--positive-tint)', color: 'var(--positive)',
              fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
            }}>✓ Paid in full</span>
          ) : (
            <button onClick={onPay} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 13 }}>
              <Plus size={13} /> Record payment
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

      {/* Paid vs. remaining */}
      <div style={{ display: 'flex', gap: 40, marginTop: 22, flexWrap: 'wrap' }}>
        <div>
          <div className="mm-eyebrow" style={{ marginBottom: 6 }}>Paid</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 500, color: 'var(--positive)' }}>
            {formatCurrency(fee.paid)}
          </div>
        </div>
        <div>
          <div className="mm-eyebrow" style={{ marginBottom: 6 }}>{remaining < 0 ? 'Overpaid' : 'Left to pay'}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 500, color: done ? 'var(--ink-faint)' : 'var(--ink-strong)' }}>
            {formatCurrency(Math.abs(remaining))}
          </div>
        </div>
        <div>
          <div className="mm-eyebrow" style={{ marginBottom: 6 }}>Total fee</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 500, color: 'var(--ink-muted)' }}>
            {formatCurrency(fee.total_amount)}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, height: 6, background: 'var(--paper-sunk)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: done ? 'var(--positive)' : 'var(--clay)', borderRadius: 999, transition: 'width 700ms' }} />
      </div>
      <div style={{ marginTop: 8, fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)' }}>
        {Math.round(pct)}% paid
      </div>

      {/* Payment history */}
      <button onClick={() => setOpen(o => !o)}
        style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink-muted)' }}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Payment history
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          {payments.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-faint)', padding: '6px 0' }}>No payments yet.</p>
          ) : payments.map(p => (
            <div key={p.id} className="group" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: '1px solid var(--line)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-muted)', width: 96, flexShrink: 0 }}>{formatDate(p.date)}</span>
              <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.account_name ?? ''}{p.notes ? ` · ${p.notes}` : ''}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>
                {formatCurrency(p.amount)}
              </span>
              <button onClick={() => onDeletePayment(p)} className="opacity-0 group-hover:opacity-100" style={iconBtn} title="Delete payment">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Tuition() {
  const { tuition, fetchTuition, fetchAccounts, fetchDashboard, showToast } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editFee, setEditFee] = useState<TuitionFee | undefined>();
  const [payFee, setPayFee] = useState<TuitionFee | undefined>();
  const [deleteFee, setDeleteFee] = useState<TuitionFee | undefined>();
  const [deletePayment, setDeletePayment] = useState<TuitionPayment | undefined>();

  useEffect(() => { fetchTuition(); }, []);

  // Payments move money, so balances and the dashboard need a refresh too.
  const refreshAfterPayment = () => { fetchTuition(); fetchAccounts(); fetchDashboard(); };

  const handleDeleteFee = async () => {
    if (!deleteFee) return;
    try {
      await api.tuition.delete(deleteFee.id);
      showToast('Tuition deleted');
      setDeleteFee(undefined);
      fetchTuition();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
  };

  const handleDeletePayment = async () => {
    if (!deletePayment) return;
    try {
      await api.transactions.delete(deletePayment.id);
      showToast('Payment deleted');
      setDeletePayment(undefined);
      refreshAfterPayment();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
  };

  const totalFee = tuition.reduce((s, f) => s + f.total_amount, 0);
  const totalPaid = tuition.reduce((s, f) => s + f.paid, 0);
  const totalLeft = tuition.reduce((s, f) => s + Math.max(0, f.total_amount - f.paid), 0);

  const lead = tuition.length > 0
    ? `${formatCurrency(totalPaid)} paid of ${formatCurrency(totalFee)} — ${formatCurrency(totalLeft)} still to go.`
    : undefined;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        eyebrow="Education"
        title="Tuition"
        lead={lead}
        actions={
          <button onClick={() => { setEditFee(undefined); setShowForm(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Add Tuition
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '32px 40px 56px' }}>
          {tuition.length === 0 ? (
            <EmptyState
              icon={<GraduationCap size={22} />}
              title="No tuition yet"
              description="Add your tuition fee to track how much you've paid and how much is left."
              action={<button onClick={() => setShowForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Add Tuition</button>}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {tuition.map(f => (
                <TuitionCard key={f.id} fee={f}
                  onEdit={() => { setEditFee(f); setShowForm(true); }}
                  onDelete={() => setDeleteFee(f)}
                  onPay={() => setPayFee(f)}
                  onDeletePayment={setDeletePayment}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditFee(undefined); }} title={editFee ? 'Edit Tuition' : 'Add Tuition'} size="sm">
        <TuitionForm
          fee={editFee}
          onSave={() => { setShowForm(false); setEditFee(undefined); fetchTuition(); }}
          onCancel={() => { setShowForm(false); setEditFee(undefined); }}
        />
      </Modal>

      <Modal open={!!payFee} onClose={() => setPayFee(undefined)} title={payFee ? `Pay · ${payFee.name}` : 'Record Payment'} size="sm">
        {payFee && (
          <PaymentForm
            fee={payFee}
            onSave={() => { setPayFee(undefined); refreshAfterPayment(); }}
            onCancel={() => setPayFee(undefined)}
          />
        )}
      </Modal>

      <Modal open={!!deleteFee} onClose={() => setDeleteFee(undefined)} title="Delete Tuition" size="sm"
        footer={<><button onClick={() => setDeleteFee(undefined)} className="btn-secondary">Cancel</button><button onClick={handleDeleteFee} className="btn-danger">Delete</button></>}
      >
        <p className="text-sm text-[hsl(var(--text-muted))]">
          Delete "{deleteFee?.name}"? Its payments stay in your transactions as Education expenses, so your balances won't change.
        </p>
      </Modal>

      <Modal open={!!deletePayment} onClose={() => setDeletePayment(undefined)} title="Delete Payment" size="sm"
        footer={<><button onClick={() => setDeletePayment(undefined)} className="btn-secondary">Cancel</button><button onClick={handleDeletePayment} className="btn-danger">Delete</button></>}
      >
        <p className="text-sm text-[hsl(var(--text-muted))]">
          Delete this {deletePayment ? formatCurrency(deletePayment.amount) : ''} payment? The amount goes back to the account it was paid from.
        </p>
      </Modal>
    </div>
  );
}
