import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { BarChart3, CreditCard, PieChart, Goal, CalendarDays, BotMessageSquare, Sun, Moon } from 'lucide-react';
import { apiRequest } from './api.js';
import DashboardPage from './pages/DashboardPage.jsx';
import TransactionsPage from './pages/TransactionsPage.jsx';
import BudgetsPage from './pages/BudgetsPage.jsx';
import BillsPage from './pages/BillsPage.jsx';
import GoalsPage from './pages/GoalsPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import AuthPage from './pages/AuthPage.jsx';

function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return { theme, setTheme };
}

function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!token) return;
    apiRequest('/auth/me', { token })
      .then((res) => setUser(res.user))
      .catch(() => {
        setToken(null);
        localStorage.removeItem('token');
      });
  }, [token]);

  function login(tokenValue, user) {
    setToken(tokenValue);
    setUser(user);
    localStorage.setItem('token', tokenValue);
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  }

  return { token, user, login, logout };
}

function AppShell({ children, user, onLogout, theme, onToggleTheme }) {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <aside className="w-72 glass-effect border-r border-white/10 hidden md:flex flex-col">
        <div className="p-6 font-display font-bold text-xl flex items-center gap-3 border-b border-white/10">
          <div className="p-2.5 rounded-xl gradient-accent flex-shrink-0">
            <BarChart3 className="w-6 h-6 text-slate-950" />
          </div>
          <span className="gradient-text whitespace-nowrap">Finance Tracker AI</span>
        </div>
        <nav className="flex-1 p-6 space-y-4 text-base">
          <NavLink to="/dashboard" icon={BarChart3} label="Dashboard" />
          <NavLink to="/transactions" icon={CreditCard} label="Transactions" />
          <NavLink to="/budgets" icon={PieChart} label="Budgets" />
          <NavLink to="/bills" icon={CalendarDays} label="Bills" />
          <NavLink to="/goals" icon={Goal} label="Goals" />
          <NavLink to="/chat" icon={BotMessageSquare} label="AI Assistant" />
        </nav>
        <div className="p-6 border-t border-white/10 text-sm flex items-center justify-between glass-effect-strong">
          <span className="text-slate-300 truncate font-medium">{user?.email}</span>
          <button
            onClick={onLogout}
            className="text-slate-400 hover:text-red-400 transition-colors text-xs font-medium ml-2"
          >
            Logout
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 glass-effect backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg gradient-accent">
              <BarChart3 className="w-4 h-4 text-slate-950" />
            </div>
            <span className="font-display font-bold text-sm gradient-text">Finance Tracker AI</span>
          </div>
          <button
            onClick={onLogout}
            className="text-slate-400 hover:text-red-400 transition-colors text-xs font-medium"
          >
            Logout
          </button>
        </header>
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200 font-medium w-full ${
          isActive
            ? 'gradient-accent text-slate-950'
            : 'text-slate-300 hover:bg-white/10 hover:text-slate-100'
        }`
      }
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm flex-shrink-0">{label}</span>
    </Link>
  );
}

function ProtectedRoute({ token, children }) {
  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}

export default function App() {
  const auth = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.logout();
    navigate('/auth');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (!auth.token) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage onAuth={auth.login} />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <AppShell user={auth.user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute token={auth.token}>
              <DashboardPage token={auth.token} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute token={auth.token}>
              <TransactionsPage token={auth.token} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/budgets"
          element={
            <ProtectedRoute token={auth.token}>
              <BudgetsPage token={auth.token} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bills"
          element={
            <ProtectedRoute token={auth.token}>
              <BillsPage token={auth.token} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/goals"
          element={
            <ProtectedRoute token={auth.token}>
              <GoalsPage token={auth.token} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute token={auth.token}>
              <ChatPage token={auth.token} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}
