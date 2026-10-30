import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Trash2, Pencil, X, ReceiptText } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { RowMenu } from '../ui/RowMenu';
import { useAddRequest } from '../../lib/useAddRequest';
import { EmptyState } from '../ui/EmptyState';
import { CategoryIcon } from '../ui/CategoryIcon';
import { PageHeader } from '../layout/PageHeader';
import { TransactionForm } from '../forms/TransactionForm';
import type { Transaction } from '../../types';

export function Transactions() {
  const { transactions: all, transactionsLoading, fetchTransactions, fetchDashboard, fetchAccounts, categories, accounts, dataVersion, pendingDeletes, deleteWithUndo } = useAppStore();
  const transactions = all.filter(t => !pendingDeletes.has(t.id));
  const [showForm, setShowForm] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | undefined>();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const openForm = (t?: Transaction) => { setEditTx(t); setShowForm(true); };
  useAddRequest('transactions', () => openForm());

  const refresh = useCallback(() => {
    fetchTransactions({ limit: 200, search: search || undefined, transaction_type: filterType || undefined, account_id: filterAccount || undefined, category_id: filterCategory || undefined });
    fetchDashboard();
    fetchAccounts();
  }, [search, filterType, filterAccount, filterCategory]);

  useEffect(() => {
    const t = setTimeout(refresh, 300);
    return () => clearTimeout(t);
  }, [search, filterType, filterAccount, filterCategory, dataVersion]);

  const handleDelete = (t: Transaction) => deleteWithUndo({
    id: t.id, label: 'Transaction',
    commit: async () => { await api.transactions.delete(t.id); refresh(); },
  });

  const hasFilters = search || filterType || filterAccount || filterCategory;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        eyebrow="Ledger"
        title="Transactions"
        lead="Every dollar in and out. Search, filter, and read down the column."
        actions={
          <button onClick={() => openForm()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Plus size={15} /> Add transaction
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
              icon={<ReceiptText size={22} />}
              title="Nothing matches"
              description="Try a different search or clear your filters."
              action={hasFilters ? <button onClick={() => { setSearch(''); setFilterType(''); setFilterAccount(''); setFilterCategory(''); }} className="btn-secondary">Clear filters</button>
                : <button onClick={() => openForm()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Add transaction</button>}
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
                  <tr key={t.id} className="group" tabIndex={0} onClick={() => openForm(t)}
                    onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) openForm(t); }}
                    style={{ borderBottom: '1px solid var(--line)', transition: 'background 180ms', cursor: 'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                  >
                    <td style={{ padding: '13px 12px', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(t.date)}
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
                        color: t.transaction_type === 'income' ? 'var(--positive)' : 'var(--negative)',
                      }}>
                        {t.transaction_type === 'income' ? '+' : '−'}
                        {formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td style={{ padding: '13px 12px', width: 36 }}>
                      <RowMenu items={[
                        { label: 'Edit', icon: <Pencil size={13} />, onSelect: () => openForm(t) },
                        { label: 'Delete', icon: <Trash2 size={13} />, onSelect: () => handleDelete(t), danger: true },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <TransactionForm key={editTx?.id ?? 'new'} tx={editTx} onSaved={refresh} onClose={() => { setShowForm(false); setEditTx(undefined); }} />
      )}
    </div>
  );
}
