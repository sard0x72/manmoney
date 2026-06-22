import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Target } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { PageHeader } from '../layout/PageHeader';
import type { SavingsGoal } from '../../types';

const COLORS = ['#BD5C42','#4E7A52','#B23E2E','#B5852A','#8A5A78','#3F7E7A','#A87E2E','#B05772'];

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
      const data = { name: name.trim(), target_amount: tgt, current_amount: parseFloat(current) || 0, deadline: deadline || undefined, color, icon: 'target', notes };
      if (goal) { await api.goals.update({ ...data, id: goal.id }); showToast('Goal updated'); }
      else { await api.goals.create(data); showToast('Goal created'); }
      onSave();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label mb-1.5 block">Goal Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. Emergency Fund, Japan Trip…" autoFocus />
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
              style={{ backgroundColor: c }} />
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

/* Small circular progress ring — 44×44 */
function GoalRing({ pct, color }: { pct: number; color: string }) {
  const r = 17, c = 2 * Math.PI * r;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--paper-sunk)" strokeWidth="4" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`} />
    </svg>
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
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
  };

  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);

  const lead = goals.length > 0
    ? `${formatCurrency(totalSaved)} set aside of ${formatCurrency(totalTarget)} across ${goals.length} goal${goals.length !== 1 ? 's' : ''}.`
    : undefined;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        eyebrow="Saving toward"
        title="Savings Goals"
        lead={lead}
        actions={
          <button onClick={() => { setEditGoal(undefined); setShowForm(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> New Goal
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '32px 40px 56px' }}>
          {goals.length === 0 ? (
            <EmptyState
              icon={<Target size={22} />}
              title="No savings goals"
              description="Create a goal to track your progress toward something you're saving for."
              action={<button onClick={() => setShowForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> New Goal</button>}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
              {goals.map(g => {
                const pct = g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
                const done = pct >= 100;
                const remaining = Math.max(0, g.target_amount - g.current_amount);
                return (
                  <div key={g.id} className="mm-card" style={{ padding: 24, cursor: 'default' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <h3 style={{
                          fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600,
                          color: 'var(--ink-strong)',
                        }}>
                          {g.name}
                        </h3>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 3 }}>
                          {g.deadline ? `Target · ${formatDate(g.deadline)}` : 'No deadline'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {done ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            borderRadius: 999, padding: '3px 10px',
                            background: 'var(--positive-tint)', color: 'var(--positive)',
                            fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
                          }}>
                            ✓ Reached
                          </span>
                        ) : (
                          <GoalRing pct={pct} color={g.color} />
                        )}
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button onClick={() => { setEditGoal(g); setShowForm(true); }}
                            style={{ color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--paper-sunk)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeleteId(g.id)}
                            style={{ color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--negative)'; (e.currentTarget as HTMLElement).style.background = 'var(--negative-tint)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-faint)'; (e.currentTarget as HTMLElement).style.background = 'none'; }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 22 }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
                        fontSize: 22, fontWeight: 500, color: 'var(--ink-strong)',
                      }}>
                        {formatCurrency(g.current_amount)}
                      </span>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-faint)' }}>
                        of {formatCurrency(g.target_amount)}
                      </span>
                    </div>

                    <div style={{ marginTop: 14, height: 6, background: 'var(--paper-sunk)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: done ? 'var(--positive)' : g.color,
                        borderRadius: 999, transition: 'width 700ms',
                      }} />
                    </div>

                    <div style={{ marginTop: 12, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-muted)' }}>
                      {done
                        ? 'Fully funded — nice work.'
                        : <>{formatCurrency(remaining)} to go · <span style={{ color: 'var(--ink-faint)' }}>{Math.round(pct)}%</span></>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
