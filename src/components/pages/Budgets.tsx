import { useEffect, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2, Wallet } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, monthName } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { CategoryIcon } from '../ui/CategoryIcon';
import { PageHeader } from '../layout/PageHeader';

function BudgetForm({ onSave, onCancel, year, month }: { onSave: () => void; onCancel: () => void; year: number; month: number }) {
  const { categories, showToast } = useAppStore();
  const expenseCats = categories.filter(c => c.category_type === 'expense');
  const [categoryId, setCategoryId] = useState(expenseCats[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return showToast('Enter a valid amount', 'error');
    if (!categoryId) return showToast('Select a category', 'error');
    setSaving(true);
    try {
      await api.budgets.upsert({ category_id: categoryId, amount: amt, year, month });
      showToast('Budget saved');
      onSave();
    } catch (e: any) {
      showToast(e?.toString() ?? 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label mb-1.5 block">Category</label>
        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="input">
          {expenseCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label mb-1.5 block">Budget Amount</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] text-sm">$</span>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input pl-7" placeholder="0.00" autoFocus />
        </div>
      </div>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)' }}>
        Setting a budget for {monthName(month)} {year}. Existing budgets for this category will be updated.
      </p>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save Budget'}
        </button>
      </div>
    </div>
  );
}

export function Budgets() {
  const { budgets, budgetYear, budgetMonth, setBudgetPeriod, fetchBudgets, showToast } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { fetchBudgets(); }, []);

  const prevMonth = () => {
    if (budgetMonth === 1) setBudgetPeriod(budgetYear - 1, 12);
    else setBudgetPeriod(budgetYear, budgetMonth - 1);
  };
  const nextMonth = () => {
    if (budgetMonth === 12) setBudgetPeriod(budgetYear + 1, 1);
    else setBudgetPeriod(budgetYear, budgetMonth + 1);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.budgets.delete(deleteId);
      showToast('Budget removed');
      setDeleteId(null);
      fetchBudgets();
    } catch (e: any) {
      showToast(e?.toString() ?? 'Error', 'error');
    }
  };

  const totalLimit = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spent ?? 0), 0);
  const left = totalLimit - totalSpent;

  const monthActions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={prevMonth} className="btn-ghost" style={{ padding: '6px 8px' }}><ChevronLeft size={16} /></button>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink)', minWidth: 100, textAlign: 'center' }}>
          {monthName(budgetMonth)} {budgetYear}
        </span>
        <button onClick={nextMonth} className="btn-ghost" style={{ padding: '6px 8px' }}><ChevronRight size={16} /></button>
      </div>
      <button onClick={() => setShowForm(true)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Plus size={15} /> New Budget
      </button>
    </div>
  );

  const lead = budgets.length > 0
    ? `${formatCurrency(totalSpent)} spent of ${formatCurrency(totalLimit)}. ${formatCurrency(Math.abs(left))} ${left >= 0 ? 'still to spend' : 'over plan'}.`
    : undefined;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        eyebrow={`${monthName(budgetMonth)} envelopes`}
        title="Budgets"
        lead={lead}
        actions={monthActions}
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 40px 56px' }}>
          {budgets.length === 0 ? (
            <EmptyState
              icon={<Wallet size={22} />}
              title="No budgets set"
              description="Set monthly budgets to track your spending limits."
              action={<button onClick={() => setShowForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Add Budget</button>}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
              {budgets.map(b => {
                const pct = b.amount > 0 ? Math.min(100, ((b.spent ?? 0) / b.amount) * 100) : 0;
                const over = (b.spent ?? 0) > b.amount;
                const remaining = b.amount - (b.spent ?? 0);
                const barColor = over ? 'var(--negative)' : (b.category_color ?? 'var(--clay)');
                return (
                  <div key={b.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: `${over ? 'var(--negative)' : (b.category_color ?? 'var(--clay)')}20`,
                        color: over ? 'var(--negative)' : (b.category_color ?? 'var(--clay)'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <CategoryIcon icon={b.category_icon ?? 'tag'} size={16} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
                          {b.category_name}
                        </div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: over ? 'var(--negative)' : 'var(--ink-faint)' }}>
                          {over
                            ? `${formatCurrency(-remaining)} over budget`
                            : `${formatCurrency(remaining)} left`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                            {formatCurrency(b.spent ?? 0)}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-faint)' }}>
                            {' '}/ {formatCurrency(b.amount)}
                          </span>
                        </div>
                        <button
                          onClick={() => setDeleteId(b.id)}
                          style={{ color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--negative)'; (e.currentTarget as HTMLElement).style.background = 'var(--negative-tint)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-faint)'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div style={{ height: 8, background: 'var(--paper-sunk)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: barColor,
                        borderRadius: 999,
                        transition: 'width 500ms',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Set Budget" size="sm">
        <BudgetForm year={budgetYear} month={budgetMonth} onSave={() => { setShowForm(false); fetchBudgets(); }} onCancel={() => setShowForm(false)} />
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Remove Budget" size="sm"
        footer={<><button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button><button onClick={handleDelete} className="btn-danger">Remove</button></>}
      >
        <p className="text-sm text-[hsl(var(--text-muted))]">Remove this budget limit? Spending data is not affected.</p>
      </Modal>
    </div>
  );
}
