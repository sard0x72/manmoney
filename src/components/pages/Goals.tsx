import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Target, Check, Minus } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, formatMonthYear } from '../../lib/utils';
import { useAddRequest } from '../../lib/useAddRequest';
import { FormSheet, useDirty } from '../ui/FormSheet';
import { MoneyInput } from '../ui/MoneyInput';
import { EmptyState } from '../ui/EmptyState';
import { RowMenu } from '../ui/RowMenu';
import { Segmented } from '../ui/Segmented';
import { MoreOptions } from '../ui/MoreOptions';
import { SummaryBar } from '../ui/SummaryBar';
import { Pill } from '../ui/Pill';
import { PageHeader } from '../layout/PageHeader';
import type { SavingsGoal } from '../../types';

const COLORS = ['#BD5C42','#4E7A52','#B23E2E','#B5852A','#8A5A78','#3F7E7A','#A87E2E','#B05772'];

/** When editing, the saved amount changes only through Add money, so it isn't on this form. */
function GoalForm({ goal, onSaved, onClose }: { goal?: SavingsGoal; onSaved: () => void; onClose: () => void }) {
  const { showToast } = useAppStore();
  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(goal?.target_amount?.toString() ?? '');
  const [current, setCurrent] = useState('');
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');
  const [color, setColor] = useState(goal?.color ?? COLORS[0]);
  const [notes, setNotes] = useState(goal?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const dirty = useDirty({ name, target, current, deadline, color, notes });

  const handleSave = async () => {
    const tgt = parseFloat(target);
    if (!name.trim()) return showToast('Enter a name', 'error');
    if (!tgt || tgt <= 0) return showToast('Enter a target', 'error');
    setSaving(true);
    try {
      const data = {
        name: name.trim(), target_amount: tgt, current_amount: goal ? goal.current_amount : Math.max(0, parseFloat(current) || 0),
        deadline: deadline || undefined, color, icon: 'target', notes,
      };
      if (goal) await api.goals.update({ ...data, id: goal.id });
      else await api.goals.create(data);
      showToast('Saved');
      onSaved();
      onClose();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <FormSheet title={goal ? 'Edit goal' : 'Add goal'} onClose={onClose} onSubmit={handleSave} dirty={dirty} saving={saving}>
      <div>
        <label className="label mb-1.5 block">Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Emergency fund, Japan trip" autoFocus />
      </div>
      <div className={goal ? '' : 'grid grid-cols-2 gap-3'}>
        <div>
          <label className="label mb-1.5 block">Target</label>
          <MoneyInput value={target} onChange={e => setTarget(e.target.value)} min="0" step="0.01" />
        </div>
        {!goal && (
          <div>
            <label className="label mb-1.5 block">Already saved</label>
            <MoneyInput value={current} onChange={e => setCurrent(e.target.value)} min="0" step="0.01" />
          </div>
        )}
      </div>
      <div>
        <label className="label mb-2 block">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Colour ${c}`} aria-pressed={color === c}
              className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-[hsl(var(--text))] scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <MoreOptions defaultOpen={!!(goal?.deadline || goal?.notes)}>
        <div>
          <label className="label mb-1.5 block">Target date</label>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label mb-1.5 block">Note</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="Optional" />
        </div>
      </MoreOptions>
    </FormSheet>
  );
}

/** Puts money toward a goal or takes some back. Goals are a tracker only: no account balance moves. */
function AddMoneyForm({ goal, initialMode, onSaved, onClose }: {
  goal: SavingsGoal; initialMode: 'add' | 'take'; onSaved: () => void; onClose: () => void;
}) {
  const { showToast } = useAppStore();
  const [mode, setMode] = useState(initialMode);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const dirty = useDirty({ amount });

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return showToast('Enter an amount', 'error');
    setSaving(true);
    try {
      const next = Math.max(0, goal.current_amount + (mode === 'add' ? amt : -amt));
      await api.goals.update({ ...goal, current_amount: next });
      showToast('Saved');
      onSaved();
      onClose();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <FormSheet title={goal.name} onClose={onClose} onSubmit={handleSave} dirty={dirty} saving={saving}>
      <Segmented value={mode} onChange={setMode} label="Add or take out" options={[['add', 'Add money'], ['take', 'Take out']]} />
      <div>
        <label className="label mb-1.5 block">Amount</label>
        <MoneyInput value={amount} onChange={e => setAmount(e.target.value)} min="0" step="0.01" autoFocus />
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 6 }}>
          Goals don't move money between accounts.
        </p>
      </div>
    </FormSheet>
  );
}

export function Goals() {
  const { goals: all, fetchGoals, pendingDeletes, deleteWithUndo } = useAppStore();
  const goals = all.filter(g => !pendingDeletes.has(g.id));
  const [form, setForm] = useState<{ goal?: SavingsGoal } | null>(null);
  const [money, setMoney] = useState<{ goal: SavingsGoal; mode: 'add' | 'take' } | null>(null);
  useAddRequest('goals', () => setForm({}));

  useEffect(() => { fetchGoals(); }, []);

  const handleDelete = (g: SavingsGoal) => deleteWithUndo({
    id: g.id, label: 'Goal',
    commit: async () => { await api.goals.delete(g.id); await fetchGoals(); },
  });

  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Goals"
        actions={
          <button onClick={() => setForm({})} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Add goal
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: 'calc(32px * var(--v-rhythm)) var(--content-h-pad) 56px' }}>
          {goals.length === 0 ? (
            <EmptyState
              icon={<Target size={22} />}
              title="No goals yet"
              description="Track what you're saving toward."
              action={<button onClick={() => setForm({})} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Add goal</button>}
            />
          ) : (
            <>
              <SummaryBar items={[{ label: 'Saved', value: totalSaved }, { label: 'Target', value: totalTarget }]} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                {goals.map(g => {
                  const pct = g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
                  const done = g.current_amount >= g.target_amount;
                  const toGo = Math.max(0, g.target_amount - g.current_amount);
                  return (
                    <div key={g.id} className="mm-card group" style={{ padding: 22, display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, color: 'var(--ink-strong)' }}>{g.name}</h3>
                      <div style={{ marginTop: 3, fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)' }}>
                        {done
                          ? <Pill tone="positive" icon={<Check size={11} />}>Reached</Pill>
                          : <>{formatCurrency(toGo)} to go{g.deadline ? ` · by ${formatMonthYear(g.deadline)}` : ''}</>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 18 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 20, fontWeight: 500, color: 'var(--ink-strong)' }}>
                          {formatCurrency(g.current_amount)}
                        </span>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-faint)' }}>of {formatCurrency(g.target_amount)}</span>
                      </div>
                      <div style={{ marginTop: 10, height: 6, background: 'var(--paper-sunk)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: done ? 'var(--positive)' : g.color, borderRadius: 999, transition: 'width 700ms' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                        <button onClick={() => setMoney({ goal: g, mode: 'add' })} className="btn-secondary"
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 13 }}>
                          <Plus size={13} /> Add money
                        </button>
                        <RowMenu items={[
                          { label: 'Take out', icon: <Minus size={13} />, onSelect: () => setMoney({ goal: g, mode: 'take' }), disabled: g.current_amount <= 0, hint: 'Nothing saved yet' },
                          { label: 'Edit', icon: <Pencil size={13} />, onSelect: () => setForm({ goal: g }) },
                          { label: 'Delete', icon: <Trash2 size={13} />, onSelect: () => handleDelete(g), danger: true },
                        ]} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {form && <GoalForm key={form.goal?.id ?? 'new'} goal={form.goal} onSaved={fetchGoals} onClose={() => setForm(null)} />}
      {money && <AddMoneyForm key={money.goal.id + money.mode} goal={money.goal} initialMode={money.mode} onSaved={fetchGoals} onClose={() => setMoney(null)} />}
    </div>
  );
}
