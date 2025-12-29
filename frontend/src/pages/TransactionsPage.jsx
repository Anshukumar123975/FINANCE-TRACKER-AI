import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';
import Tesseract from 'tesseract.js';

const PAGE_SIZE = 10;

export default function TransactionsPage({ token }) {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ search: '', type: '', startDate: '', endDate: '' });
  const [form, setForm] = useState({ amount: '', type: 'expense', category_id: '', merchant: '', description: '', date: '' });
  const [csvText, setCsvText] = useState('');
  const [ocrPreview, setOcrPreview] = useState(null);
  const [ocrExtract, setOcrExtract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadTransactions(pageNum = 1) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(pageNum), pageSize: String(PAGE_SIZE) });
      if (filters.search) params.set('search', filters.search);
      if (filters.type) params.set('type', filters.type);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      const res = await apiRequest(`/transactions?${params.toString()}`, { token });
      setTransactions(res.items);
      setTotalPages(res.pagination.totalPages || 1);
      setPage(pageNum);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions(1);
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCategories() {
    try {
      const res = await apiRequest('/categories', { token });
      setCategories(res.items || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      const body = {
        ...form,
        amount: Number(form.amount),
        category_id: form.category_id ? Number(form.category_id) : null,
        date: form.date || new Date().toISOString().slice(0, 10),
      };
      await apiRequest('/transactions', { method: 'POST', body, token });
      setForm({ amount: '', type: 'expense', category_id: '', merchant: '', description: '', date: '' });
      loadTransactions(page);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await apiRequest(`/transactions/${id}`, { method: 'DELETE', token });
      loadTransactions(page);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleImportCsv(e) {
    e.preventDefault();
    if (!csvText.trim()) return;
    setError('');
    try {
      await apiRequest('/transactions/import', { method: 'POST', body: { csv: csvText }, token });
      setCsvText('');
      loadTransactions(1);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReceiptChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setOcrPreview(url);
    setOcrExtract(null);
    try {
      const result = await Tesseract.recognize(file, 'eng');
      const text = result.data.text || '';
      const amountMatch = text.match(/(?:₹|Rs\.?|INR)?\s*([0-9]+(?:\.[0-9]{1,2})?)/);
      const dateMatch = text.match(/(\d{4}[-\/.]\d{2}[-\/.]\d{2}|\d{2}[-\/.]\d{2}[-\/.]\d{4})/);
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const merchant = lines[0] || '';
      const extracted = {
        merchant,
        amount: amountMatch ? amountMatch[1] : '',
        date: dateMatch ? dateMatch[1].replace(/[.]/g, '-').slice(0, 10) : '',
      };
      setOcrExtract(extracted);
      setForm((prev) => ({
        ...prev,
        merchant: extracted.merchant || prev.merchant,
        amount: extracted.amount || prev.amount,
        date: extracted.date || prev.date,
      }));
    } catch (err) {
      setError('OCR failed: ' + err.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-3xl font-display font-bold gradient-text mb-1">Transactions</h2>
          <p className="text-sm text-slate-400">
            Add new transactions, filter history, import CSV statements, and scan receipts.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 glass-effect px-4 py-2 rounded-lg">{error}</p>}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-effect-strong rounded-2xl p-5 text-sm">
            <h3 className="text-base font-display font-semibold text-slate-200 mb-4">Add Transaction</h3>
            <form className="flex flex-wrap gap-3 items-end" onSubmit={handleCreate}>
              <div className="flex-1 min-w-[100px]">
                <label className="block text-slate-300 mb-2 text-xs font-medium">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full rounded-lg glass-effect px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
              </div>
              <div className="w-32">
                <label className="block text-slate-300 mb-2 text-xs font-medium">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-lg glass-effect px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-slate-300 mb-2 text-xs font-medium">Category</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full rounded-lg glass-effect px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                >
                  <option value="">None (Auto-detect)</option>
                  {categories
                    .filter(c => c.type === form.type)
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-slate-300 mb-2 text-xs font-medium">Merchant</label>
                <input
                  value={form.merchant}
                  onChange={(e) => setForm({ ...form, merchant: e.target.value })}
                  className="w-full rounded-lg glass-effect px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-slate-300 mb-2 text-xs font-medium">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg glass-effect px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
              </div>
              <div className="w-36">
                <label className="block text-slate-300 mb-2 text-xs font-medium">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-lg glass-effect px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg gradient-accent text-slate-950 font-semibold text-sm transition-all duration-200 transform hover:scale-105"
              >
                Add Transaction
              </button>
            </form>
          </div>

          <div className="glass-effect-strong rounded-2xl p-5 text-sm">
            <h3 className="text-base font-display font-semibold text-slate-200 mb-4">Transaction History</h3>
            <div className="flex flex-wrap gap-3 mb-4">
              <input
                placeholder="Search merchant or description"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="flex-1 min-w-[140px] rounded-lg glass-effect px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              />
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-32 rounded-lg glass-effect px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              >
                <option value="">All types</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-36 rounded-lg glass-effect px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-36 rounded-lg glass-effect px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              />
              <button
                onClick={() => loadTransactions(1)}
                className="px-4 py-2 rounded-lg glass-effect-strong text-slate-100 hover:bg-white/20 transition-all duration-200"
              >
                Apply
              </button>
            </div>
            <div className="overflow-x-auto glass-effect rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-display font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-display font-semibold">Merchant</th>
                    <th className="px-4 py-3 text-left font-display font-semibold">Description</th>
                    <th className="px-4 py-3 text-right font-display font-semibold">Amount</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-300">{t.date}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-200">{t.merchant || '-'}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-slate-300">
                        {t.description || '-'}
                      </td>
                      <td
                        className={`px-4 py-3 text-right whitespace-nowrap font-display font-semibold ${
                          t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {t.type === 'income' ? '+' : '-'}₹{Number(t.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-xs text-slate-400 hover:text-red-400 transition-colors duration-200"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm text-slate-300">
              <span className="font-medium">
                Page {page} of {totalPages}
              </span>
              <div className="space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => loadTransactions(page - 1)}
                  className="px-4 py-2 rounded-lg glass-effect disabled:opacity-40 hover:bg-white/10 transition-all duration-200"
                >
                  Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => loadTransactions(page + 1)}
                  className="px-4 py-2 rounded-lg glass-effect disabled:opacity-40 hover:bg-white/10 transition-all duration-200"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-effect-strong rounded-2xl p-5 text-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="font-display font-semibold text-slate-200">Bank statement CSV import</span>
            </div>
            <p className="text-slate-400 mb-3 text-xs">
              Paste CSV text with at least <code className="px-1.5 py-0.5 bg-white/10 rounded text-emerald-400">date</code> and <code className="px-1.5 py-0.5 bg-white/10 rounded text-emerald-400">amount</code> columns.
            </p>
            <form onSubmit={handleImportCsv} className="space-y-3">
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full rounded-lg glass-effect px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              />
              <button
                type="submit"
                className="w-full px-4 py-2.5 rounded-lg glass-effect-strong text-slate-100 hover:bg-white/20 transition-all duration-200 font-medium"
              >
                Import CSV
              </button>
            </form>
          </div>

          <div className="glass-effect-strong rounded-2xl p-5 text-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="font-display font-semibold text-slate-200">Receipt scanner (OCR)</span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleReceiptChange}
              className="text-sm mb-3 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:gradient-accent file:text-slate-950 file:cursor-pointer file:transition-all"
            />
            {ocrPreview && (
              <img
                src={ocrPreview}
                alt="Receipt preview"
                className="w-full max-h-40 object-contain rounded-lg glass-effect p-2 mb-3"
              />
            )}
            {ocrExtract && (
              <div className="glass-effect rounded-lg p-3 text-sm space-y-2">
                <div className="text-slate-200 font-display font-semibold">Extracted details</div>
                <div className="text-slate-300">Merchant: <span className="text-emerald-400">{ocrExtract.merchant || '-'}</span></div>
                <div className="text-slate-300">Amount: <span className="text-emerald-400">{ocrExtract.amount || '-'}</span></div>
                <div className="text-slate-300">Date: <span className="text-emerald-400">{ocrExtract.date || '-'}</span></div>
                <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-white/10">
                  These values have been pre-filled in the add transaction form. Review before
                  saving.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
