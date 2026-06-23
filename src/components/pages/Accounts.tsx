import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Wallet, Building2, CreditCard, TrendingUp } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { PageHeader } from '../layout/PageHeader';
import type { Account } from '../../types';

const COLORS = ['#BD5C42','#4E7A52','#B23E2E','#B5852A','#8A5A78','#3F7E7A','#A87E2E','#B05772','#6E7A3F','#5B6675'];
const CURRENCIES = ['USD','EUR','GBP','JPY','CAD','AUD','CHF','INR','BRL','MXN','UZS'];

const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  cash: Wallet,
  bank: Building2,
  credit: CreditCard,
  investment: TrendingUp,
};

function AccountForm({ acct, onSave, onCancel }: { acct?: Account; onSave: () => void; onCancel: () => void }) {
  const { showToast } = useAppStore();
  const [name, setName] = useState(acct?.name ?? '');
  const [type, setType] = useState<Account['account_type']>(acct?.account_type ?? 'bank');
  const [balance, setBalance] = useState(acct?.balance?.toString() ?? '0');
  const [currency, setCurrency] = useState(acct?.currency ?? 'USD');
  const [color, setColor] = useState(acct?.color ?? COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return showToast('Enter an account name', 'error');
    setSaving(true);
    try {
      if (acct) {
        await api.accounts.update({ id: acct.id, name: name.trim(), account_type: type, currency, color, icon: 'wallet' });
        showToast('Account updated');
      } else {
        await api.accounts.create({ name: name.trim(), account_type: type, balance: parseFloat(balance) || 0, currency, color, icon: 'wallet' });
        showToast('Account created');
      }
      onSave();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label mb-1.5 block">Account Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. Main Checking, Cash Wallet…" autoFocus />
      </div>
      <div>
        <p className="label mb-2">Account Type</p>
        <div className="grid grid-cols-2 gap-2">
          {(['cash', 'bank', 'credit', 'investment'] as const).map(t => {
            const Icon = TYPE_ICONS[t] ?? Wallet;
            return (
              <button key={t} onClick={() => setType(t)}
                className="flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium capitalize transition-all"
                style={type === t
                  ? { borderColor: 'var(--clay)', background: 'var(--clay-tint)', color: 'var(--clay-ink)' }
                  : { borderColor: 'var(--line)', color: 'var(--text-secondary)' }}>
                <Icon size={16} /> {t}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">{acct ? 'Current Balance' : 'Opening Balance'}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] text-sm">$</span>
            <input type="number" value={balance} onChange={e => setBalance(e.target.value)} className="input pl-7" placeholder="0.00" disabled={!!acct} />
          </div>
          {acct && <p className="text-xs text-[hsl(var(--text-muted))] mt-1">Balance is managed through transactions</p>}
        </div>
        <div>
          <label className="label mb-1.5 block">Currency</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)} className="input">
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
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
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : acct ? 'Update Account' : 'Create Account'}
        </button>
      </div>
    </div>
  );
}

export function Accounts() {
  const { accounts, fetchAccounts, showToast } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editAcct, setEditAcct] = useState<Account | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { fetchAccounts(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.accounts.delete(deleteId);
      showToast('Account deleted');
      setDeleteId(null);
      fetchAccounts();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
  };

  const net = accounts.reduce((s, a) => s + a.balance, 0);
  const assets = accounts.filter(a => a.balance >= 0).reduce((s, a) => s + a.balance, 0);
  const debts = accounts.filter(a => a.balance < 0).reduce((s, a) => s + a.balance, 0);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        eyebrow="Where it lives"
        title="Accounts"
        actions={
          <button onClick={() => { setEditAcct(undefined); setShowForm(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Add Account
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 820, padding: '32px var(--content-h-pad) 56px' }}>
          {accounts.length === 0 ? (
            <EmptyState
              icon={<Wallet size={22} />}
              title="No accounts"
              description="Create accounts to track your cash, bank, credit, and investment balances."
              action={<button onClick={() => setShowForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Add Account</button>}
            />
          ) : (
            <>
              {/* Net worth header */}
              <div style={{ display: 'flex', gap: 48, paddingBottom: 28, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
                <div>
                  <div className="mm-eyebrow" style={{ marginBottom: 10 }}>Net worth</div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
                    fontSize: 32, fontWeight: 500, color: 'var(--ink-strong)',
                  }}>
                    {formatCurrency(net)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 36, alignItems: 'flex-end', paddingBottom: 4 }}>
                  <div>
                    <div className="mm-eyebrow" style={{ marginBottom: 8 }}>Assets</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 19, fontWeight: 500, color: 'var(--positive)' }}>
                      {formatCurrency(assets)}
                    </div>
                  </div>
                  <div>
                    <div className="mm-eyebrow" style={{ marginBottom: 8 }}>Debts</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 19, fontWeight: 500, color: 'var(--ink)' }}>
                      {formatCurrency(Math.abs(debts))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account rows */}
              <div style={{ marginTop: 12 }}>
                {accounts.map(a => {
                  const Icon = TYPE_ICONS[a.account_type] ?? Wallet;
                  const neg = a.balance < 0;
                  return (
                    <div key={a.id} className="mm-acctrow" style={{
                      display: 'flex', alignItems: 'center', gap: 16,
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center',
                            borderRadius: 999, padding: '2px 8px',
                            background: 'var(--paper-sunk)',
                            fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 500,
                            color: 'var(--ink-muted)', textTransform: 'capitalize',
                          }}>
                            {a.account_type}
                          </span>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)' }}>{a.currency}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
                          fontSize: 18, fontWeight: 500,
                          color: neg ? 'var(--negative)' : 'var(--ink-strong)',
                        }}>
                          {formatCurrency(Math.abs(a.balance), a.currency)}
                        </div>
                        {neg && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--negative)', marginTop: 2 }}>owed</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                        <button onClick={() => { setEditAcct(a); setShowForm(true); }}
                          style={{ color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--paper-sunk)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeleteId(a.id)}
                          style={{ color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--negative)'; (e.currentTarget as HTMLElement).style.background = 'var(--negative-tint)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-faint)'; (e.currentTarget as HTMLElement).style.background = 'none'; }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditAcct(undefined); }} title={editAcct ? 'Edit Account' : 'Add Account'} size="sm">
        <AccountForm
          acct={editAcct}
          onSave={() => { setShowForm(false); setEditAcct(undefined); fetchAccounts(); }}
          onCancel={() => { setShowForm(false); setEditAcct(undefined); }}
        />
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Account" size="sm"
        footer={<><button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button><button onClick={handleDelete} className="btn-danger">Delete</button></>}
      >
        <p className="text-sm text-[hsl(var(--text-muted))]">Delete this account? All transactions linked to it will remain but balances won't be tracked.</p>
      </Modal>
    </div>
  );
}
