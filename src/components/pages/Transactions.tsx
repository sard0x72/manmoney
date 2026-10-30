import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Trash2, Pencil, X, ReceiptText, Copy } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, formatDay, formatSigned } from '../../lib/utils';
import { useAddRequest } from '../../lib/useAddRequest';
import { RowMenu } from '../ui/RowMenu';
import { EmptyState } from '../ui/EmptyState';
import { CategoryIcon } from '../ui/CategoryIcon';
import { Segmented } from '../ui/Segmented';
import { PageHeader } from '../layout/PageHeader';
import { TransactionForm } from '../forms/TransactionForm';
import type { Transaction } from '../../types';

const PAGE = 100;
type TypeFilter = 'all' | 'expense' | 'income';

/** The line under the description; also says when an entry came from a shared bill or tuition. */
function Secondary({ t, primary }: { t: Transaction; primary: string }) {
  const parts = [primary !== t.category_name ? t.category_name : '', t.account_name].filter(Boolean);
  const tag = t.linked_person ? `Split with ${t.linked_person}` : t.tuition_id ? 'Tuition' : '';
  return (
    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-faint)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {parts.join(' · ')}
      {tag && <span style={{ marginLeft: 8, padding: '1px 7px', borderRadius: 999, background: 'var(--paper-sunk)', color: 'var(--ink-muted)' }}>{tag}</span>}
    </div>
  );
}

export function Transactions() {
  const { fetchDashboard, fetchAccounts, categories, accounts, dataVersion, pendingDeletes, deleteWithUndo } = useAppStore();
  // Kept on the page, not in the store: the store's list is shared with other pages and may be cut short.
  const [rows, setRows] = useState<Transaction[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ tx?: Transaction; template?: Transaction } | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<TypeFilter>('all');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const loadSeq = useRef(0);
  useAddRequest('transactions', () => setForm({}));

  const filters = {
    search: search.trim() || undefined,
    transaction_type: filterType === 'all' ? undefined : filterType,
    account_id: filterAccount || undefined,
    category_id: filterCategory || undefined,
  };

  // Loads the first page again (after a filter change or a save), or the next page.
  const load = async (more = false) => {
    const seq = ++loadSeq.current;
    if (!more) setLoading(true);
    try {
      const offset = more ? rows.length : 0;
      const page = await api.transactions.list({ ...filters, limit: PAGE, offset });
      if (seq !== loadSeq.current) return; // a newer load started; drop this one
      setRows(more ? [...rows, ...page] : page);
      setHasMore(page.length === PAGE);
    } catch (e) {
      console.error('transactions', e);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  };

  const refresh = () => { load(); fetchDashboard(); fetchAccounts(); };

  useEffect(() => {
    const t = setTimeout(() => load(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, filterType, filterAccount, filterCategory, dataVersion]);

  const handleDelete = (t: Transaction) => deleteWithUndo({
    id: t.id, label: 'Transaction',
    commit: async () => { await api.transactions.delete(t.id); refresh(); },
  });

  const clearFilters = () => { setSearch(''); setFilterType('all'); setFilterAccount(''); setFilterCategory(''); };
  const hasFilters = !!(search || filterType !== 'all' || filterAccount || filterCategory);

  const visible = rows.filter(t => !pendingDeletes.has(t.id));
  const days: { date: string; items: Transaction[] }[] = [];
  for (const t of visible) {
    const last = days[days.length - 1];
    if (last?.date === t.date) last.items.push(t);
    else days.push({ date: t.date, items: [t] });
  }

  const addButton = (
    <button onClick={() => setForm({})} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <Plus size={15} /> Add transaction
    </button>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Transactions" actions={addButton} />

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '14px var(--content-h-pad)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 160, maxWidth: 280 }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', display: 'flex' }}>
            <Search size={15} />
          </span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" aria-label="Search"
            className="input" style={{ paddingLeft: 32, fontSize: 13.5 }} />
        </div>
        <Segmented size="sm" fill={false} value={filterType} onChange={setFilterType} label="Type"
          options={[['all', 'All'], ['expense', 'Spent'], ['income', 'Earned']]} />
        <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="input" aria-label="Account" style={{ width: 140, fontSize: 13 }}>
          <option value="">All accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input" aria-label="Category" style={{ width: 150, fontSize: 13 }}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 5 }}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '0 var(--content-h-pad) 56px' }}>
          {loading && rows.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'var(--clay)', borderTopColor: 'transparent' }} />
            </div>
          ) : visible.length === 0 ? (
            hasFilters
              ? <EmptyState icon={<Search size={22} />} title="Nothing matches"
                  action={<button onClick={clearFilters} className="btn-secondary">Clear filters</button>} />
              : <EmptyState icon={<ReceiptText size={22} />} title="No transactions yet" action={addButton} />
          ) : (
            <>
              {days.map(day => {
                const net = day.items.reduce((s, t) => s + (t.transaction_type === 'income' ? t.amount : -t.amount), 0);
                return (
                  <section key={day.date}>
                    <div style={{
                      position: 'sticky', top: 0, zIndex: 1, background: 'var(--paper)', display: 'flex', justifyContent: 'space-between',
                      padding: '16px 8px 6px', fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-faint)',
                    }}>
                      <span>{formatDay(day.date)}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 400 }}>{formatSigned(net)}</span>
                    </div>
                    {day.items.map(t => {
                      const primary = t.payee || t.notes || t.category_name || '';
                      const income = t.transaction_type === 'income';
                      return (
                        <div key={t.id} className="group mm-acctrow" role="button" tabIndex={0}
                          onClick={() => setForm({ tx: t })}
                          onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) setForm({ tx: t }); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderTop: '1px solid var(--line)', cursor: 'pointer' }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                            background: `${t.category_color ?? '#5B6675'}20`, color: t.category_color ?? 'var(--cat-slate)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <CategoryIcon icon={t.category_icon ?? 'tag'} size={14} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {primary}
                            </div>
                            <Secondary t={t} primary={primary} />
                          </div>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 500,
                            color: income ? 'var(--positive)' : 'var(--ink)', whiteSpace: 'nowrap',
                          }}>
                            {income ? '+' : '−'}{formatCurrency(t.amount)}
                          </span>
                          <RowMenu items={[
                            { label: 'Edit', icon: <Pencil size={13} />, onSelect: () => setForm({ tx: t }) },
                            { label: 'Duplicate', icon: <Copy size={13} />, onSelect: () => setForm({ template: t }) },
                            { label: 'Delete', icon: <Trash2 size={13} />, onSelect: () => handleDelete(t), danger: true },
                          ]} />
                        </div>
                      );
                    })}
                  </section>
                );
              })}
              {hasMore && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
                  <button onClick={() => load(true)} className="btn-secondary">Load more</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {form && (
        <TransactionForm key={form.tx?.id ?? form.template?.id ?? 'new'} tx={form.tx} template={form.template}
          onSaved={refresh} onClose={() => setForm(null)} />
      )}
    </div>
  );
}
