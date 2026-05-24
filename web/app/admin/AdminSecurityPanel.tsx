'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  ADMIN_PERMISSION_META,
  ALL_ADMIN_PERMISSIONS,
  type AdminPermission,
} from '@/lib/admin-permissions';

import { AdminChangePasswordForm } from './AdminChangePasswordForm';
import { AdminPermissionFields } from './AdminPermissionFields';
import {
  AdminCard,
  AdminDetailsSection,
  adminBtnGhostClass,
  adminBtnPrimaryClass,
  adminBtnSecondaryClass,
  adminInputClass,
} from './admin-ui';

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
  isSuperadmin: boolean;
  permissions: AdminPermission[];
};

function formatPermissionSummary(user: AdminUserRow): string {
  if (user.isSuperadmin) return 'Superadmin';
  if (user.permissions.length === 0) return 'No access';
  if (user.permissions.length === ALL_ADMIN_PERMISSIONS.length) return 'All tabs';
  return user.permissions.map((p) => ADMIN_PERMISSION_META[p].label).join(', ');
}

export function AdminSecurityPanel() {
  const [policy, setPolicy] = useState<AccessPolicy | null>(null);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [actorIsSuperadmin, setActorIsSuperadmin] = useState(false);
  const [grantablePermissions, setGrantablePermissions] = useState<AdminPermission[] | null>(null);

  const [newLogin, setNewLogin] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [createIsSuperadmin, setCreateIsSuperadmin] = useState(false);
  const [createPermissions, setCreatePermissions] = useState<AdminPermission[]>(['support']);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [createSaving, setCreateSaving] = useState(false);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editIsSuperadmin, setEditIsSuperadmin] = useState(false);
  const [editPermissions, setEditPermissions] = useState<AdminPermission[]>([]);
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [tgIdsText, setTgIdsText] = useState('');
  const [tgWhitelistLoading, setTgWhitelistLoading] = useState(true);
  const [tgWhitelistEditable, setTgWhitelistEditable] = useState(false);
  const [tgWhitelistHint, setTgWhitelistHint] = useState<string | null>(null);
  const [tgWhitelistMsg, setTgWhitelistMsg] = useState<string | null>(null);
  const [tgWhitelistErr, setTgWhitelistErr] = useState<string | null>(null);
  const [tgWhitelistSaving, setTgWhitelistSaving] = useState(false);

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
      const data = (await res.json()) as {
        ok?: boolean;
        items?: AdminUserRow[];
        actor?: { isSuperadmin?: boolean; grantablePermissions?: AdminPermission[] | null };
      };
      if (data.ok && Array.isArray(data.items)) {
        setUsers(data.items);
        setActorIsSuperadmin(!!data.actor?.isSuperadmin);
        setGrantablePermissions(
          data.actor?.grantablePermissions === undefined ||
            data.actor?.grantablePermissions === null
            ? null
            : data.actor.grantablePermissions,
        );
      } else {
        setUsers([]);
      }
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadTelegramWhitelist = useCallback(async () => {
    setTgWhitelistLoading(true);
    setTgWhitelistErr(null);
    try {
      const res = await fetch('/api/admin/telegram-whitelist', { credentials: 'include' });
      const data = (await res.json()) as {
        ok?: boolean;
        editable?: boolean;
        hint?: string;
        ids?: string[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setTgWhitelistErr(data.error ?? 'Failed to load Telegram whitelist');
        setTgIdsText('');
        setTgWhitelistEditable(false);
        setTgWhitelistHint(null);
        return;
      }
      setTgWhitelistEditable(!!data.editable);
      setTgWhitelistHint(data.hint ?? null);
      setTgIdsText(Array.isArray(data.ids) ? data.ids.join('\n') : '');
    } catch {
      setTgWhitelistErr('Request failed');
      setTgIdsText('');
    } finally {
      setTgWhitelistLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPolicy();
    void loadUsers();
    void loadTelegramWhitelist();
  }, [loadPolicy, loadUsers, loadTelegramWhitelist]);

  const startEditUser = (user: AdminUserRow) => {
    setEditingUserId(user.id);
    setEditIsSuperadmin(user.isSuperadmin);
    setEditPermissions(user.isSuperadmin ? [] : [...user.permissions]);
    setEditMsg(null);
    setEditErr(null);
  };

  const handleTelegramWhitelistSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTgWhitelistMsg(null);
    setTgWhitelistErr(null);
    setTgWhitelistSaving(true);
    const lines = tgIdsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await fetch('/api/admin/telegram-whitelist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: lines }),
      });
      const data = (await res.json()) as { ok?: boolean; ids?: string[]; error?: string };
      if (!res.ok || !data.ok) {
        setTgWhitelistErr(data.error ?? 'Save failed');
        return;
      }
      setTgWhitelistMsg('Saved.');
      if (Array.isArray(data.ids)) {
        setTgIdsText(data.ids.join('\n'));
      }
    } catch {
      setTgWhitelistErr('Request failed');
    } finally {
      setTgWhitelistSaving(false);
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
        body: JSON.stringify({
          login: newLogin.trim(),
          password: newUserPassword,
          isSuperadmin: createIsSuperadmin,
          permissions: createPermissions,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setCreateErr(data.error ?? 'Failed');
        return;
      }
      setCreateMsg(`Created admin “${newLogin.trim()}”.`);
      setNewLogin('');
      setNewUserPassword('');
      setCreateIsSuperadmin(false);
      setCreatePermissions(['support']);
      void loadUsers();
    } catch {
      setCreateErr('Request failed');
    } finally {
      setCreateSaving(false);
    }
  };

  const handleSavePermissions = async (userId: string) => {
    setEditMsg(null);
    setEditErr(null);
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          isSuperadmin: editIsSuperadmin,
          permissions: editPermissions,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setEditErr(data.error ?? 'Failed');
        return;
      }
      setEditMsg('Permissions saved.');
      setEditingUserId(null);
      void loadUsers();
    } catch {
      setEditErr('Request failed');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <AdminCard
        title="Access policy (non-secret)"
        description="Environment-driven settings. IP list is not shown, only whether it is enabled and how many entries."
        headerRight={
          <button
            type="button"
            onClick={() => void loadPolicy()}
            className={adminBtnSecondaryClass}
          >
            Refresh
          </button>
        }
      >
        {policyLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : policy?.ok ? (
          <dl className="space-y-2 text-sm">
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
          <p className="text-sm text-red-600 dark:text-red-400">{policy?.error ?? 'Error'}</p>
        )}
      </AdminCard>

      <AdminCard
        title="Telegram admin bot"
        description={
          <>
            Numeric Telegram user ids allowed to use the separate admin bot (one per line or
            comma-separated). Find yours via @userinfobot. Empty list means no Telegram admins. The
            bot reads this list from the same database; deploy it from{' '}
            <code className="text-xs">telegram-bot/</code>.
          </>
        }
        headerRight={
          <button
            type="button"
            onClick={() => void loadTelegramWhitelist()}
            className={adminBtnSecondaryClass}
          >
            Refresh
          </button>
        }
      >
        {tgWhitelistLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <form onSubmit={handleTelegramWhitelistSave} className="max-w-xl space-y-3">
            {tgWhitelistHint && (
              <p className="text-sm text-amber-700 dark:text-amber-300">{tgWhitelistHint}</p>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Telegram user ids
              </label>
              <textarea
                value={tgIdsText}
                onChange={(e) => setTgIdsText(e.target.value)}
                rows={6}
                disabled={!tgWhitelistEditable}
                placeholder="123456789"
                className={`${adminInputClass} min-h-32 font-mono text-sm`}
              />
            </div>
            <button
              type="submit"
              disabled={!tgWhitelistEditable || tgWhitelistSaving}
              className={adminBtnPrimaryClass}
            >
              {tgWhitelistSaving ? 'Saving…' : 'Save whitelist'}
            </button>
            {tgWhitelistMsg && (
              <p className="text-sm text-green-600 dark:text-green-400">{tgWhitelistMsg}</p>
            )}
            {tgWhitelistErr && (
              <p className="text-sm text-red-600 dark:text-red-400">{tgWhitelistErr}</p>
            )}
          </form>
        )}
      </AdminCard>

      <AdminCard
        title="Admin accounts"
        description="Each admin sees only the tabs you enable. Superadmin always has full access."
        headerRight={
          <button type="button" onClick={() => void loadUsers()} className={adminBtnSecondaryClass}>
            Refresh
          </button>
        }
      >
        {usersLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {users.map((u) => (
              <li key={u.id} className="rounded-lg border border-zinc-100 dark:border-zinc-700">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{u.login}</span>
                    <p className="mt-0.5 text-xs text-zinc-500">{formatPermissionSummary(u)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">
                      {u.isCurrent ? 'current session' : new Date(u.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        editingUserId === u.id ? setEditingUserId(null) : startEditUser(u)
                      }
                      className={adminBtnGhostClass}
                    >
                      {editingUserId === u.id ? 'Close' : 'Edit access'}
                    </button>
                  </div>
                </div>
                {editingUserId === u.id ? (
                  <div className="border-t border-zinc-100 px-3 py-3 dark:border-zinc-700">
                    <AdminPermissionFields
                      isSuperadmin={editIsSuperadmin}
                      permissions={editPermissions}
                      grantablePermissions={grantablePermissions}
                      canSetSuperadmin={actorIsSuperadmin}
                      onSuperadminChange={setEditIsSuperadmin}
                      onPermissionsChange={setEditPermissions}
                      disabled={editSaving}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={editSaving}
                        onClick={() => void handleSavePermissions(u.id)}
                        className={adminBtnPrimaryClass}
                      >
                        {editSaving ? 'Saving…' : 'Save permissions'}
                      </button>
                    </div>
                    {editMsg && (
                      <p className="mt-2 text-sm text-green-600 dark:text-green-400">{editMsg}</p>
                    )}
                    {editErr && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{editErr}</p>
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminChangePasswordForm />

      <AdminDetailsSection summary="Create admin">
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Login: letters, digits, <code className="text-xs">._@-</code> · password min 10. You can
          only grant tabs you have access to (unless you are superadmin).
        </p>
        <form onSubmit={handleCreate} className="max-w-3xl space-y-4">
          <div className="grid max-w-md gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Login
              </label>
              <input
                type="text"
                value={newLogin}
                onChange={(e) => setNewLogin(e.target.value)}
                required
                className={adminInputClass}
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
                className={adminInputClass}
              />
            </div>
          </div>

          <AdminPermissionFields
            isSuperadmin={createIsSuperadmin}
            permissions={createPermissions}
            grantablePermissions={grantablePermissions}
            canSetSuperadmin={actorIsSuperadmin}
            onSuperadminChange={setCreateIsSuperadmin}
            onPermissionsChange={setCreatePermissions}
            disabled={createSaving}
          />

          <button type="submit" disabled={createSaving} className={adminBtnPrimaryClass}>
            {createSaving ? 'Creating…' : 'Create admin'}
          </button>
          {createMsg && <p className="text-sm text-green-600 dark:text-green-400">{createMsg}</p>}
          {createErr && <p className="text-sm text-red-600 dark:text-red-400">{createErr}</p>}
        </form>
      </AdminDetailsSection>
    </div>
  );
}
