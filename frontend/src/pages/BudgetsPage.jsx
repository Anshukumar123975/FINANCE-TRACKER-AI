import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';

export default function BudgetsPage({ token }) {
  const [budgets, setBudgets] = useState([]);
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({ category_name: '', monthly_limit: '' });
  const [error, setError] = useState('');

  async function load() {
    try {
      setError('');
      const [budgetsRes, statusRes] = await Promise.all([
        apiRequest('/budgets', { token }),
        apiRequest('/budgets/status/current', { token }),
      ]);
      setBudgets(budgetsRes.items || []);
      setStatus(statusRes);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.category_name || !form.monthly_limit) return;
    try {
      setError('');
      const body = {
        category_name: form.category_name,
        monthly_limit: Number(form.monthly_limit),
      };
      // Use AI tool-compatible endpoint via /api/chat tools on backend, but also create direct budget
      await apiRequest('/budgets', {
        method: 'POST',
        body: {
          category_id: null,
          monthly_limit: body.monthly_limit,
          month: new Date().toISOString().slice(0, 7),
        },
        token,
      });
      setForm({ category_name: '', monthly_limit: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this budget?')) return;
    try {
      await apiRequest(`/budgets/${id}`, { method: 'DELETE', token });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-3xl font-display font-bold gradient-text mb-1">Budgets</h2>
          <p className="text-sm text-slate-400">
            Track spending against monthly limits and watch color-coded alerts as you approach.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 glass-effect px-4 py-2 rounded-lg">{error}</p>}

      <div className="grid md:grid-cols-3 gap-5">
        <div className="md:col-span-2 glass-effect-strong rounded-2xl p-5 text-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base font-display font-semibold text-slate-200">Current Budgets</span>
          </div>
          <div className="space-y-4">
            {status?.items?.length === 0 && (
              <p className="text-slate-400">No budgets yet. Add one using the form.</p>
            )}
            {status?.items?.map((b) => (
              <BudgetRow key={b.id} budget={b} onDelete={() => handleDelete(b.id)} />
            ))}
          </div>
        </div>
        <div className="glass-effect-strong rounded-2xl p-5 text-sm">
          <div className="text-base font-display font-semibold text-slate-200 mb-4">New Budget</div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-slate-300 mb-2 text-xs font-medium">Category (label)</label>
              <input
                value={form.category_name}
                onChange={(e) => setForm({ ...form, category_name: e.target.value })}
                className="w-full rounded-lg glass-effect px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                placeholder="e.g., Groceries, Entertainment"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-2 text-xs font-medium">Monthly Limit</label>
              <input
                type="number"
                step="0.01"
                value={form.monthly_limit}
                onChange={(e) => setForm({ ...form, monthly_limit: e.target.value })}
                className="w-full rounded-lg glass-effect px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                placeholder="Enter amount"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-lg gradient-accent-purple text-slate-50 text-sm font-semibold transition-all duration-200 transform hover:scale-105"
            >
              Save Budget
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function BudgetRow({ budget, onDelete }) {
  const utilization = budget.utilization || 0;
  const pct = Math.min(100, Math.round(utilization * 100));
  const color =
    budget.status === 'red'
      ? 'bg-gradient-to-r from-rose-500 to-rose-600'
      : budget.status === 'yellow'
      ? 'bg-gradient-to-r from-amber-400 to-amber-500'
      : 'bg-gradient-to-r from-emerald-500 to-emerald-600';

  return (
    <div className="glass-effect rounded-xl p-4 hover:bg-white/10 transition-all duration-200">
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="font-medium text-slate-200">{budget.category_name || 'All expenses'}</span>
        <span className="text-slate-400 font-display text-xs">
          ₹{Number(budget.spent || 0).toFixed(0)} / ₹{Number(budget.monthly_limit).toFixed(0)} ({
            pct
          }%)
        </span>
      </div>
      <div className="h-3 rounded-full bg-white/5 overflow-hidden shadow-inner mb-3">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-end">
        <button
          onClick={onDelete}
          className="text-xs text-slate-400 hover:text-red-400 transition-colors duration-200 font-medium"
        >
          Delete Budget
        </button>
      </div>
    </div>
  );
}
