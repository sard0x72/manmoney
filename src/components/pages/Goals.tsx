import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Target } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import type { SavingsGoal } from '../../types';

const COLORS = ['#6174f5','#22c55e','#ef4444','#f97316','#a855f7','#06b6d4','#eab308','#ec4899'];

function GoalForm({ goal, onSave, onCancel }: { goal?: SavingsGoal; onSave: () => void; onCancel: () => void }) {
  const { showToast } = useAppStore();
  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(goal?.target_amount?.toString() ?? '');
  const [current, setCurrent] = useState(goal?.current_amount?.toString() ?? '0');
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');
  const [color, setColor] = useState(goal?.color ?? COLORS[0]);
  const [notes, setNotes] = useState(goal?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const tgt = parseFloat(target);
    if (!name.trim()) return showToast('Enter a goal name', 'error');
    if (!tgt || tgt <= 0) return showToast('Enter a valid target amount', 'error');
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        target_amount: tgt,
        current_amount: parseFloat(current) || 0,
        deadline: deadline || undefined,
        color,
        icon: 'target',
        notes,
      };
      if (goal) {
        await api.goals.update({ ...data, id: goal.id });
        showToast('Goal updated');
      } else {
        await api.goals.create(data);
        showToast('Goal created');
      }
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
        <label className="label mb-1.5 block">Goal Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. New Laptop, Emergency Fund…" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Target Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] text-sm">$</span>
            <input type="number" value={target} onChange={e => setTarget(e.target.value)} className="input pl-7" placeholder="0.00" />
          </div>
        </div>
        <div>
          <label className="label mb-1.5 block">Already Saved</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] text-sm">$</span>
            <input type="number" value={current} onChange={e => setCurrent(e.target.value)} className="input pl-7" placeholder="0.00" />
          </div>
        </div>
      </div>
      <div>
        <label className="label mb-1.5 block">Target Date (optional)</label>
        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="input" />
      </div>
      <div>
        <label className="label mb-2 block">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-[hsl(var(--text))] scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div>
        <label className="label mb-1.5 block">Notes</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="Optional notes…" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : goal ? 'Update Goal' : 'Create Goal'}
        </button>
      </div>
    </div>
  );
}

function GoalCard({ goal, onEdit, onDelete }: { goal: SavingsGoal; onEdit: () => void; onDelete: () => void }) {
  const pct = goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;
  const remaining = goal.target_amount - goal.current_amount;
  const done = pct >= 100;

  return (
    <div className="card p-5 group hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${goal.color}20` }}>
            <Target size={18} style={{ color: goal.color }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[hsl(var(--text))]">{goal.name}</h3>
            {goal.deadline && (
              <p className="text-xs text-[hsl(var(--text-muted))]">Due {formatDate(goal.deadline)}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-[hsl(var(--text-muted))] hover:text-red-500 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Circular progress */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
            <circle
              cx="50" cy="50" r="40" fill="none"
              stroke={done ? '#22c55e' : goal.color}
              strokeWidth="10"
              strokeDasharray={`${pct * 2.51} 251`}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold" style={{ color: done ? '#22c55e' : goal.color }}>{Math.round(pct)}%</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-[hsl(var(--text-muted))]">Saved</span>
            <span className="font-semibold">{formatCurrency(goal.current_amount)}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-[hsl(var(--text-muted))]">Target</span>
            <span className="font-semibold">{formatCurrency(goal.target_amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[hsl(var(--text-muted))]">{done ? 'Achieved! 🎉' : 'Remaining'}</span>
            {!done && <span className="font-semibold amount-negative">{formatCurrency(remaining)}</span>}
          </div>
        </div>
      </div>

      {/* Linear progress bar */}
      <div className="h-2 bg-[hsl(var(--border))] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: done ? '#22c55e' : goal.color }}
        />
      </div>

      {goal.notes && <p className="text-xs text-[hsl(var(--text-muted))] mt-3 truncate">{goal.notes}</p>}
    </div>
  );
}

export function Goals() {
  const { goals, fetchGoals, showToast } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState<SavingsGoal | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { fetchGoals(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.goals.delete(deleteId);
      showToast('Goal deleted');
      setDeleteId(null);
      fetchGoals();
    } catch (e: any) {
      showToast(e?.toString() ?? 'Error', 'error');
    }
  };

  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-[hsl(var(--text))]">Savings Goals</h1>
          {goals.length > 0 && (
            <p className="text-sm text-[hsl(var(--text-muted))] mt-0.5">
              {formatCurrency(totalSaved)} saved of {formatCurrency(totalTarget)} total
            </p>
          )}
        </div>
        <button onClick={() => { setEditGoal(undefined); setShowForm(true); }} className="btn-primary">
          <Plus size={15} /> New Goal
        </button>
      </div>

      <div className="page-content">
        {goals.length === 0 ? (
          <EmptyState
            icon={<Target size={22} />}
            title="No savings goals"
            description="Create a goal to track your progress toward something you're saving for."
            action={<button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={14} /> New Goal</button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {goals.map(g => (
              <GoalCard
                key={g.id}
                goal={g}
                onEdit={() => { setEditGoal(g); setShowForm(true); }}
                onDelete={() => setDeleteId(g.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditGoal(undefined); }} title={editGoal ? 'Edit Goal' : 'New Savings Goal'} size="sm">
        <GoalForm
          goal={editGoal}
          onSave={() => { setShowForm(false); setEditGoal(undefined); fetchGoals(); }}
          onCancel={() => { setShowForm(false); setEditGoal(undefined); }}
        />
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Goal" size="sm"
        footer={<><button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button><button onClick={handleDelete} className="btn-danger">Delete</button></>}
      >
        <p className="text-sm text-[hsl(var(--text-muted))]">Permanently delete this savings goal?</p>
      </Modal>
    </div>
  );
}
