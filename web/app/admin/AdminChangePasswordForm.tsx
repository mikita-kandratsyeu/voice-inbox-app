'use client';

import { useState } from 'react';

import { AdminDetailsSection, adminBtnPrimaryClass, adminInputClass } from './admin-ui';

export function AdminChangePasswordForm() {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

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

  return (
    <AdminDetailsSection summary="Change your password">
      <form onSubmit={handlePassword} className="max-w-md space-y-3">
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
            className={adminInputClass}
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
            className={adminInputClass}
          />
        </div>
        <button type="submit" disabled={pwSaving} className={adminBtnPrimaryClass}>
          {pwSaving ? 'Saving…' : 'Update password'}
        </button>
        {pwMsg && <p className="text-sm text-green-600 dark:text-green-400">{pwMsg}</p>}
        {pwErr && <p className="text-sm text-red-600 dark:text-red-400">{pwErr}</p>}
      </form>
    </AdminDetailsSection>
  );
}
