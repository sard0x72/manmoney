import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, PieChart, Plus, Minus, HandCoins } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, formatDate, formatDateShort, getMonthDateRange, currentYear, currentMonth } from '../../lib/utils';
import { friendTotals } from '../../lib/friends';
import { CategoryIcon } from '../ui/CategoryIcon';
import { PageHeader } from '../layout/PageHeader';
import { TransactionForm } from '../forms/TransactionForm';
import type { DailySpending, SpendingByCategory, Transaction } from '../../types';

/* Hand-built SVG cash-flow chart — income (sage) over expenses (faint ink) */
function FlowChart({ data, height = 168 }: { data: DailySpending[]; height?: number }) {
  if (!data.length) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-faint)' }}>
      No data this month
    </div>
  );
  const W = 640, H = height, pad = 4;
  const max = Math.max(...data.flatMap(d => [d.income, d.expenses]), 1);
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(data.length - 1, 1);
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2 - 8);
  const path = (key: 'income' | 'expenses') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(' ');
  const area = (key: 'income' | 'expenses') =>
    `${path(key)} L ${x(data.length - 1).toFixed(1)} ${(H - pad).toFixed(1)} L ${x(0).toFixed(1)} ${(H - pad).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="dash-inc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--positive)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--positive)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="dash-exp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ink)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--ink)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area('expenses')} fill="url(#dash-exp)" />
      <path d={path('expenses')} fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d={area('income')} fill="url(#dash-inc)" />
      <path d={path('income')} fill="none" stroke="var(--positive)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* Budget donut ring */
function DashRing({ pct }: { pct: number }) {
  const r = 38, c = 2 * Math.PI * r;
  const over = pct > 100;
  const col = over ? 'var(--negative)' : 'var(--clay)';
  return (
    <div style={{ position: 'relative', width: 96, height: 96 }}>
      <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--paper-sunk)" strokeWidth="9" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${Math.min(pct, 100) / 100 * c} ${c}`} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 19, fontWeight: 500, color: 'var(--ink-strong)',
      }}>
        {Math.round(pct)}%
      </div>
    </div>
  );
}

/* Category chip — small colored icon badge */
function Chip({ color, icon }: { color: string; icon: React.ReactNode }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
      background: `${color}20`, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {icon}
    </div>
  );
}

/* Amount display */
/* Spending is plain ink; red is kept for problems, like a balance below zero. */
function Amount({ value, type = 'plain', size = 'lg', showSign = false }: {
  value: number; type?: 'income' | 'expense' | 'plain' | 'problem'; size?: 'sm' | 'md' | 'lg'; showSign?: boolean;
}) {
  const sizes = { sm: 14, md: 17, lg: 24 };
  const color = type === 'income' ? 'var(--positive)' : type === 'problem' ? 'var(--negative)' : type === 'expense' ? 'var(--ink)' : 'var(--ink-strong)';
  const prefix = showSign ? (type === 'income' ? '+' : type === 'expense' ? '−' : '') : '';
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
      fontSize: sizes[size], fontWeight: 500, color, letterSpacing: '-0.01em',
    }}>
      {prefix}{formatCurrency(value)}
    </span>
  );
}

/* Progress bar */
function ProgressBar({ label, meta, value, max, color }: {
  label: string; meta: string; value: number; max: number; color: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-faint)' }}>{meta}</span>
      </div>
      <div style={{ height: 6, background: 'var(--paper-sunk)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

/* A large, equal-width action button for the quick-actions row */
function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="mm-card hover:shadow-card-hover"
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 12px',
        cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--ink)',
        transition: 'box-shadow var(--dur-fast)',
      }}>
      <span style={{
        width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--clay-tint)', color: 'var(--clay-ink)',
      }}>{icon}</span>
      {label}
    </button>
  );
}

export function Dashboard() {
  const { dashboard, loans, fetchDashboard, setPage, openQuickAdd, dataVersion } = useAppStore();
  const [daily, setDaily] = useState<DailySpending[]>([]);
  const [byCat, setByCat] = useState<SpendingByCategory[]>([]);
  // Its own short list: the store's transactions back other pages and the forms' category ranking.
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [editTx, setEditTx] = useState<Transaction | undefined>();

  const load = () => {
    fetchDashboard();
    api.transactions.list({ limit: 5 }).then(setRecent).catch(e => console.error('recent', e));
    const { from, to } = getMonthDateRange(currentYear(), currentMonth());
    api.analytics.daily(from, to).then(setDaily);
    api.analytics.byCategory(from, to, 'expense').then(d => setByCat(d.slice(0, 4)));
  };
  useEffect(load, [dataVersion]);

  const d = dashboard;
  const budgetPct = d && d.month_budget_total > 0
    ? (d.month_budget_spent / d.month_budget_total) * 100
    : 0;
  const { owedToYou, youOwe } = friendTotals(loans);
  const hasFriends = owedToYou > 0.005 || youOwe > 0.005;

  const now = new Date();
  // Today is always this year, so no year: "Friday · October 30".
  const dateLine = `${now.toLocaleDateString('en-US', { weekday: 'long' })} · ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;

  const stats = [
    { label: 'Balance',           value: d?.total_balance ?? 0,  icon: <Wallet size={14} />,       color: 'var(--cat-slate)', type: (d?.total_balance ?? 0) < 0 ? 'problem' as const : 'plain' as const },
    { label: 'Spent this month',  value: d?.month_expenses ?? 0, icon: <TrendingDown size={14} />, color: 'var(--cat-clay)',  type: 'expense' as const },
    { label: 'Earned this month', value: d?.month_income ?? 0,   icon: <TrendingUp size={14} />,   color: 'var(--cat-sage)',  type: 'income' as const },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader eyebrow={dateLine} title="Dashboard" />

      <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 'var(--content-max)', padding: 'calc(24px * var(--v-rhythm)) var(--content-h-pad) calc(64px * var(--v-rhythm))' }}>
        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <QuickAction icon={<Minus size={16} />} label="Expense" onClick={() => openQuickAdd('expense')} />
          <QuickAction icon={<Plus size={16} />} label="Income" onClick={() => openQuickAdd('income')} />
          <QuickAction icon={<HandCoins size={16} />} label="Friend" onClick={() => openQuickAdd('friend')} />
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${hasFriends ? 190 : 220}px, 1fr))`, gap: 16 }}>
          {stats.map(s => (
            <div key={s.label} className="mm-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-muted)' }}>{s.label}</span>
                <Chip color={s.color} icon={s.icon} />
              </div>
              <div style={{ marginTop: 12 }}>
                <Amount value={s.value} size="lg" type={s.type} />
              </div>
            </div>
          ))}
          {hasFriends && (
            <button onClick={() => setPage('loans')} className="mm-card hover:shadow-card-hover"
              style={{ padding: 18, textAlign: 'left', cursor: 'pointer', transition: 'box-shadow var(--dur-fast)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-muted)' }}>Friends</span>
                <Chip color="var(--clay)" icon={<HandCoins size={14} />} />
              </div>
              <div style={{ display: 'flex', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
                {owedToYou > 0.005 && (
                  <div>
                    <Amount value={owedToYou} size="md" type="income" showSign />
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-faint)' }}>owe you</div>
                  </div>
                )}
                {youOwe > 0.005 && (
                  <div>
                    <Amount value={youOwe} size="md" type="expense" showSign />
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-faint)' }}>you owe</div>
                  </div>
                )}
              </div>
            </button>
          )}
        </div>

        {/* Cash flow + This month */}
        <div className="dash-main-grid">
          <div className="mm-card" style={{ padding: 24 }}>
            <div className="mm-card-header">
              <span className="mm-card-title">Cash flow</span>
              <span className="mm-card-aside">{now.toLocaleDateString('en-US', { month: 'long' })}</span>
            </div>
            <FlowChart data={daily} height={168} />
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginTop: 10,
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)',
            }}>
              {daily.length > 0 && (
                <>
                  <span>{formatDateShort(daily[0].date)}</span>
                  {daily.length > 1 && <span>{formatDateShort(daily[Math.floor(daily.length / 2)].date)}</span>}
                  <span>{formatDateShort(daily[daily.length - 1].date)}</span>
                </>
              )}
            </div>
          </div>

          <div className="mm-card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
            <div className="mm-card-header">
              <span className="mm-card-title">Budget</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 0 4px' }}>
              {d && d.month_budget_total > 0 ? (
                <>
                  <DashRing pct={budgetPct} />
                  <div style={{ marginTop: 14, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>
                    {formatCurrency(d.month_budget_spent)} / {formatCurrency(d.month_budget_total)}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'var(--ink-faint)', display: 'flex' }}><PieChart size={26} /></span>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-muted)' }}>No budget this month</div>
                  <button onClick={() => setPage('budgets')} className="btn-secondary" style={{ fontSize: 13, padding: '6px 12px' }}>
                    Add budget
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent activity + Top spending */}
        <div className="dash-bottom-grid">
          <div className="mm-card" style={{ padding: 24 }}>
            <div className="mm-card-header">
              <span className="mm-card-title">Recent activity</span>
              {recent.length > 0 && (
                <button onClick={() => setPage('transactions')} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 500, color: 'var(--clay-ink)',
                }}>See all</button>
              )}
            </div>
            {recent.length > 0 ? recent.map((t, i) => {
              const primary = t.payee || t.notes || t.category_name || '';
              // The category is shown once: as the title when there's nothing better, otherwise underneath.
              const secondary = [primary !== t.category_name ? t.category_name : '', formatDate(t.date)].filter(Boolean).join(' · ');
              return (
                <button key={t.id} onClick={() => setEditTx(t)} className="hover:bg-[var(--surface-2)]" style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', textAlign: 'left',
                  background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                  borderBottom: i < recent.length - 1 ? '1px solid var(--line)' : 'none',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: `${t.category_color ?? '#5B6675'}20`, color: t.category_color ?? 'var(--cat-slate)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CategoryIcon icon={t.category_icon ?? 'tag'} size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {primary}
                    </div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--ink-faint)' }}>{secondary}</div>
                  </div>
                  <Amount value={t.amount} type={t.transaction_type === 'income' ? 'income' : 'expense'} size="sm" showSign />
                </button>
              );
            }) : (
              <div style={{ textAlign: 'center', padding: '24px 0', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-faint)' }}>
                No transactions yet
              </div>
            )}
          </div>

          <div className="mm-card" style={{ padding: 24 }}>
            <div className="mm-card-header">
              <span className="mm-card-title">Top spending</span>
              <span className="mm-card-aside">This month</span>
            </div>
            {byCat.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 2 }}>
                {byCat.map(c => (
                  <ProgressBar key={c.category_id} label={c.category_name} meta={formatCurrency(c.amount)}
                    value={c.amount} max={byCat[0].amount} color={c.category_color ?? 'var(--clay)'} />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-faint)' }}>
                No spending this month
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {editTx && <TransactionForm key={editTx.id} tx={editTx} onSaved={load} onClose={() => setEditTx(undefined)} />}
    </div>
  );
}
