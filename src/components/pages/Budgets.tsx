import { useEffect, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2, Wallet, Pencil } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, monthName } from '../../lib/utils';
import { useAddRequest } from '../../lib/useAddRequest';
import { FormSheet, useDirty } from '../ui/FormSheet';
import { MoneyInput } from '../ui/MoneyInput';
import { EmptyState } from '../ui/EmptyState';
import { CategoryIcon } from '../ui/CategoryIcon';
import { RowMenu } from '../ui/RowMenu';
import { PageHeader } from '../layout/PageHeader';
import type { Budget } from '../../types';

/** Adds a budget, or edits one (`budget`): the category is then fixed and only the amount changes. */
function BudgetForm({ budget, taken, onSaved, onClose, year, month }: {
  budget?: Budget;
  /** Categories that already have a budget this month, left out when adding. */
  taken: string[];
  onSaved: () => void; onClose: () => void; year: number; month: number;
}) {
  const { categories, showToast } = useAppStore();
  const expenseCats = categories.filter(c => c.category_type === 'expense' && (budget ? c.id === budget.category_id : !taken.includes(c.id)));
  const [categoryId, setCategoryId] = useState(budget?.category_id ?? expenseCats[0]?.id ?? '');
  const [amount, setAmount] = useState(budget?.amount.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const dirty = useDirty({ categoryId, amount });

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!categoryId) return showToast('Pick a category', 'error');
    if (!amt || amt <= 0) return showToast('Enter an amount', 'error');
    setSaving(true);
    try {
      await api.budgets.upsert({ category_id: categoryId, amount: amt, year, month });
      showToast('Saved');
      onSaved();
      onClose();
    } catch (e: any) {
      showToast(e?.toString() ?? 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSheet title={budget ? 'Edit budget' : 'Add budget'} onClose={onClose} onSubmit={handleSave} dirty={dirty} saving={saving}>
      <div>
        <label className="label mb-1.5 block">Category</label>
        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="input" disabled={!!budget}>
          {expenseCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label mb-1.5 block">Amount</label>
        <MoneyInput value={amount} onChange={e => setAmount(e.target.value)} min="0" step="0.01" autoFocus />
      </div>
    </FormSheet>
  );
}

export function Budgets() {
  const { budgets: all, budgetYear, budgetMonth, setBudgetPeriod, fetchBudgets, pendingDeletes, deleteWithUndo } = useAppStore();
  const budgets = all.filter(b => !pendingDeletes.has(b.id));
  const [form, setForm] = useState<{ budget?: Budget } | null>(null);
  useAddRequest('budgets', () => setForm({}));

  useEffect(() => { fetchBudgets(); }, []);

  const prevMonth = () => {
    if (budgetMonth === 1) setBudgetPeriod(budgetYear - 1, 12);
    else setBudgetPeriod(budgetYear, budgetMonth - 1);
  };
  const nextMonth = () => {
    if (budgetMonth === 12) setBudgetPeriod(budgetYear + 1, 1);
    else setBudgetPeriod(budgetYear, budgetMonth + 1);
  };

  const handleDelete = (b: Budget) => deleteWithUndo({
    id: b.id, label: 'Budget',
    commit: async () => { await api.budgets.delete(b.id); await fetchBudgets(); },
  });

  const totalLimit = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spent ?? 0), 0);
  const left = totalLimit - totalSpent;

  const monthActions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={prevMonth} className="btn-ghost" style={{ padding: '6px 8px' }} aria-label="Previous month"><ChevronLeft size={16} /></button>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink)', minWidth: 100, textAlign: 'center' }}>
          {monthName(budgetMonth)} {budgetYear}
        </span>
        <button onClick={nextMonth} className="btn-ghost" style={{ padding: '6px 8px' }} aria-label="Next month"><ChevronRight size={16} /></button>
      </div>
      <button onClick={() => setForm({})} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Plus size={15} /> Add budget
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
        <div style={{ maxWidth: 760, margin: '0 auto', padding: 'calc(36px * var(--v-rhythm)) var(--content-h-pad) 56px' }}>
          {budgets.length === 0 ? (
            <EmptyState
              icon={<Wallet size={22} />}
              title="No budgets set"
              description="Set monthly budgets to track your spending limits."
              action={<button onClick={() => setForm({})} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Add budget</button>}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {budgets.map(b => {
                const pct = b.amount > 0 ? Math.min(100, ((b.spent ?? 0) / b.amount) * 100) : 0;
                const over = (b.spent ?? 0) > b.amount;
                const remaining = b.amount - (b.spent ?? 0);
                const tone = over ? 'var(--negative)' : (b.category_color ?? 'var(--clay)');
                return (
                  <div key={b.id} className="group mm-acctrow" role="button" tabIndex={0}
                    onClick={() => setForm({ budget: b })}
                    onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) setForm({ budget: b }); }}
                    style={{ padding: '12px 8px', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: `color-mix(in srgb, ${tone} 13%, transparent)`, color: tone,
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
                        <RowMenu items={[
                          { label: 'Edit', icon: <Pencil size={13} />, onSelect: () => setForm({ budget: b }) },
                          { label: 'Delete', icon: <Trash2 size={13} />, onSelect: () => handleDelete(b), danger: true },
                        ]} />
                      </div>
                    </div>
                    <div style={{ height: 8, background: 'var(--paper-sunk)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: tone, borderRadius: 999, transition: 'width 500ms' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {form && (
        <BudgetForm key={form.budget?.id ?? 'new'} budget={form.budget} taken={budgets.map(b => b.category_id)}
          year={budgetYear} month={budgetMonth} onSaved={fetchBudgets} onClose={() => setForm(null)} />
      )}
    </div>
  );
}
