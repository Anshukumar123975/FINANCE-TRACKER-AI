import React, { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api.js';
import { BotMessageSquare, Send } from 'lucide-react';

export default function ChatPage({ token }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi! I am your finance agent. You can say things like "I spent 450 on Swiggy", "How much did I spend on groceries last month?", or "Help me save 50000 by June".',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e) {
    e?.preventDefault();
    if (!input.trim()) return;
    const content = input.trim();
    setInput('');
    setError('');
    const userMsg = { id: Date.now() + '-u', role: 'user', content };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await apiRequest('/chat', { method: 'POST', body: { message: content }, token });
      const assistantMsg = {
        id: Date.now() + '-a',
        role: 'assistant',
        content: res.message,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-6rem)]">
      <div className="mb-5">
        <h2 className="text-3xl font-display font-bold flex items-center gap-3">
          <div className="p-2 rounded-xl gradient-accent-purple">
            <BotMessageSquare className="w-6 h-6 text-slate-950" />
          </div>
          <span className="gradient-text">AI Assistant</span>
        </h2>
        <p className="text-sm text-slate-400 mt-2 ml-14">
          Natural language interface to your finances with tool calling and autonomous actions.
        </p>
      </div>
      {error && <p className="text-sm text-red-400 glass-effect px-4 py-2 rounded-lg mb-3">{error}</p>}
      <div className="flex-1 min-h-[300px] glass-effect-strong rounded-2xl p-5 flex flex-col overflow-y-auto gap-3 text-sm">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap transition-all duration-200 ${
              m.role === 'assistant'
                ? 'glass-effect-strong text-slate-100 self-start border-l-4 border-emerald-400'
                : 'gradient-accent text-slate-950 font-medium self-end'
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span>Agent is thinking and calling tools...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={sendMessage} className="mt-4 flex gap-3 text-sm">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your spending, budgets, or goals..."
          className="flex-1 rounded-xl glass-effect-strong px-5 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-xl gradient-accent text-slate-950 text-sm font-semibold flex items-center gap-2 disabled:opacity-60 transition-all duration-200 transform hover:scale-105"
        >
          <Send className="w-4 h-4" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
