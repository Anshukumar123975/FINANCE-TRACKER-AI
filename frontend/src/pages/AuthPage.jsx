import React, { useState } from 'react';
import { apiRequest } from '../api.js';
import { BarChart3 } from 'lucide-react';

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const res = await apiRequest(path, { method: 'POST', body: { email, password } });
      onAuth(res.token, res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-6 h-6 text-emerald-500" />
          <div>
            <h1 className="text-lg font-semibold">Finance Tracker AI</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Track, analyze, and chat with your finances.</p>
          </div>
        </div>
        <div className="flex gap-2 text-xs mb-4">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-md border text-center ${
              mode === 'login'
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-md border text-center ${
              mode === 'register'
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Register
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="block text-slate-600 dark:text-slate-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-slate-600 dark:text-slate-300">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-md bg-emerald-500 text-slate-950 font-medium text-xs hover:bg-emerald-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
