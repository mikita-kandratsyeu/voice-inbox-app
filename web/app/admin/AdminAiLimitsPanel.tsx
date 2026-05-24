'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  AdminAlert,
  AdminCard,
  AdminFormField,
  adminBtnPrimaryClass,
  adminBtnSecondaryClass,
  adminInputClass,
} from './admin-ui';

const BONUS_KEYS = {
  amount: 'AI_BONUS_AMOUNT',
  cooldownSeconds: 'AI_BONUS_COOLDOWN_SECONDS',
  keyPrefix: 'AI_BONUS_COOLDOWN_KEY_PREFIX',
} as const;

const WEEKLY_KEYS = {
  free: 'AI_WEEKLY_LIMIT_FREE',
  pro: 'AI_WEEKLY_LIMIT_PRO',
} as const;

type AppConfigApiResponse = {
  ok: boolean;
  editable?: boolean;
  hint?: string;
  values?: Record<string, string>;
  error?: string;
};

export function AdminAiLimitsPanel() {
  const [loading, setLoading] = useState(true);
  const [editable, setEditable] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusCooldownSec, setBonusCooldownSec] = useState('');
  const [bonusKeyPrefix, setBonusKeyPrefix] = useState('');
  const [weeklyLimitFree, setWeeklyLimitFree] = useState('');
  const [weeklyLimitPro, setWeeklyLimitPro] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/app-config', { credentials: 'include' });
      const data = (await res.json()) as AppConfigApiResponse;
      if (!data.ok || !data.values) {
        setError(data.error ?? 'Failed to load config');
        return;
      }
      setEditable(!!data.editable);
      setHint(data.hint ?? null);
      const v = data.values;
      setBonusAmount(v[BONUS_KEYS.amount] ?? '');
      setBonusCooldownSec(v[BONUS_KEYS.cooldownSeconds] ?? '');
      setBonusKeyPrefix(v[BONUS_KEYS.keyPrefix] ?? '');
      setWeeklyLimitFree(v[WEEKLY_KEYS.free] ?? '');
      setWeeklyLimitPro(v[WEEKLY_KEYS.pro] ?? '');
    } catch {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          [BONUS_KEYS.amount]: bonusAmount.trim(),
          [BONUS_KEYS.cooldownSeconds]: bonusCooldownSec.trim(),
          [BONUS_KEYS.keyPrefix]: bonusKeyPrefix.trim(),
          [WEEKLY_KEYS.free]: weeklyLimitFree.trim(),
          [WEEKLY_KEYS.pro]: weeklyLimitPro.trim(),
        }),
      });
      const data = (await res.json()) as AppConfigApiResponse & { ok: boolean };
      if (!res.ok || !data.ok) {
        setError((data as { error?: string }).error ?? 'Save failed');
        return;
      }
      setMessage('Settings saved.');
      if (data.values) {
        const v = data.values;
        setBonusAmount(v[BONUS_KEYS.amount] ?? '');
        setBonusCooldownSec(v[BONUS_KEYS.cooldownSeconds] ?? '');
        setBonusKeyPrefix(v[BONUS_KEYS.keyPrefix] ?? '');
        setWeeklyLimitFree(v[WEEKLY_KEYS.free] ?? '');
        setWeeklyLimitPro(v[WEEKLY_KEYS.pro] ?? '');
      }
    } catch {
      setError('Request failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminCard
      title="AI usage limits"
      description="Rewarded-ad bonus and weekly request caps (rolling ISO week). Stored in AppConfig when the database is connected."
      headerRight={
        <button type="button" onClick={() => void fetchConfig()} className={adminBtnSecondaryClass}>
          Refresh
        </button>
      }
    >
      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
          {!editable && hint ? <AdminAlert tone="warning">{hint}</AdminAlert> : null}

          <fieldset className="space-y-4" disabled={!editable}>
            <legend className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Rewarded ad bonus
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminFormField label="Requests per ad" hint={`Config key: ${BONUS_KEYS.amount}`}>
                <input
                  type="number"
                  min={1}
                  required
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                  className={adminInputClass}
                />
              </AdminFormField>
              <AdminFormField
                label="Cooldown (seconds)"
                hint={`Min 60. Key: ${BONUS_KEYS.cooldownSeconds}`}
              >
                <input
                  type="number"
                  min={60}
                  required
                  value={bonusCooldownSec}
                  onChange={(e) => setBonusCooldownSec(e.target.value)}
                  className={adminInputClass}
                />
              </AdminFormField>
            </div>
            <AdminFormField
              label="Redis cooldown key prefix"
              hint="Changing this only affects new cooldown keys."
              mono
            >
              <input
                type="text"
                required
                value={bonusKeyPrefix}
                onChange={(e) => setBonusKeyPrefix(e.target.value)}
                className={`${adminInputClass} font-mono text-xs`}
              />
            </AdminFormField>
          </fieldset>

          <fieldset
            className="space-y-4 border-t border-zinc-100 pt-6 dark:border-zinc-800"
            disabled={!editable}
          >
            <legend className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Weekly limits
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminFormField label="Free tier" hint={`Key: ${WEEKLY_KEYS.free}`}>
                <input
                  type="number"
                  min={1}
                  max={500}
                  required
                  value={weeklyLimitFree}
                  onChange={(e) => setWeeklyLimitFree(e.target.value)}
                  className={adminInputClass}
                />
              </AdminFormField>
              <AdminFormField label="Pro tier" hint={`Must be ≥ free. Key: ${WEEKLY_KEYS.pro}`}>
                <input
                  type="number"
                  min={1}
                  max={500}
                  required
                  value={weeklyLimitPro}
                  onChange={(e) => setWeeklyLimitPro(e.target.value)}
                  className={adminInputClass}
                />
              </AdminFormField>
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <button type="submit" disabled={!editable || saving} className={adminBtnPrimaryClass}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {message ? (
              <span className="text-sm text-emerald-600 dark:text-emerald-400">{message}</span>
            ) : null}
            {error ? <span className="text-sm text-red-600 dark:text-red-400">{error}</span> : null}
          </div>
        </form>
      )}
    </AdminCard>
  );
}
