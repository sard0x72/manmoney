import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Trash2, Pencil, X, ArrowLeftRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, formatDate, todayISO } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { CategoryIcon } from '../ui/CategoryIcon';
import { PageHeader } from '../layout/PageHeader';
import type { Transaction } from '../../types';

const PAYMENT_METHODS = ['cash', 'bank transfer', 'credit card', 'debit card', 'mobile payment', 'check', 'other'];

function TransactionForm({ tx, onSave, onCancel }: { tx?: Transaction; onSave: () => void; onCancel: () => void }) {
  const { accounts, categories, showToast } = useAppStore();
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>((tx?.transaction_type as any) ?? 'expense');
  const [amount, setAmount] = useState(tx?.amount?.toString() ?? '');
  const [date, setDate] = useState(tx?.date ?? todayISO());
  const [accountId, setAccountId] = useState(tx?.account_id ?? accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(tx?.category_id ?? '');
  const [payee, setPayee] = useState(tx?.payee ?? '');
  const [notes, setNotes] = useState(tx?.notes ?? '');
  const [method, setMethod] = useState(tx?.payment_method ?? 'cash');
  const [tags, setTags] = useState(tx?.tags ?? '');
  const [toAccountId, setToAccountId] = useState(tx?.transfer_account_id ?? '');
  const [saving, setSaving] = useState(false);

  const filteredCategories = categories.filter(c => c.category_type === (type === 'expense' ? 'expense' : 'income'));

  useEffect(() => {
    if (!categoryId) setCategoryId(filteredCategories[0]?.id ?? '');
  }, [type]);

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return showToast('Enter a valid amount', 'error');
    if (!accountId) return showToast('Select an account', 'error');
    if (!categoryId && type !== 'transfer') return showToast('Select a category', 'error');
    setSaving(true);
    try {
      const catId = type === 'transfer'
        ? (categories.find(c => c.name === 'Other Income' || c.name === 'Other Expense')?.id ?? categories[0]?.id ?? '')
        : categoryId;
      if (tx) {
        await api.transactions.update({ id: tx.id, account_id: accountId, category_id: catId, transaction_type: type, amount: amt, date, notes, payee, payment_method: method, tags });
        showToast('Transaction updated');
      } else {
        await api.transactions.create({ account_id: accountId, category_id: catId, transaction_type: type, amount: amt, date, notes, payee, payment_method: method, tags, transfer_account_id: type === 'transfer' ? toAccountId : undefined });
        showToast('Transaction added');
      }
      onSave();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* Type segmented */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--paper-sunk)', borderRadius: 'var(--radius)' }}>
        {(['expense', 'income', 'transfer'] as const).map(t => (
          <button key={t} onClick={() => setType(t)} style={{
            flex: 1, padding: '7px 0', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, textTransform: 'capitalize',
            background: type === t ? 'var(--surface)' : 'transparent',
            color: type === t ? 'var(--ink)' : 'var(--ink-faint)',
            boxShadow: type === t ? 'var(--shadow-sm)' : 'none',
          }}>{t}</button>
        ))}
      </div>
      <div>
        <label className="label mb-1.5 block">Amount</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] text-sm">$</span>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" className="input pl-7" autoFocus />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label mb-1.5 block">Account</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} className="input">
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      {type !== 'transfer' ? (
        <div>
          <label className="label mb-1.5 block">Category</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="input">
            <option value="">Select category…</option>
            {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      ) : (
        <div>
          <label className="label mb-1.5 block">To Account</label>
          <select value={toAccountId} onChange={e => setToAccountId(e.target.value)} className="input">
            <option value="">Select account…</option>
            {accounts.filter(a => a.id !== accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block">Payee</label>
          <input type="text" value={payee} onChange={e => setPayee(e.target.value)} className="input" placeholder="Where / to whom?" />
        </div>
        <div>
          <label className="label mb-1.5 block">Payment Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)} className="input">
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label mb-1.5 block">Notes</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="Optional notes…" />
      </div>
      <div>
        <label className="label mb-1.5 block">Tags (comma separated)</label>
        <input type="text" value={tags} onChange={e => setTags(e.target.value)} className="input" placeholder="e.g. groceries, weekly" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : tx ? 'Update' : 'Add Transaction'}
        </button>
      </div>
    </div>
  );
}

export function Transactions() {
  const { transactions, transactionsLoading, fetchTransactions, fetchDashboard, fetchAccounts, showToast, categories, accounts } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | undefined>();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetchTransactions({ limit: 200, search: search || undefined, transaction_type: filterType || undefined, account_id: filterAccount || undefined, category_id: filterCategory || undefined });
    fetchDashboard();
    fetchAccounts();
  }, [search, filterType, filterAccount, filterCategory]);

  useEffect(() => {
    const t = setTimeout(refresh, 300);
    return () => clearTimeout(t);
  }, [search, filterType, filterAccount, filterCategory]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.transactions.delete(deleteId);
      showToast('Transaction deleted');
      setDeleteId(null);
      refresh();
    } catch (e: any) { showToast(e?.toString() ?? 'Error', 'error'); }
  };

  const hasFilters = search || filterType || filterAccount || filterCategory;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        eyebrow="Ledger"
        title="Transactions"
        lead="Every dollar in and out. Search, filter, and read down the column."
        actions={
          <button onClick={() => { setEditTx(undefined); setShowForm(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Plus size={15} /> Add Transaction
          </button>
        }
      />

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 40px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', display: 'flex' }}>
            <Search size={15} />
          </span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payee or category…"
            style={{
              width: '100%', fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--ink)',
              background: 'var(--surface)', border: '1px solid var(--line-strong)',
              borderRadius: 'var(--radius)', padding: '8px 12px 8px 32px',
            }} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input" style={{ width: 120, fontSize: 13 }}>
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>
        <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="input" style={{ width: 140, fontSize: 13 }}>
          <option value="">All accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input" style={{ width: 150, fontSize: 13 }}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setFilterType(''); setFilterAccount(''); setFilterCategory(''); }} className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <X size={13} /> Clear
          </button>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-faint)' }}>
          {transactions.length} entries
        </span>
      </div>

      {/* Ledger */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '8px 40px 56px' }}>
          {transactionsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'var(--clay)', borderTopColor: 'transparent' }} />
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState
              icon={<ArrowLeftRight size={22} />}
              title="Nothing matches"
              description="Try a different search or clear your filters."
              action={hasFilters ? <button onClick={() => { setSearch(''); setFilterType(''); setFilterAccount(''); setFilterCategory(''); }} className="btn-secondary">Clear filters</button>
                : <button onClick={() => setShowForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Add Transaction</button>}
            />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Date', 'Category', 'Payee', 'Account', 'Method', 'Amount', ''].map((h, i) => (
                    <th key={h || i} style={{
                      textAlign: i === 5 ? 'right' : 'left',
                      padding: '14px 12px 10px',
                      fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: 'var(--ink-faint)', borderBottom: '1px solid var(--line)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id} className="group" style={{ borderBottom: '1px solid var(--line)', transition: 'background 180ms' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                  >
                    <td style={{ padding: '13px 12px', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(t.date).slice(0, 5)}
                    </td>
                    <td style={{ padding: '13px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                          background: `${t.category_color ?? 'var(--cat-slate)'}20`,
                          color: t.category_color ?? 'var(--cat-slate)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <CategoryIcon icon={t.category_icon ?? 'tag'} size={13} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                          {t.category_name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 12px' }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)' }}>{t.payee || '—'}</div>
                      {t.notes && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2 }}>{t.notes}</div>}
                    </td>
                    <td style={{ padding: '13px 12px', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-muted)' }}>
                      {t.account_name}
                    </td>
                    <td style={{ padding: '13px 12px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        borderRadius: 999, padding: '2px 8px',
                        background: 'var(--paper-sunk)',
                        fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 500,
                        color: 'var(--ink-muted)', textTransform: 'capitalize',
                      }}>
                        {t.payment_method}
                      </span>
                    </td>
                    <td style={{ padding: '13px 12px', textAlign: 'right' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
                        fontSize: 14, fontWeight: 500,
                        color: t.transaction_type === 'income' ? 'var(--positive)'
                          : t.transaction_type === 'expense' ? 'var(--negative)'
                          : 'var(--clay)',
                      }}>
                        {t.transaction_type === 'income' ? '+' : t.transaction_type === 'expense' ? '−' : '↔'}
                        {formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td style={{ padding: '13px 12px' }}>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => { setEditTx(t); setShowForm(true); }}
                          style={{ color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6, display: 'flex' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--paper-sunk)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteId(t.id)}
                          style={{ color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6, display: 'flex' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--negative)'; (e.currentTarget as HTMLElement).style.background = 'var(--negative-tint)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-faint)'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditTx(undefined); }} title={editTx ? 'Edit Transaction' : 'Add a transaction'} size="md">
        <TransactionForm tx={editTx} onSave={() => { setShowForm(false); setEditTx(undefined); refresh(); }} onCancel={() => { setShowForm(false); setEditTx(undefined); }} />
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Transaction" size="sm"
        footer={<><button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button><button onClick={handleDelete} className="btn-danger">Delete</button></>}
      >
        <p className="text-sm text-[hsl(var(--text-muted))]">Are you sure? This will reverse the account balance change.</p>
      </Modal>
    </div>
  );
}
