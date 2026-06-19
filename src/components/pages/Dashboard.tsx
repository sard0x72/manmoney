import { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank, Plus, ArrowLeftRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { formatCurrency, formatDateShort, healthScore, getScoreColor, getScoreLabel, getMonthDateRange, currentYear, currentMonth } from '../../lib/utils';
import { StatCard } from '../ui/StatCard';
import { CategoryIcon } from '../ui/CategoryIcon';
import type { DailySpending, SpendingByCategory } from '../../types';

export function Dashboard() {
  const { dashboard, transactions, fetchDashboard, fetchTransactions, setPage } = useAppStore();
  const [daily, setDaily] = useState<DailySpending[]>([]);
  const [byCat, setByCat] = useState<SpendingByCategory[]>([]);

  useEffect(() => {
    fetchDashboard();
    fetchTransactions({ limit: 5 });
    const { from, to } = getMonthDateRange(currentYear(), currentMonth());
    api.analytics.daily(from, to).then(setDaily);
    api.analytics.byCategory(from, to, 'expense').then(d => setByCat(d.slice(0, 5)));
  }, []);

  const d = dashboard;
  const score = d ? healthScore(d.month_income, d.month_expenses, d.month_budget_total, d.month_budget_spent) : 0;
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);

  const recent = transactions.slice(0, 5);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-[hsl(var(--text))]">Dashboard</h1>
          <p className="text-sm text-[hsl(var(--text-muted))] mt-0.5">
            {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPage('transactions')} className="btn-secondary gap-1.5">
            <Plus size={15} />
            Add Transaction
          </button>
        </div>
      </div>

      <div className="page-content space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Balance"
            value={formatCurrency(d?.total_balance ?? 0)}
            icon={<Wallet size={18} />}
            accent="#6174f5"
            sub="across all accounts"
          />
          <StatCard
            label="Month Income"
            value={formatCurrency(d?.month_income ?? 0)}
            icon={<TrendingUp size={18} />}
            accent="#22c55e"
            trend="up"
          />
          <StatCard
            label="Month Expenses"
            value={formatCurrency(d?.month_expenses ?? 0)}
            icon={<TrendingDown size={18} />}
            accent="#ef4444"
          />
          <StatCard
            label="Month Savings"
            value={formatCurrency(d?.month_savings ?? 0)}
            icon={<PiggyBank size={18} />}
            accent="#a855f7"
          />
        </div>

        {/* Middle row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Spending chart */}
          <div className="col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[hsl(var(--text))]">Daily Cash Flow</h2>
              <span className="text-xs text-[hsl(var(--text-muted))]">This month</span>
            </div>
            {daily.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={daily} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickFormatter={formatDateShort} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} tickFormatter={v => `$${v}`} width={48} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="income" stroke="#22c55e" fill="url(#incGrad)" strokeWidth={2} name="Income" dot={false} />
                  <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} name="Expenses" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-sm text-[hsl(var(--text-muted))]">
                No transactions this month
              </div>
            )}
          </div>

          {/* Health score + budget */}
          <div className="card p-5 flex flex-col gap-4">
            {/* Financial health */}
            <div>
              <p className="label mb-3">Financial Health</p>
              <div className="flex items-center justify-center">
                <div className="relative w-24 h-24">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke={scoreColor}
                      strokeWidth="10"
                      strokeDasharray={`${score * 2.51} 251`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold" style={{ color: scoreColor }}>{score}</span>
                    <span className="text-[10px] text-[hsl(var(--text-muted))]">/100</span>
                  </div>
                </div>
              </div>
              <p className="text-center text-sm font-medium mt-2" style={{ color: scoreColor }}>{scoreLabel}</p>
            </div>

            {/* Budget */}
            {d && d.month_budget_total > 0 && (
              <div>
                <p className="label mb-2">Budget Used</p>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-[hsl(var(--text-muted))]">{formatCurrency(d.month_budget_spent)}</span>
                  <span className="font-medium">{formatCurrency(d.month_budget_total)}</span>
                </div>
                <div className="h-2 bg-[hsl(var(--border))] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (d.month_budget_spent / d.month_budget_total) * 100)}%`,
                      backgroundColor: d.month_budget_spent > d.month_budget_total ? '#ef4444' : '#6174f5',
                    }}
                  />
                </div>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
                  {Math.round((d.month_budget_spent / d.month_budget_total) * 100)}% of budget used
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Top spending categories */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[hsl(var(--text))]">Top Spending</h2>
              <button onClick={() => setPage('analytics')} className="text-xs text-brand-500 hover:text-brand-600 font-medium">View all</button>
            </div>
            {byCat.length > 0 ? (
              <div className="space-y-3">
                {byCat.map(cat => {
                  const maxAmount = byCat[0].amount;
                  const pct = maxAmount > 0 ? (cat.amount / maxAmount) * 100 : 0;
                  return (
                    <div key={cat.category_id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cat.category_color}20`, color: cat.category_color }}>
                            <CategoryIcon icon={cat.category_icon} size={12} />
                          </span>
                          <span className="text-[hsl(var(--text))] font-medium">{cat.category_name}</span>
                        </div>
                        <span className="text-[hsl(var(--text-muted))] tabular-nums">{formatCurrency(cat.amount)}</span>
                      </div>
                      <div className="h-1.5 bg-[hsl(var(--border))] rounded-full">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.category_color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[hsl(var(--text-muted))] text-center py-8">No expenses this month</p>
            )}
          </div>

          {/* Recent transactions */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[hsl(var(--text))]">Recent Transactions</h2>
              <button onClick={() => setPage('transactions')} className="text-xs text-brand-500 hover:text-brand-600 font-medium">View all</button>
            </div>
            {recent.length > 0 ? (
              <div className="space-y-2">
                {recent.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))] last:border-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${t.category_color}20`, color: t.category_color }}
                      >
                        <CategoryIcon icon={t.category_icon ?? 'tag'} size={14} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[hsl(var(--text))] truncate">{t.payee || t.category_name}</p>
                        <p className="text-xs text-[hsl(var(--text-muted))]">{formatDateShort(t.date)}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${t.transaction_type === 'income' ? 'amount-positive' : 'amount-negative'}`}>
                      {t.transaction_type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <ArrowLeftRight size={24} className="text-[hsl(var(--text-muted))] mb-2" />
                <p className="text-sm text-[hsl(var(--text-muted))]">No transactions yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Accounts row */}
        {d && d.accounts.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[hsl(var(--text))]">Accounts</h2>
              <button onClick={() => setPage('accounts')} className="text-xs text-brand-500 hover:text-brand-600 font-medium">Manage</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {d.accounts.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--bg))] border border-[hsl(var(--border))]">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${a.color}20` }}>
                    <Wallet size={16} style={{ color: a.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-[hsl(var(--text-muted))] capitalize">{a.account_type}</p>
                    <p className="text-sm font-semibold text-[hsl(var(--text))] truncate">{a.name}</p>
                    <p className="text-xs font-medium tabular-nums" style={{ color: a.balance >= 0 ? '#22c55e' : '#ef4444' }}>
                      {formatCurrency(a.balance, a.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
