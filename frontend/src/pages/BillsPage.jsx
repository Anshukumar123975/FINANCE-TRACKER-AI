import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';

export default function BillsPage({ token }) {
  const [bills, setBills] = useState([]);
  const [form, setForm] = useState({ name: '', amount: '', due_date: '', is_recurring: false });
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [error, setError] = useState('');

  async function load() {
    try {
      setError('');
      const res = await apiRequest(`/bills/calendar?month=${month}`, { token });
      setBills(res.items || []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      setError('');
      await apiRequest('/bills', {
        method: 'POST',
        body: {
          name: form.name,
          amount: Number(form.amount),
          due_date: form.due_date,
          is_recurring: form.is_recurring,
        },
        token,
      });
      setForm({ name: '', amount: '', due_date: '', is_recurring: false });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleTogglePaid(bill) {
    try {
      await apiRequest(`/bills/${bill.id}`, {
        method: 'PUT',
        body: { paid: !bill.paid },
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
          <h2 className="text-3xl font-display font-bold gradient-text mb-1">Bills & Reminders</h2>
          <p className="text-sm text-slate-400">
            Track upcoming bills, recurring payments, and avoid missing due dates.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 glass-effect px-4 py-2 rounded-lg">{error}</p>}

      <div className="grid md:grid-cols-3 gap-5">
        <div className="md:col-span-2 glass-effect-strong rounded-2xl p-5 text-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base font-display font-semibold text-slate-200">Calendar View</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="glass-effect rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
            />
          </div>
          <div className="space-y-3">
            {bills.length === 0 && (
              <p className="text-slate-400">No bills for this month.</p>
            )}
            {bills.map((b) => (
              <div
                key={b.id}
                className="glass-effect rounded-xl px-4 py-3 hover:bg-white/10 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-slate-100 flex items-center gap-2">
                      {b.name}
                      {b.is_recurring && (
                        <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                          Recurring
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Due {b.due_date} • ₹{Number(b.amount).toFixed(0)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleTogglePaid(b)}
                    className={`text-xs px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      b.paid
                        ? 'gradient-accent text-slate-950'
                        : 'glass-effect text-slate-200 hover:bg-white/20'
                    }`}
                  >
                    {b.paid ? '✓ Paid' : 'Mark Paid'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-effect-strong rounded-2xl p-5 text-sm">
          <div className="text-base font-display font-semibold text-slate-200 mb-4">New Bill</div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-slate-300 mb-2 text-xs font-medium">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg glass-effect px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                placeholder="e.g., Electricity Bill"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-2 text-xs font-medium">Amount</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full rounded-lg glass-effect px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-2 text-xs font-medium">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full rounded-lg glass-effect px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              />
            </div>
            <label className="flex items-center gap-3 text-slate-300 glass-effect rounded-lg px-3 py-3 cursor-pointer hover:bg-white/10 transition-all">
              <input
                type="checkbox"
                checked={form.is_recurring}
                onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
                className="w-4 h-4 rounded accent-purple-500"
              />
              <span className="text-sm">Recurring Monthly</span>
            </label>
            <button
              type="submit"
              className="w-full py-3 rounded-lg gradient-accent-purple text-slate-50 text-sm font-semibold transition-all duration-200 transform hover:scale-105"
            >
              Save Bill
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
