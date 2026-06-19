import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Trash2, Pencil, X, ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, formatDate, todayISO } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { CategoryIcon } from '../ui/CategoryIcon';
import type { Transaction } from '../../types';

const PAYMENT_METHODS = ['cash', 'bank transfer', 'credit card', 'debit card', 'mobile payment', 'check', 'other'];

function TransactionForm({ tx, onSave, onCancel }: {
  tx?: Transaction;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { accounts, categories, showToast } = useAppStore();
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>(
    (tx?.transaction_type as any) ?? 'expense'
  );
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
        ? (categories.find(c => c.name === 'Other Income' || c.name === 'Other Expense')?.id ?? categories[0].id)
        : categoryId;
      if (tx) {
        await api.transactions.update({
          id: tx.id, account_id: accountId, category_id: catId,
          transaction_type: type, amount: amt, date, notes, payee, payment_method: method, tags,
        });
        showToast('Transaction updated');
      } else {
        await api.transactions.create({
          account_id: accountId, category_id: catId, transaction_type: type,
          amount: amt, date, notes, payee, payment_method: method, tags,
          transfer_account_id: type === 'transfer' ? toAccountId : undefined,
        });
        showToast('Transaction added');
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
      {/* Type selector */}
      <div>
        <p className="label mb-2">Type</p>
        <div className="flex gap-1 p-1 bg-[hsl(var(--bg))] rounded-xl">
          {(['expense', 'income', 'transfer'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${type === t ? 'bg-[hsl(var(--surface))] shadow-card text-[hsl(var(--text))]' : 'text-[hsl(var(--text-muted))]'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="label mb-1.5 block">Amount</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] text-sm">$</span>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="input pl-7"
            autoFocus
          />
        </div>
      </div>

      {/* Date + Account */}
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

      {/* Category / To Account */}
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

      {/* Payee + Payment method */}
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

      {/* Notes + Tags */}
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
    } catch (e: any) {
      showToast(e?.toString() ?? 'Error', 'error');
    }
  };

  const typeIcon = (type: string) => {
    if (type === 'income') return <ArrowUpRight size={13} />;
    if (type === 'expense') return <ArrowDownLeft size={13} />;
    return <ArrowLeftRight size={13} />;
  };

  const hasFilters = search || filterType || filterAccount || filterCategory;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-xl font-bold text-[hsl(var(--text))]">Transactions</h1>
        <button onClick={() => { setEditTx(undefined); setShowForm(true); }} className="btn-primary">
          <Plus size={15} />
          Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-[hsl(var(--border))] flex items-center gap-2 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions…"
            className="input pl-8 py-1.5 text-sm"
          />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input py-1.5 text-sm w-32">
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>
        <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="input py-1.5 text-sm w-36">
          <option value="">All accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input py-1.5 text-sm w-40">
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setFilterType(''); setFilterAccount(''); setFilterCategory(''); }} className="btn-ghost py-1.5 text-xs">
            <X size={13} /> Clear
          </button>
        )}
      </div>

      <div className="page-content">
        {transactionsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={<ArrowLeftRight size={22} />}
            title="No transactions yet"
            description="Add your first transaction to start tracking your finances."
            action={
              <button onClick={() => setShowForm(true)} className="btn-primary">
                <Plus size={14} /> Add Transaction
              </button>
            }
          />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  {['Date', 'Category', 'Payee / Notes', 'Account', 'Method', 'Amount', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr
                    key={t.id}
                    className={`border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--bg))] transition-colors group ${i % 2 === 0 ? '' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm text-[hsl(var(--text-muted))] whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${t.category_color}20`, color: t.category_color }}
                        >
                          <CategoryIcon icon={t.category_icon ?? 'tag'} size={13} />
                        </span>
                        <span className="text-sm font-medium text-[hsl(var(--text))] whitespace-nowrap">{t.category_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-sm text-[hsl(var(--text))] truncate">{t.payee || '—'}</p>
                      {t.notes && <p className="text-xs text-[hsl(var(--text-muted))] truncate">{t.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-[hsl(var(--text-muted))]">{t.account_name}</td>
                    <td className="px-4 py-3">
                      <span className="badge bg-[hsl(var(--border))] text-[hsl(var(--text-muted))] capitalize">{t.payment_method}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`flex items-center justify-center w-5 h-5 rounded-full text-white text-xs
                          ${t.transaction_type === 'income' ? 'bg-green-500' : t.transaction_type === 'expense' ? 'bg-red-500' : 'bg-blue-500'}`}>
                          {typeIcon(t.transaction_type)}
                        </span>
                        <span className={`text-sm font-semibold tabular-nums ${t.transaction_type === 'income' ? 'amount-positive' : t.transaction_type === 'transfer' ? 'text-blue-500' : 'amount-negative'}`}>
                          {t.transaction_type === 'income' ? '+' : t.transaction_type === 'transfer' ? '↔' : '-'}
                          {formatCurrency(t.amount)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditTx(t); setShowForm(true); }}
                          className="p-1.5 rounded-lg hover:bg-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteId(t.id)}
                          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-[hsl(var(--text-muted))] hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditTx(undefined); }}
        title={editTx ? 'Edit Transaction' : 'Add Transaction'}
        size="md"
      >
        <TransactionForm
          tx={editTx}
          onSave={() => { setShowForm(false); setEditTx(undefined); refresh(); }}
          onCancel={() => { setShowForm(false); setEditTx(undefined); }}
        />
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Transaction" size="sm"
        footer={
          <>
            <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} className="btn-danger">Delete</button>
          </>
        }
      >
        <p className="text-sm text-[hsl(var(--text-muted))]">Are you sure? This will reverse the account balance change.</p>
      </Modal>
    </div>
  );
}
