'use client';

import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { adminBtnPrimaryClass, adminInputClass } from './admin-ui';

export function AdminLogin() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: login.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'Login failed');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px] rounded-2xl border border-zinc-200/90 bg-white/90 p-8 shadow-xl shadow-zinc-950/10 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95 dark:shadow-black/40">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 dark:bg-indigo-500">
            <Lock className="h-6 w-6" strokeWidth={2} aria-hidden />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Voice Inbox AI
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Sign in with your administrator credentials
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label
              htmlFor="login"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Login
            </label>
            <input
              id="login"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className={adminInputClass}
              placeholder="Admin login"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={adminInputClass}
              placeholder="Password"
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/50 dark:text-red-200"
              role="alert"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className={`${adminBtnPrimaryClass} w-full py-2.5`}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
