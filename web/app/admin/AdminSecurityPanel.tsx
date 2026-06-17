'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  ADMIN_PERMISSION_META,
  ALL_ADMIN_PERMISSIONS,
  type AdminPermission,
} from '@/lib/admin-permissions';

import { AdminChangePasswordForm } from './AdminChangePasswordForm';
import { AdminPermissionFields } from './AdminPermissionFields';
import { AdminUserRowMenu } from './AdminUserRowMenu';
import {
  AdminCard,
  AdminDetailsSection,
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
  telegramUserId: string | null;
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
  const [editTelegramUserId, setEditTelegramUserId] = useState('');
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const [newTelegramUserId, setNewTelegramUserId] = useState('');

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

  useEffect(() => {
    void loadPolicy();
    void loadUsers();
  }, [loadPolicy, loadUsers]);

  const startEditUser = (user: AdminUserRow) => {
    setEditingUserId(user.id);
    setEditIsSuperadmin(user.isSuperadmin);
    setEditPermissions(user.isSuperadmin ? [] : [...user.permissions]);
    setEditTelegramUserId(user.telegramUserId ?? '');
    setEditMsg(null);
    setEditErr(null);
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
          telegramUserId: newTelegramUserId.trim() || null,
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
      setNewTelegramUserId('');
      setCreateIsSuperadmin(false);
      setCreatePermissions(['support']);
      void loadUsers();
    } catch {
      setCreateErr('Request failed');
    } finally {
      setCreateSaving(false);
    }
  };

  const handleDelete = async (user: AdminUserRow) => {
    if (user.isCurrent) return;
    const confirmed = window.confirm(`Delete admin “${user.login}”? This cannot be undone.`);
    if (!confirmed) return;

    setDeleteErr(null);
    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setDeleteErr(data.error ?? 'Delete failed');
        return;
      }
      if (editingUserId === user.id) {
        setEditingUserId(null);
      }
      void loadUsers();
    } catch {
      setDeleteErr('Request failed');
    } finally {
      setDeletingId(null);
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
          telegramUserId: editTelegramUserId.trim() || null,
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
                secure(production)={String(policy.cookieSecureInProduction)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-red-600 dark:text-red-400">{policy?.error ?? 'Error'}</p>
        )}
      </AdminCard>

      <AdminCard
        title="Admin accounts"
        description={
          <>
            Each admin sees only the tabs you enable. Superadmin always has full access. Link a{' '}
            <strong>Telegram user id</strong> per admin so they can use the admin bot (
            <code className="text-xs">telegram-bot/</code>) with the same permissions. They can send{' '}
            <code className="text-xs">/whoami</code> to the bot to see their numeric id.
          </>
        }
        headerRight={
          <button type="button" onClick={() => void loadUsers()} className={adminBtnSecondaryClass}>
            Refresh
          </button>
        }
      >
        {usersLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <>
            {deleteErr ? (
              <p className="mb-3 text-sm text-red-600 dark:text-red-400">{deleteErr}</p>
            ) : null}
            <ul className="space-y-3 text-sm">
              {users.map((u) => (
                <li key={u.id} className="rounded-lg border border-zinc-100 dark:border-zinc-700">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {u.login}
                      </span>
                      <p className="mt-0.5 text-xs text-zinc-500">{formatPermissionSummary(u)}</p>
                      {u.telegramUserId ? (
                        <p className="mt-0.5 font-mono text-xs text-zinc-500">
                          Telegram: {u.telegramUserId}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">
                        {u.isCurrent
                          ? 'current session'
                          : new Date(u.createdAt).toLocaleDateString()}
                      </span>
                      <AdminUserRowMenu
                        isCurrent={u.isCurrent}
                        isEditing={editingUserId === u.id}
                        isDeleting={deletingId === u.id}
                        onEdit={() =>
                          editingUserId === u.id ? setEditingUserId(null) : startEditUser(u)
                        }
                        onDelete={() => void handleDelete(u)}
                      />
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
                      <div className="mt-3 max-w-md">
                        <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                          Telegram user id (bot)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editTelegramUserId}
                          onChange={(e) => setEditTelegramUserId(e.target.value)}
                          placeholder="e.g. 123456789"
                          disabled={editSaving}
                          className={adminInputClass}
                        />
                        <p className="mt-1 text-xs text-zinc-500">
                          Bot access uses this id and the admin&apos;s tab permissions. Use /whoami
                          in the bot to copy the id.
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={editSaving}
                          onClick={() => void handleSavePermissions(u.id)}
                          className={adminBtnPrimaryClass}
                        >
                          {editSaving ? 'Saving…' : 'Save'}
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
          </>
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

          <div className="max-w-md">
            <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Telegram user id (optional)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={newTelegramUserId}
              onChange={(e) => setNewTelegramUserId(e.target.value)}
              placeholder="e.g. 123456789"
              disabled={createSaving}
              className={adminInputClass}
            />
          </div>

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
