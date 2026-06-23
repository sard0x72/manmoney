import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatCurrency, getMonthDateRange, getLast12Months } from '../../lib/utils';
import { CategoryIcon } from '../ui/CategoryIcon';
import { PageHeader } from '../layout/PageHeader';
import type { SpendingByCategory } from '../../types';

/* Hand-built monthly bar chart — income (sage) vs spending (clay) */
function MonthlyBars({ data }: { data: { label: string; income: number; expenses: number }[] }) {
  const max = Math.max(...data.flatMap(m => [m.income, m.expenses]), 1);
  const H = 200;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: H, marginTop: 8 }}>
      {data.map(m => (
        <div key={m.label} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 6, height: '100%', justifyContent: 'flex-end',
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 2,
            height: H - 22, width: '100%', justifyContent: 'center',
          }}>
            <div title={`Income ${m.income}`} style={{
              width: '38%', maxWidth: 12,
              height: `${(m.income / max) * 100}%`,
              background: 'var(--positive)',
              borderRadius: '3px 3px 0 0',
            }} />
            <div title={`Spending ${m.expenses}`} style={{
              width: '38%', maxWidth: 12,
              height: `${(m.expenses / max) * 100}%`,
              background: 'var(--clay)',
              borderRadius: '3px 3px 0 0',
              opacity: 0.85,
            }} />
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)',
          }}>
            {m.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-muted)' }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
}

export function Analytics() {
  const [monthly, setMonthly] = useState<{ label: string; income: number; expenses: number }[]>([]);
  const [catExpense, setCatExpense] = useState<SpendingByCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const now = new Date();
      const { from, to } = getMonthDateRange(now.getFullYear(), now.getMonth() + 1);
      const months = getLast12Months();
      const [ce, trend] = await Promise.all([
        api.analytics.byCategory(from, to, 'expense'),
        Promise.all(months.map(async m => {
          const { from: f, to: t } = getMonthDateRange(m.year, m.month);
          const d = await api.analytics.daily(f, t);
          return {
            label: m.label,
            income: d.reduce((s, x) => s + x.income, 0),
            expenses: d.reduce((s, x) => s + x.expenses, 0),
          };
        })),
      ]);
      setCatExpense(ce);
      setMonthly(trend);
      setLoading(false);
    };
    load();
  }, []);

  const avgIncome = monthly.length
    ? Math.round(monthly.reduce((s, m) => s + m.income, 0) / monthly.length)
    : 0;
  const avgExpense = monthly.length
    ? Math.round(monthly.reduce((s, m) => s + m.expenses, 0) / monthly.length)
    : 0;
  const saveRate = avgIncome > 0
    ? Math.round(((avgIncome - avgExpense) / avgIncome) * 100)
    : 0;

  const totalSpend = catExpense.reduce((s, c) => s + c.amount, 0);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        eyebrow="Insight"
        title="Analytics"
        lead="How the year is trending, and where this month went."
      />

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--clay)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: 'var(--content-max)', padding: '28px var(--content-h-pad) 64px' }}>
            {/* Headline figures */}
            <div className="analytics-stat-grid">
              {[
                { eyebrow: 'Avg income', value: avgIncome, sub: 'per month · last 12', mono: false },
                { eyebrow: 'Avg spending', value: avgExpense, sub: 'per month · last 12', mono: false },
              ].map(card => (
                <div key={card.eyebrow} className="mm-card" style={{ padding: 18 }}>
                  <span className="mm-eyebrow">{card.eyebrow}</span>
                  <div style={{
                    marginTop: 14,
                    fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
                    fontSize: 24, fontWeight: 500, color: 'var(--ink-strong)',
                  }}>
                    {formatCurrency(card.value)}
                  </div>
                  <div style={{ marginTop: 6, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-faint)' }}>
                    {card.sub}
                  </div>
                </div>
              ))}
              <div className="mm-card" style={{ padding: 18 }}>
                <span className="mm-eyebrow">Savings rate</span>
                <div style={{
                  marginTop: 14,
                  fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
                  fontSize: 24, fontWeight: 500, color: 'var(--positive)',
                }}>
                  {saveRate}%
                </div>
                <div style={{ marginTop: 6, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-faint)' }}>
                  of income kept
                </div>
              </div>
            </div>

            {/* 12-month bars */}
            {monthly.length > 0 && (
              <div className="mm-card" style={{ padding: 24, marginTop: 16 }}>
                <div className="mm-card-header">
                  <span className="mm-card-title">Income vs spending</span>
                  <span className="mm-card-aside">Last 12 months</span>
                </div>
                <MonthlyBars data={monthly} />
                <div style={{ display: 'flex', gap: 18, marginTop: 16 }}>
                  <Legend color="var(--positive)" label="Income" />
                  <Legend color="var(--clay)" label="Spending" />
                </div>
              </div>
            )}

            {/* Category breakdown */}
            {catExpense.length > 0 && (
              <div className="mm-card" style={{ padding: 24, marginTop: 16 }}>
                <div className="mm-card-header">
                  <span className="mm-card-title">Where it went</span>
                  <span className="mm-card-aside">This month</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
                  {catExpense.map(c => {
                    const pct = totalSpend > 0 ? Math.min(100, (c.amount / catExpense[0].amount) * 100) : 0;
                    return (
                      <div key={c.category_id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                          background: `${c.category_color}20`, color: c.category_color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <CategoryIcon icon={c.category_icon} size={13} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{c.category_name}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-faint)' }}>
                              {formatCurrency(c.amount)} · {totalSpend > 0 ? Math.round((c.amount / totalSpend) * 100) : 0}%
                            </span>
                          </div>
                          <div style={{ height: 4, background: 'var(--paper-sunk)', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: c.category_color, borderRadius: 999 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {monthly.length === 0 && catExpense.length === 0 && (
              <div style={{ textAlign: 'center', padding: '64px 0', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-faint)' }}>
                No data yet. Add some transactions to see analytics.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
