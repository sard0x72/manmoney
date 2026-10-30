import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Wallet, Building2, CreditCard, TrendingUp, ArrowRightLeft } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { useAddRequest } from '../../lib/useAddRequest';
import { FormSheet, useDirty } from '../ui/FormSheet';
import { MoneyInput } from '../ui/MoneyInput';
import { EmptyState } from '../ui/EmptyState';
import { RowMenu } from '../ui/RowMenu';
import { SummaryBar } from '../ui/SummaryBar';
import { friendTotals } from '../../lib/friends';
import { PageHeader } from '../layout/PageHeader';
import type { Account, AccountUsage } from '../../types';

const COLORS = ['#BD5C42','#4E7A52','#B23E2E','#B5852A','#8A5A78','#3F7E7A','#A87E2E','#B05772','#6E7A3F','#5B6675'];

const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  cash: Wallet,
  bank: Building2,
  credit: CreditCard,
  investment: TrendingUp,
};

const faint = { fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)' } as const;

function AccountForm({ acct, onSaved, onClose }: { acct?: Account; onSaved: () => void; onClose: () => void }) {
  const { showToast, currency } = useAppStore();
  const [name, setName] = useState(acct?.name ?? '');
  const [type, setType] = useState<Account['account_type']>(acct?.account_type ?? 'bank');
  const [balance, setBalance] = useState('0');
  const [color, setColor] = useState(acct?.color ?? COLORS[0]);
  const [saving, setSaving] = useState(false);
  const dirty = useDirty({ name, type, balance, color });

  const handleSave = async () => {
    if (!name.trim()) return showToast('Enter a name', 'error');
    setSaving(true);
    try {
      if (acct) await api.accounts.update({ id: acct.id, name: name.trim(), account_type: type, currency, color, icon: 'wallet' });
      else await api.accounts.create({ name: name.trim(), account_type: type, balance: parseFloat(balance) || 0, currency, color, icon: 'wallet' });
      showToast('Saved');
      onSaved();
      onClose();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <FormSheet title={acct ? 'Edit account' : 'Add account'} onClose={onClose} onSubmit={handleSave} dirty={dirty} saving={saving}>
      <div>
        <label className="label mb-1.5 block">Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Main checking, cash wallet" autoFocus />
      </div>
      <div>
        <p className="label mb-2">Type</p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Type">
          {(['cash', 'bank', 'credit', 'investment'] as const).map(t => {
            const Icon = TYPE_ICONS[t] ?? Wallet;
            const on = type === t;
            return (
              <button key={t} type="button" onClick={() => setType(t)} aria-pressed={on}
                className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium capitalize transition-all"
                style={on
                  ? { border: '1px solid transparent', background: 'var(--clay-tint)', color: 'var(--clay-ink)' }
                  : { border: '1px solid var(--line)', color: 'var(--text-secondary)' }}>
                <Icon size={16} /> {t}
              </button>
            );
          })}
        </div>
      </div>
      {acct ? (
        <p style={faint}>Balance: {formatCurrency(acct.balance)}. It changes through transactions.</p>
      ) : (
        <div>
          <label className="label mb-1.5 block">Opening balance</label>
          <MoneyInput value={balance} onChange={e => setBalance(e.target.value)} />
        </div>
      )}
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
    </FormSheet>
  );
}

/** Moves every entry and the balance into another account, then deletes this one. */
function MergeAccountForm({ from, usage, onSaved, onClose }: { from: Account; usage?: AccountUsage; onSaved: () => void; onClose: () => void }) {
  const { accounts, showToast } = useAppStore();
  const targets = accounts.filter(a => a.id !== from.id);
  const [toId, setToId] = useState(targets[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const entries = usage?.entries ?? 0;

  const handleSave = async () => {
    if (!toId) return showToast('Pick an account', 'error');
    setSaving(true);
    try {
      await api.accounts.merge(from.id, toId);
      showToast(`Moved to ${targets.find(a => a.id === toId)?.name ?? 'account'}`);
      onSaved();
      onClose();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  const moves = [
    entries > 0 ? `${entries} ${entries === 1 ? 'entry' : 'entries'}` : '',
    Math.abs(from.balance) > 0.005 ? `a ${formatCurrency(from.balance)} balance` : '',
  ].filter(Boolean).join(' and ');

  return (
    <FormSheet title="Move everything" onClose={onClose} onSubmit={handleSave} saving={saving} submitLabel="Move">
      <div>
        <label htmlFor="merge-to" className="block mb-1.5" style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)' }}>
          Move everything from <b>{from.name}</b> into
        </label>
        <select id="merge-to" value={toId} onChange={e => setToId(e.target.value)} className="input" autoFocus>
          {targets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <p style={faint}>
        {moves ? `${moves.charAt(0).toUpperCase()}${moves.slice(1)} move. ` : ''}{from.name} is then deleted.
      </p>
    </FormSheet>
  );
}

export function Accounts() {
  const { accounts: all, loans, fetchAccounts, fetchDashboard, pendingDeletes, deleteWithUndo } = useAppStore();
  const accounts = all.filter(a => !pendingDeletes.has(a.id));
  const [showForm, setShowForm] = useState(false);
  const [editAcct, setEditAcct] = useState<Account | undefined>();
  const [mergeAcct, setMergeAcct] = useState<Account | undefined>();
  const [usage, setUsage] = useState<Record<string, AccountUsage>>({});

  const loadUsage = () => api.accounts.usage()
    .then(rows => setUsage(Object.fromEntries(rows.map(u => [u.account_id, u]))))
    .catch(e => console.error('accountUsage', e));
  const refresh = () => { fetchAccounts(); fetchDashboard(); loadUsage(); };

  useEffect(() => { fetchAccounts(); loadUsage(); }, []);

  // Only an unused account can be deleted, so nothing cascades and Undo is enough.
  const handleDelete = (a: Account) => deleteWithUndo({
    id: a.id, label: 'Account',
    commit: async () => { await api.accounts.delete(a.id); refresh(); },
  });

  const openEdit = (a?: Account) => { setEditAcct(a); setShowForm(true); };
  useAddRequest('accounts', () => openEdit());

  // Net worth counts what friends owe you and what you owe them, not just account balances.
  const inAccounts = accounts.reduce((s, a) => s + a.balance, 0);
  const { owedToYou, youOwe } = friendTotals(loans);
  const netWorth = inAccounts + owedToYou - youOwe;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Accounts"
        actions={
          <button onClick={() => openEdit()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Add account
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 820, padding: 'calc(32px * var(--v-rhythm)) var(--content-h-pad) calc(56px * var(--v-rhythm))' }}>
          {accounts.length === 0 ? (
            <EmptyState
              icon={<Wallet size={22} />}
              title="No accounts"
              description="Add the cash, bank, credit and investment accounts you want to track."
              action={<button onClick={() => openEdit()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Add account</button>}
            />
          ) : (
            <>
              <SummaryBar items={[
                { label: 'Net worth', value: netWorth, tone: netWorth < 0 ? 'negative' : 'neutral' },
                { label: 'In accounts', value: inAccounts },
                ...(owedToYou > 0.005 ? [{ label: 'Friends owe you', value: owedToYou, tone: 'positive' as const, sign: true }] : []),
                ...(youOwe > 0.005 ? [{ label: 'You owe friends', value: -youOwe, sign: true }] : []),
              ]} />

              {/* Account rows */}
              <div style={{ borderTop: '1px solid var(--line)' }}>
                {accounts.map(a => {
                  const Icon = TYPE_ICONS[a.account_type] ?? Wallet;
                  const neg = a.balance < 0;
                  const entries = usage[a.id]?.entries ?? 0;
                  return (
                    <div key={a.id} className="mm-acctrow group" role="button" tabIndex={0}
                      onClick={() => openEdit(a)}
                      onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) openEdit(a); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
                        padding: '18px 8px', borderBottom: '1px solid var(--line)',
                      }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: `${a.color}20`, color: a.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 600, color: 'var(--ink-strong)' }}>
                          {a.name}
                        </div>
                        <div style={{ ...faint, marginTop: 2, textTransform: 'capitalize' }}>{a.account_type}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
                          fontSize: 18, fontWeight: 500,
                          color: neg ? 'var(--negative)' : 'var(--ink-strong)',
                        }}>
                          {formatCurrency(Math.abs(a.balance))}
                        </div>
                        {neg && <div style={{ ...faint, fontSize: 12, marginTop: 2 }}>owed</div>}
                      </div>
                      <RowMenu items={[
                        { label: 'Edit', icon: <Pencil size={13} />, onSelect: () => openEdit(a) },
                        {
                          label: 'Move everything to…', icon: <ArrowRightLeft size={13} />, onSelect: () => setMergeAcct(a),
                          disabled: accounts.length < 2, hint: 'Add another account first',
                        },
                        {
                          label: 'Delete', icon: <Trash2 size={13} />, onSelect: () => handleDelete(a), danger: true,
                          disabled: entries > 0, hint: `Has ${entries} ${entries === 1 ? 'entry' : 'entries'}. Move them first.`,
                        },
                      ]} />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {showForm && (
        <AccountForm key={editAcct?.id ?? 'new'} acct={editAcct} onSaved={refresh}
          onClose={() => { setShowForm(false); setEditAcct(undefined); }} />
      )}

      {mergeAcct && (
        <MergeAccountForm key={mergeAcct.id} from={mergeAcct} usage={usage[mergeAcct.id]} onSaved={refresh}
          onClose={() => setMergeAcct(undefined)} />
      )}
    </div>
  );
}
