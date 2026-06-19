import { useEffect, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, monthName } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { CategoryIcon } from '../ui/CategoryIcon';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

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
      <p className="text-xs text-[hsl(var(--text-muted))]">
        Setting a budget for {monthName(month)} {year}. If a budget exists for this category and period, it will be updated.
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

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spent ?? 0), 0);
  const overBudget = budgets.filter(b => (b.spent ?? 0) > b.amount);

  const pieData = budgets.map(b => ({ name: b.category_name, value: b.amount, color: b.category_color }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-[hsl(var(--text))]">Budgets</h1>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="btn-ghost p-1.5"><ChevronLeft size={16} /></button>
            <span className="text-sm font-medium text-[hsl(var(--text))] min-w-[130px] text-center">
              {monthName(budgetMonth)} {budgetYear}
            </span>
            <button onClick={nextMonth} className="btn-ghost p-1.5"><ChevronRight size={16} /></button>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={15} /> Add Budget
        </button>
      </div>

      <div className="page-content space-y-4">
        {/* Summary */}
        {budgets.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="label mb-1">Total Budgeted</p>
              <p className="text-xl font-bold text-[hsl(var(--text))]">{formatCurrency(totalBudget)}</p>
            </div>
            <div className="card p-4">
              <p className="label mb-1">Total Spent</p>
              <p className={`text-xl font-bold ${totalSpent > totalBudget ? 'text-red-500' : 'text-[hsl(var(--text))]'}`}>{formatCurrency(totalSpent)}</p>
            </div>
            <div className="card p-4">
              <p className="label mb-1">Remaining</p>
              <p className={`text-xl font-bold ${totalBudget - totalSpent < 0 ? 'text-red-500' : 'amount-positive'}`}>
                {formatCurrency(Math.abs(totalBudget - totalSpent))}
                {totalBudget - totalSpent < 0 && <span className="text-sm font-normal ml-1 text-red-400">over</span>}
              </p>
            </div>
          </div>
        )}

        {overBudget.length > 0 && (
          <div className="flex items-start gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
            <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Over budget in {overBudget.length} {overBudget.length === 1 ? 'category' : 'categories'}</p>
              <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">
                {overBudget.map(b => b.category_name).join(', ')}
              </p>
            </div>
          </div>
        )}

        {budgets.length === 0 ? (
          <EmptyState
            icon={<span className="text-2xl">💰</span>}
            title="No budgets set"
            description="Set monthly budgets to track your spending limits."
            action={<button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={14} /> Add Budget</button>}
          />
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {/* Budget list */}
            <div className="col-span-2 space-y-3">
              {budgets.map(b => {
                const pct = b.amount > 0 ? Math.min(100, ((b.spent ?? 0) / b.amount) * 100) : 0;
                const over = (b.spent ?? 0) > b.amount;
                const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f97316' : b.category_color ?? '#6174f5';
                return (
                  <div key={b.id} className="card p-4 group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${b.category_color}20`, color: b.category_color }}
                        >
                          <CategoryIcon icon={b.category_icon ?? 'tag'} size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[hsl(var(--text))]">{b.category_name}</p>
                          <p className="text-xs text-[hsl(var(--text-muted))]">
                            {formatCurrency(b.spent ?? 0)} <span className="opacity-60">of</span> {formatCurrency(b.amount)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {over && (
                          <span className="badge bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                            +{formatCurrency((b.spent ?? 0) - b.amount)} over
                          </span>
                        )}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <button onClick={() => setDeleteId(b.id)} className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-[hsl(var(--text-muted))] hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2.5 bg-[hsl(var(--bg))] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: barColor }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-[hsl(var(--text-muted))]">
                        <span>{Math.round(pct)}% used</span>
                        <span>{over ? '0' : formatCurrency(b.amount - (b.spent ?? 0))} remaining</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pie chart */}
            <div className="card p-4">
              <p className="text-sm font-semibold text-[hsl(var(--text))] mb-3">Budget Allocation</p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color ?? '#6174f5'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {budgets.slice(0, 6).map(b => (
                  <div key={b.id} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.category_color }} />
                    <span className="text-xs text-[hsl(var(--text-muted))] truncate">{b.category_name}</span>
                    <span className="text-xs font-medium text-[hsl(var(--text))] ml-auto">{formatCurrency(b.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
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
