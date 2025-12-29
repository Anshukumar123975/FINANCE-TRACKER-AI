import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const PIE_COLORS = ['#22c55e', '#38bdf8', '#f97316', '#e11d48', '#a855f7', '#facc15'];

export default function DashboardPage({ token }) {
  const [summary, setSummary] = useState(null);
  const [budgetStatus, setBudgetStatus] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        const [summaryRes, budgetRes, recentRes] = await Promise.all([
          apiRequest('/analytics/summary', { token }),
          apiRequest('/budgets/status/current', { token }),
          apiRequest('/transactions?page=1&pageSize=5', { token }),
        ]);
        if (!isMounted) return;
        setSummary(summaryRes);
        setBudgetStatus(budgetRes);
        setRecent(recentRes.items || []);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-3xl font-display font-bold gradient-text mb-1">Dashboard</h2>
          <p className="text-sm text-slate-400">Overview of your income, spending, and budgets.</p>
        </div>
      </div>
      {error && <p className="text-sm text-red-400 glass-effect px-4 py-2 rounded-lg">{error}</p>}
      {loading && <p className="text-sm text-slate-400 glass-effect px-4 py-2 rounded-lg animate-pulse">Loading...</p>}
      {summary && (
        <div className="grid md:grid-cols-3 gap-4">
          <StatCard
            label="Income"
            value={summary.total_income}
            prefix="₹"
            className="border-emerald-500/30"
            gradient="from-emerald-500/20 to-emerald-600/10"
          />
          <StatCard
            label="Expenses"
            value={summary.total_expense}
            prefix="₹"
            className="border-rose-500/30"
            gradient="from-rose-500/20 to-rose-600/10"
          />
          <StatCard
            label="Net"
            value={summary.total_income - summary.total_expense}
            prefix="₹"
            className="border-cyan-500/30"
            gradient="from-cyan-500/20 to-cyan-600/10"
          />
        </div>
      )}

        <div className="grid lg:grid-cols-3 gap-5">
        <div className="glass-effect-strong rounded-2xl p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base font-display font-semibold text-slate-200">Income vs Expenses</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary?.trends || []} margin={{ left: -20 }}>
                <XAxis dataKey="date" hide tick={{ fontSize: 10 }} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    fontSize: 12, 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    backdropFilter: 'blur(10px)'
                  }} 
                />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="expense" stroke="#f97316" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-effect-strong rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base font-display font-semibold text-slate-200">Spending by Category</span>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary?.categories || []}
                  dataKey="total"
                  nameKey="category"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {(summary?.categories || []).map((entry, index) => (
                    <Cell key={entry.category} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    fontSize: 12, 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {budgetStatus && (
        <div className="glass-effect-strong rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base font-display font-semibold text-slate-200">Budget Progress</span>
            <span className="text-xs text-slate-400 font-medium">{budgetStatus.month}</span>
          </div>
          <div className="space-y-3">
            {budgetStatus.items.length === 0 && (
              <p className="text-sm text-slate-400">No budgets yet. Create one in the Budgets tab.</p>
            )}
            {budgetStatus.items.map((b) => (
              <BudgetBar key={b.id} budget={b} />
            ))}
          </div>
        </div>
      )}

      <div className="glass-effect-strong rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-base font-display font-semibold text-slate-200">Recent Transactions</span>
        </div>
        <div className="space-y-2 text-sm">
          {recent.length === 0 && <p className="text-slate-400">No transactions yet.</p>}
          {recent.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between py-3 px-4 glass-effect rounded-xl hover:bg-white/10 transition-all duration-200"
            >
              <div className="flex flex-col">
                <span className="font-medium text-slate-100">
                  {t.merchant || t.description || (t.type === 'income' ? 'Income' : 'Expense')}
                </span>
                <span className="text-xs text-slate-400 mt-0.5">{t.date}</span>
              </div>
              <div className="text-right">
                <span
                  className={`font-display font-semibold text-sm ${
                    t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {t.type === 'income' ? '+' : '-'}₹{Number(t.amount).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, prefix = '', className = '', gradient = '' }) {
  return (
    <div className={`glass-effect-strong rounded-2xl p-5 border relative overflow-hidden ${className}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`}></div>
      <div className="relative z-10">
        <div className="text-slate-400 text-sm font-medium mb-2">{label}</div>
        <div className="text-3xl font-display font-bold text-slate-50">
          {prefix}
          {Number(value || 0).toFixed(2)}
        </div>
      </div>
    </div>
  );
}

function BudgetBar({ budget }) {
  const utilization = budget.utilization || 0;
  const pct = Math.min(100, Math.round(utilization * 100));
  const color =
    budget.status === 'red'
      ? 'bg-gradient-to-r from-rose-500 to-rose-600'
      : budget.status === 'yellow'
      ? 'bg-gradient-to-r from-amber-400 to-amber-500'
      : 'bg-gradient-to-r from-emerald-500 to-emerald-600';

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-slate-200">{budget.category_name || 'All expenses'}</span>
        <span className="text-slate-400 font-display text-xs">
          ₹{Number(budget.spent || 0).toFixed(0)} / ₹{Number(budget.monthly_limit).toFixed(0)} ({
            pct
          }%)
        </span>
      </div>
      <div className="h-3 rounded-full bg-white/5 overflow-hidden shadow-inner">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
