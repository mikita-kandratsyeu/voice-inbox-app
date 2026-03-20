'use client';

import { useCallback, useEffect, useState } from 'react';

type AccessPolicy = {
  ok: boolean;
  ipAllowlistEnabled?: boolean;
  ipAllowlistCount?: number;
  adminLoginRateLimit?: { windowSeconds: number; maxAttempts: number };
  sessionCookieMaxAgeSeconds?: number;
  adminJwtExpiresInEnv?: string;
  cookieHttpOnly?: boolean;
  cookieSameSite?: string;
  cookieSecureInProduction?: boolean;
  error?: string;
};

type AdminUserRow = {
  id: string;
  login: string;
  createdAt: string;
  isCurrent: boolean;
};

export function AdminSecurityPanel() {
  const [policy, setPolicy] = useState<AccessPolicy | null>(null);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  const [newLogin, setNewLogin] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [createSaving, setCreateSaving] = useState(false);

  const loadPolicy = useCallback(async () => {
    setPolicyLoading(true);
    try {
      const res = await fetch('/api/admin/access-policy', { credentials: 'include' });
      const data = (await res.json()) as AccessPolicy;
      setPolicy(data);
    } catch {
      setPolicy({ ok: false, error: 'Request failed' });
    } finally {
      setPolicyLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      const data = (await res.json()) as { ok?: boolean; items?: AdminUserRow[] };
      setUsers(data.ok && Array.isArray(data.items) ? data.items : []);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPolicy();
    void loadUsers();
  }, [loadPolicy, loadUsers]);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    setPwErr(null);
    setPwSaving(true);
    try {
      const res = await fetch('/api/admin/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setPwErr(data.error ?? 'Failed');
        return;
      }
      setPwMsg('Password updated. Use the new password on next login.');
      setCurrentPw('');
      setNewPw('');
    } catch {
      setPwErr('Request failed');
    } finally {
      setPwSaving(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg(null);
    setCreateErr(null);
    setCreateSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ login: newLogin.trim(), password: newUserPassword }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setCreateErr(data.error ?? 'Failed');
        return;
      }
      setCreateMsg(`Created admin “${newLogin.trim()}”.`);
      setNewLogin('');
      setNewUserPassword('');
      void loadUsers();
    } catch {
      setCreateErr('Request failed');
    } finally {
      setCreateSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Access policy (non-secret)
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Environment-driven settings. IP list is not shown, only whether it is enabled and how many
          entries.
        </p>
        {policyLoading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading…</p>
        ) : policy?.ok ? (
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex flex-wrap justify-between gap-2 border-b border-zinc-100 py-2 dark:border-zinc-700">
              <dt className="text-zinc-500">ADMIN_ALLOWED_IPS</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {policy.ipAllowlistEnabled ? `On · ${policy.ipAllowlistCount ?? 0} entries` : 'Off'}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-b border-zinc-100 py-2 dark:border-zinc-700">
              <dt className="text-zinc-500">Login rate limit</dt>
              <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">
                {policy.adminLoginRateLimit?.maxAttempts ?? '—'} /{' '}
                {policy.adminLoginRateLimit?.windowSeconds ?? '—'}s per IP
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-b border-zinc-100 py-2 dark:border-zinc-700">
              <dt className="text-zinc-500">Session cookie max-age</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {policy.sessionCookieMaxAgeSeconds ?? '—'}s
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-b border-zinc-100 py-2 dark:border-zinc-700">
              <dt className="text-zinc-500">ADMIN_JWT_EXPIRES_IN</dt>
              <dd className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                {policy.adminJwtExpiresInEnv ?? '—'}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 py-2">
              <dt className="text-zinc-500">Cookie flags</dt>
              <dd className="text-right text-zinc-700 dark:text-zinc-300">
                httpOnly={String(policy.cookieHttpOnly)} · sameSite={policy.cookieSameSite ?? '—'} ·
                secure(prod)={String(policy.cookieSecureInProduction)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{policy?.error ?? 'Error'}</p>
        )}
        <button
          type="button"
          onClick={() => void loadPolicy()}
          className="mt-4 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Refresh
        </button>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Admin accounts
        </h2>
        {usersLoading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading…</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {users.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-700"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{u.login}</span>
                <span className="text-xs text-zinc-500">
                  {u.isCurrent ? 'current session' : new Date(u.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Change your password
        </h2>
        <form onSubmit={handlePassword} className="mt-4 max-w-md space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Current password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
              New password (min 10)
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              minLength={10}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={pwSaving}
            className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pwSaving ? 'Saving…' : 'Update password'}
          </button>
          {pwMsg && <p className="text-sm text-green-600 dark:text-green-400">{pwMsg}</p>}
          {pwErr && <p className="text-sm text-red-600 dark:text-red-400">{pwErr}</p>}
        </form>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Create admin
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Login: letters, digits, <code className="text-xs">._@-</code> · password min 10.
        </p>
        <form onSubmit={handleCreate} className="mt-4 max-w-md space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Login
            </label>
            <input
              type="text"
              value={newLogin}
              onChange={(e) => setNewLogin(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Password
            </label>
            <input
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              required
              minLength={10}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={createSaving}
            className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {createSaving ? 'Creating…' : 'Create admin'}
          </button>
          {createMsg && <p className="text-sm text-green-600 dark:text-green-400">{createMsg}</p>}
          {createErr && <p className="text-sm text-red-600 dark:text-red-400">{createErr}</p>}
        </form>
      </section>
    </div>
  );
}
