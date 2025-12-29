import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';

export default function GoalsPage({ token }) {
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState({ name: '', target_amount: '', target_date: '' });
  const [error, setError] = useState('');

  async function load() {
    try {
      setError('');
      const res = await apiRequest('/goals', { token });
      setGoals(res.items || []);
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
    try {
      setError('');
      await apiRequest('/goals', {
        method: 'POST',
        body: {
          name: form.name,
          target_amount: Number(form.target_amount),
          target_date: form.target_date,
        },
        token,
      });
      setForm({ name: '', target_amount: '', target_date: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateProgress(goal, amountDelta) {
    try {
      await apiRequest(`/goals/${goal.id}`, {
        method: 'PUT',
        body: { current_amount: Number(goal.current_amount || 0) + amountDelta },
        token,
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-3xl font-display font-bold gradient-text mb-1">Savings Goals</h2>
          <p className="text-sm text-slate-400">
            Set targets like "Save 50000 by June" and track progress visually.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 glass-effect px-4 py-2 rounded-lg">{error}</p>}

      <div className="grid md:grid-cols-3 gap-5">
        <div className="md:col-span-2 glass-effect-strong rounded-2xl p-5 text-sm space-y-4">
          {goals.length === 0 && <p className="text-slate-400">No goals yet. Create your first savings goal!</p>}
          {goals.map((g) => (
            <GoalRow key={g.id} goal={g} onUpdateProgress={handleUpdateProgress} />
          ))}
        </div>
        <div className="glass-effect-strong rounded-2xl p-5 text-sm">
          <div className="text-base font-display font-semibold text-slate-200 mb-4">New Goal</div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-slate-300 mb-2 text-xs font-medium">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg glass-effect px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                placeholder="e.g., Vacation Fund"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-2 text-xs font-medium">Target Amount</label>
              <input
                type="number"
                value={form.target_amount}
                onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                className="w-full rounded-lg glass-effect px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                placeholder="Enter target amount"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-2 text-xs font-medium">Target Date</label>
              <input
                type="date"
                value={form.target_date}
                onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                className="w-full rounded-lg glass-effect px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-lg gradient-accent-purple text-slate-50 text-sm font-semibold transition-all duration-200 transform hover:scale-105"
            >
              Save Goal
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function GoalRow({ goal, onUpdateProgress }) {
  const target = Number(goal.target_amount || 0);
  const current = Number(goal.current_amount || 0);
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <div className="glass-effect rounded-xl p-4 hover:bg-white/10 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="font-display font-semibold text-slate-100 text-base mb-1">{goal.name}</div>
          <div className="text-slate-400 text-xs">
            ₹{current.toFixed(0)} / ₹{target.toFixed(0)} ({pct}%) • Target {goal.target_date}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onUpdateProgress(goal, 1000)}
            className="px-3 py-2 text-xs rounded-lg glass-effect-strong hover:bg-white/20 transition-all duration-200 font-medium"
          >
            +₹1k
          </button>
          <button
            onClick={() => onUpdateProgress(goal, 5000)}
            className="px-3 py-2 text-xs rounded-lg glass-effect-strong hover:bg-white/20 transition-all duration-200 font-medium"
          >
            +₹5k
          </button>
        </div>
      </div>
      <div className="h-3 rounded-full bg-white/5 overflow-hidden shadow-inner">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500" 
          style={{ width: `${pct}%` }} 
        />
      </div>
    </div>
  );
}
