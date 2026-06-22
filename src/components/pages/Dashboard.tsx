import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Plus } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, formatDateShort, getMonthDateRange, currentYear, currentMonth } from '../../lib/utils';
import { CategoryIcon } from '../ui/CategoryIcon';
import type { DailySpending, SpendingByCategory } from '../../types';

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
function Amount({ value, type = 'plain', size = 'lg', showSign = false }: {
  value: number; type?: 'income' | 'expense' | 'plain'; size?: 'sm' | 'md' | 'lg'; showSign?: boolean;
}) {
  const sizes = { sm: 14, md: 17, lg: 24 };
  const color = type === 'income' ? 'var(--positive)' : type === 'expense' ? 'var(--negative)' : 'var(--ink-strong)';
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

export function Dashboard() {
  const { dashboard, transactions, fetchDashboard, fetchTransactions, setPage } = useAppStore();
  const [daily, setDaily] = useState<DailySpending[]>([]);
  const [byCat, setByCat] = useState<SpendingByCategory[]>([]);

  useEffect(() => {
    fetchDashboard();
    fetchTransactions({ limit: 5 });
    const { from, to } = getMonthDateRange(currentYear(), currentMonth());
    api.analytics.daily(from, to).then(setDaily);
    api.analytics.byCategory(from, to, 'expense').then(d => setByCat(d.slice(0, 4)));
  }, []);

  const d = dashboard;
  const budgetPct = d && d.month_budget_total > 0
    ? (d.month_budget_spent / d.month_budget_total) * 100
    : 0;

  const recent = transactions.slice(0, 5);
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const stats = [
    { label: 'Total balance',  value: d?.total_balance ?? 0,   icon: <Wallet size={14} />,     color: 'var(--cat-slate)', sub: 'Across all accounts' },
    { label: 'Income',         value: d?.month_income ?? 0,    icon: <TrendingUp size={14} />,  color: 'var(--cat-sage)',  sub: 'This month' },
    { label: 'Expenses',       value: d?.month_expenses ?? 0,  icon: <TrendingDown size={14} />,color: 'var(--cat-clay)',  sub: 'This month' },
    { label: 'Saved',          value: d?.month_savings ?? 0,   icon: <PiggyBank size={14} />,  color: 'var(--cat-teal)',  sub: 'This month' },
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--paper)' }}>
      {/* Editorial header */}
      <header style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: 24, padding: '36px 44px 0',
      }}>
        <div>
          <div className="mm-eyebrow" style={{ marginBottom: 8 }}>{dayName} · {dateStr}</div>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 600,
            color: 'var(--ink-strong)', letterSpacing: '-0.02em',
          }}>
            Dashboard
          </h1>
        </div>
        <button
          onClick={() => setPage('transactions')}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 7 }}
        >
          <Plus size={15} /> Add Transaction
        </button>
      </header>

      <div style={{ maxWidth: 'var(--content-max)', padding: '28px 44px 64px' }}>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {stats.map(s => (
            <div key={s.label} className="mm-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span className="mm-eyebrow">{s.label}</span>
                <Chip color={s.color} icon={s.icon} />
              </div>
              <div style={{ marginTop: 16 }}>
                <Amount value={s.value} size="lg" type={s.value < 0 ? 'expense' : 'plain'} />
              </div>
              <div style={{
                marginTop: 6, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-faint)',
              }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Cash flow + This month */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 16 }}>
          {/* Cash flow chart */}
          <div className="mm-card" style={{ padding: 24 }}>
            <div className="mm-card-header">
              <span className="mm-card-title">Cash flow</span>
              <span className="mm-card-aside">
                {now.toLocaleDateString('en-US', { month: 'long' })}, day by day
              </span>
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

          {/* This month ring */}
          <div className="mm-card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
            <div className="mm-card-header">
              <span className="mm-card-title">This month</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 0 4px' }}>
              {d && d.month_budget_total > 0 ? (
                <>
                  <DashRing pct={budgetPct} />
                  <div style={{ marginTop: 14, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-muted)' }}>Budget used</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)', marginTop: 2 }}>
                      {formatCurrency(d.month_budget_spent)} / {formatCurrency(d.month_budget_total)}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 500, color: 'var(--ink-strong)' }}>
                    {formatCurrency(d?.month_savings ?? 0)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-muted)', marginTop: 6 }}>
                    saved this month
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent activity + Top spending */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          {/* Recent activity */}
          <div className="mm-card" style={{ padding: 24 }}>
            <div className="mm-card-header">
              <span className="mm-card-title">Recent activity</span>
            </div>
            {recent.length > 0 ? (
              <div>
                {recent.map((t, i) => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0',
                    borderBottom: i < recent.length - 1 ? '1px solid var(--line)' : 'none',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: `${t.category_color ?? 'var(--cat-slate)'}20`,
                      color: t.category_color ?? 'var(--cat-slate)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <CategoryIcon icon={t.category_icon ?? 'tag'} size={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.payee || t.category_name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--ink-faint)' }}>
                        {t.category_name}
                      </div>
                    </div>
                    <Amount value={t.amount} type={t.transaction_type === 'income' ? 'income' : 'expense'} size="sm" showSign />
                  </div>
                ))}
                <button
                  onClick={() => setPage('transactions')}
                  style={{
                    marginTop: 12, background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                    color: 'var(--clay-ink)', padding: 0,
                  }}
                >
                  All transactions →
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-faint)' }}>
                No transactions yet
              </div>
            )}
          </div>

          {/* Top spending */}
          <div className="mm-card" style={{ padding: 24 }}>
            <div className="mm-card-header">
              <span className="mm-card-title">Top spending</span>
              <span className="mm-card-aside">This month</span>
            </div>
            {byCat.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 2 }}>
                {byCat.map(c => (
                  <ProgressBar
                    key={c.category_id}
                    label={c.category_name}
                    meta={formatCurrency(c.amount)}
                    value={c.amount}
                    max={byCat[0].amount}
                    color={c.category_color ?? 'var(--clay)'}
                  />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-faint)' }}>
                No expenses this month
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
