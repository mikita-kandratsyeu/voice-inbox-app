'use client';

import { Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { AppEnv } from '@/lib/app-env';

import { AdminAppEnvChip } from './AdminAppEnvChip';
import { adminBtnPrimaryClass, adminInputClass, AdminAlert } from './admin-ui';

export function AdminLogin({ appEnv }: { appEnv: AppEnv }) {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const inputWithIconClass = `${adminInputClass} pl-10`;
  const inputAffixClass =
    'absolute top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 dark:text-zinc-300';
  const inputLeadingAffixClass = `${inputAffixClass} pointer-events-none left-2`;
  const inputTrailingAffixClass = `${inputAffixClass} right-2 transition-colors hover:bg-zinc-100 hover:text-zinc-600 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none dark:hover:bg-zinc-800 dark:hover:text-zinc-100`;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-blue-500/14 blur-3xl dark:bg-blue-500/20" />
        <div className="absolute -right-20 top-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/18" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-violet-400/8 blur-3xl dark:bg-violet-500/12" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.12),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.025)_1px,transparent_1px)] bg-size-[40px_40px] mask-[radial-gradient(ellipse_at_center,black_20%,transparent_75%)] dark:bg-[linear-gradient(to_right,rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.04)_1px,transparent_1px)]" />
      </div>

      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-[420px]">
        <div className="absolute -inset-px rounded-[1.35rem] bg-linear-to-b from-indigo-500/25 via-blue-500/10 to-transparent opacity-80 dark:from-indigo-400/30 dark:via-indigo-500/10" />
        <div className="relative overflow-hidden rounded-[1.3rem] border border-zinc-200/80 bg-white/85 p-8 shadow-2xl shadow-zinc-950/8 ring-1 ring-white/60 backdrop-blur-xl dark:border-zinc-700/80 dark:bg-zinc-900/80 dark:shadow-black/50 dark:ring-white/5">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-indigo-500/50 to-transparent"
            aria-hidden
          />

          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/8 px-3 py-1 text-[11px] font-semibold tracking-wide text-indigo-700 uppercase dark:border-indigo-400/25 dark:bg-indigo-500/12 dark:text-indigo-300">
                <Lock className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                Admin panel
              </p>
              <AdminAppEnvChip env={appEnv} />
            </div>
            <Image
              src="/app-icon.svg"
              alt=""
              width={56}
              height={56}
              className="mb-4 h-14 w-14 rounded-2xl shadow-[0_10px_28px_rgba(59,130,246,0.35)] ring-1 ring-black/5 dark:shadow-[0_10px_28px_rgba(59,130,246,0.25)] dark:ring-white/10"
              priority
            />
            <h1 className="hero-headline-gradient text-2xl font-bold tracking-tight">
              Voice Inbox AI
            </h1>
            <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Sign in with your administrator credentials
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="login"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Login
              </label>
              <div className="relative">
                <span className={inputLeadingAffixClass} aria-hidden>
                  <User className="h-4 w-4" strokeWidth={2} />
                </span>
                <input
                  id="login"
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className={inputWithIconClass}
                  placeholder="Admin login"
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Password
              </label>
              <div className="relative">
                <span className={inputLeadingAffixClass} aria-hidden>
                  <Lock className="h-4 w-4" strokeWidth={2} />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputWithIconClass} pr-10`}
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className={inputTrailingAffixClass}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={2} aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={2} aria-hidden />
                  )}
                </button>
              </div>
            </div>

            {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}

            <button
              type="submit"
              disabled={loading}
              className={`${adminBtnPrimaryClass} mt-1 w-full py-2.5 shadow-md shadow-indigo-600/20 transition-all hover:shadow-lg hover:shadow-indigo-600/25 disabled:shadow-none dark:shadow-indigo-500/15 dark:hover:shadow-indigo-500/20`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
            Restricted access · Authorized personnel only
          </p>
        </div>
      </div>
    </div>
  );
}
