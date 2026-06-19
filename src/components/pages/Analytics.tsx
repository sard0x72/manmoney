import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { api } from '../../lib/api';
import { formatCurrency, getMonthDateRange, monthName, getLast12Months } from '../../lib/utils';
import { CategoryIcon } from '../ui/CategoryIcon';
import type { SpendingByCategory, DailySpending } from '../../types';

const TABS = ['Overview', 'Trends', 'Categories'] as const;
type Tab = typeof TABS[number];

export function Analytics() {
  const [tab, setTab] = useState<Tab>('Overview');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [daily, setDaily] = useState<DailySpending[]>([]);
  const [catExpense, setCatExpense] = useState<SpendingByCategory[]>([]);
  const [catIncome, setCatIncome] = useState<SpendingByCategory[]>([]);
  const [monthly, setMonthly] = useState<{ label: string; income: number; expenses: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { from, to } = getMonthDateRange(year, month);
    const [d, ce, ci] = await Promise.all([
      api.analytics.daily(from, to),
      api.analytics.byCategory(from, to, 'expense'),
      api.analytics.byCategory(from, to, 'income'),
    ]);
    setDaily(d);
    setCatExpense(ce);
    setCatIncome(ci);

    // Monthly trend
    const months = getLast12Months();
    const trend = await Promise.all(months.map(async m => {
      const { from: f, to: t } = getMonthDateRange(m.year, m.month);
      const d = await api.analytics.daily(f, t);
      const income = d.reduce((s, x) => s + x.income, 0);
      const expenses = d.reduce((s, x) => s + x.expenses, 0);
      return { label: m.label, income, expenses };
    }));
    setMonthly(trend);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [year, month]);

  const totalExpenses = catExpense.reduce((s, c) => s + c.amount, 0);
  const totalIncome = catIncome.reduce((s, c) => s + c.amount, 0);

  const thisMonthIncome = daily.reduce((s, d) => s + d.income, 0);
  const thisMonthExpenses = daily.reduce((s, d) => s + d.expenses, 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-xl font-bold text-[hsl(var(--text))]">Analytics</h1>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(+e.target.value)} className="input py-1.5 text-sm w-32">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>
            ))}
          </select>
          <select value={year} onChange={e => setYear(+e.target.value)} className="input py-1.5 text-sm w-24">
            {[2022, 2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-0 border-b border-[hsl(var(--border))] flex gap-0 shrink-0">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="page-content space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {tab === 'Overview' && (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="card p-4">
                    <p className="label mb-1">Total Income</p>
                    <p className="text-xl font-bold amount-positive">{formatCurrency(thisMonthIncome)}</p>
                  </div>
                  <div className="card p-4">
                    <p className="label mb-1">Total Expenses</p>
                    <p className="text-xl font-bold amount-negative">{formatCurrency(thisMonthExpenses)}</p>
                  </div>
                  <div className="card p-4">
                    <p className="label mb-1">Net Savings</p>
                    <p className={`text-xl font-bold ${thisMonthIncome - thisMonthExpenses >= 0 ? 'amount-positive' : 'amount-negative'}`}>
                      {formatCurrency(thisMonthIncome - thisMonthExpenses)}
                    </p>
                  </div>
                </div>

                {/* Daily chart */}
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-[hsl(var(--text))] mb-4">Daily Cash Flow — {monthName(month)} {year}</h2>
                  {daily.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={daily} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(8)} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} width={50} />
                        <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                        <Bar dataKey="income" fill="#22c55e" radius={[3, 3, 0, 0]} name="Income" />
                        <Bar dataKey="expenses" fill="#ef4444" radius={[3, 3, 0, 0]} name="Expenses" />
                        <Legend />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-center text-[hsl(var(--text-muted))] py-16">No data for this period</p>
                  )}
                </div>

                {/* Category breakdown */}
                {catExpense.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="card p-5">
                      <h2 className="text-sm font-semibold text-[hsl(var(--text))] mb-4">Expenses by Category</h2>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={catExpense} dataKey="amount" nameKey="category_name" cx="50%" cy="50%" outerRadius={80} paddingAngle={2}>
                            {catExpense.map((c, i) => <Cell key={i} fill={c.category_color} />)}
                          </Pie>
                          <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5 mt-2">
                        {catExpense.slice(0, 5).map(c => (
                          <div key={c.category_id} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.category_color }} />
                            <span className="text-xs text-[hsl(var(--text-muted))] truncate">{c.category_name}</span>
                            <span className="text-xs font-medium text-[hsl(var(--text))] ml-auto">{Math.round((c.amount / totalExpenses) * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card p-5">
                      <h2 className="text-sm font-semibold text-[hsl(var(--text))] mb-4">Top Expenses</h2>
                      <div className="space-y-3">
                        {catExpense.slice(0, 6).map(c => (
                          <div key={c.category_id}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${c.category_color}20`, color: c.category_color }}>
                                  <CategoryIcon icon={c.category_icon} size={12} />
                                </span>
                                <span className="text-[hsl(var(--text))]">{c.category_name}</span>
                              </div>
                              <span className="text-[hsl(var(--text-muted))] tabular-nums">{formatCurrency(c.amount)}</span>
                            </div>
                            <div className="h-1.5 bg-[hsl(var(--border))] rounded-full">
                              <div className="h-full rounded-full" style={{ width: `${totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0}%`, backgroundColor: c.category_color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === 'Trends' && (
              <div className="space-y-4">
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-[hsl(var(--text))] mb-4">12-Month Income vs Expenses</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} width={52} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      <Legend />
                      <Area type="monotone" dataKey="income" stroke="#22c55e" fill="url(#incG)" strokeWidth={2} name="Income" dot={{ r: 3 }} />
                      <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expG)" strokeWidth={2} name="Expenses" dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-[hsl(var(--text))] mb-4">Monthly Savings</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthly.map(m => ({ ...m, savings: m.income - m.expenses }))} margin={{ top: 2, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} width={52} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      <Bar dataKey="savings" name="Net Savings" radius={[4, 4, 0, 0]}>
                        {monthly.map((m, i) => (
                          <Cell key={i} fill={m.income - m.expenses >= 0 ? '#6174f5' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {tab === 'Categories' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Expense categories */}
                  <div className="card p-5">
                    <h2 className="text-sm font-semibold text-[hsl(var(--text))] mb-1">Expense Categories</h2>
                    <p className="text-xs text-[hsl(var(--text-muted))] mb-4">Total: {formatCurrency(totalExpenses)}</p>
                    {catExpense.length > 0 ? (
                      <div className="space-y-3">
                        {catExpense.map(c => (
                          <div key={c.category_id}>
                            <div className="flex items-center justify-between text-sm mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${c.category_color}20`, color: c.category_color }}>
                                  <CategoryIcon icon={c.category_icon} size={13} />
                                </span>
                                <span className="text-[hsl(var(--text))]">{c.category_name}</span>
                                <span className="text-xs text-[hsl(var(--text-muted))]">×{c.count}</span>
                              </div>
                              <span className="font-semibold tabular-nums">{formatCurrency(c.amount)}</span>
                            </div>
                            <div className="h-1.5 bg-[hsl(var(--border))] rounded-full">
                              <div className="h-full rounded-full" style={{ width: `${totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0}%`, backgroundColor: c.category_color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-[hsl(var(--text-muted))] text-center py-8">No expense data</p>}
                  </div>

                  {/* Income categories */}
                  <div className="card p-5">
                    <h2 className="text-sm font-semibold text-[hsl(var(--text))] mb-1">Income Categories</h2>
                    <p className="text-xs text-[hsl(var(--text-muted))] mb-4">Total: {formatCurrency(totalIncome)}</p>
                    {catIncome.length > 0 ? (
                      <div className="space-y-3">
                        {catIncome.map(c => (
                          <div key={c.category_id}>
                            <div className="flex items-center justify-between text-sm mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${c.category_color}20`, color: c.category_color }}>
                                  <CategoryIcon icon={c.category_icon} size={13} />
                                </span>
                                <span className="text-[hsl(var(--text))]">{c.category_name}</span>
                                <span className="text-xs text-[hsl(var(--text-muted))]">×{c.count}</span>
                              </div>
                              <span className="font-semibold tabular-nums amount-positive">{formatCurrency(c.amount)}</span>
                            </div>
                            <div className="h-1.5 bg-[hsl(var(--border))] rounded-full">
                              <div className="h-full rounded-full" style={{ width: `${totalIncome > 0 ? (c.amount / totalIncome) * 100 : 0}%`, backgroundColor: c.category_color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-[hsl(var(--text-muted))] text-center py-8">No income data</p>}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
