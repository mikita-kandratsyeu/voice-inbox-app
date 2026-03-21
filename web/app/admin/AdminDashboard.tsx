'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { AdminOperationsPanel } from './AdminOperationsPanel';
import { AdminReleasesPanel } from './AdminReleasesPanel';
import { AdminSecurityPanel } from './AdminSecurityPanel';
import { AdminSupportPanel } from './AdminSupportPanel';

type VercelDeploymentInfo = {
  uid: string;
  state: string;
  created: number;
  branch?: string;
  url?: string | null;
  target?: string | null;
  source?: string;
  name?: string;
  inspectorUrl?: string | null;
  buildingAt?: number | null;
  ready?: number | null;
  errorMessage?: string | null;
};

type VercelStatus = {
  ok: boolean;
  deployments?: VercelDeploymentInfo[];
  error?: string;
};

type UpstashStatus = {
  ok: boolean;
  error?: string;
};

type DatabaseStatus = {
  ok: boolean;
  latencyMs?: number;
  error?: string;
};

type StatusResponse = {
  vercel: VercelStatus;
  upstash: UpstashStatus;
  database: DatabaseStatus;
  app: { baseUrl: string; env: string; devicesWithPush?: number };
};

type BroadcastResult = { ok: true; sent: number; failed: number; total: number };

type GitHubCommitInfo = {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
  url: string;
};

type GitHubResponse = {
  ok: boolean;
  repo?: string;
  repoUrl?: string;
  commits?: GitHubCommitInfo[];
  error?: string;
};

type AppConfigApiResponse = {
  ok: boolean;
  editable?: boolean;
  hint?: string;
  values?: Record<string, string>;
  effective?: {
    amount: number;
    cooldownSeconds: number;
    cooldownKeyPrefix: string;
    freeWeeklyLimit: number;
    proWeeklyLimit: number;
  };
  error?: string;
};

const BONUS_KEYS = {
  amount: 'AI_BONUS_AMOUNT',
  cooldownSeconds: 'AI_BONUS_COOLDOWN_SECONDS',
  keyPrefix: 'AI_BONUS_COOLDOWN_KEY_PREFIX',
} as const;

const WEEKLY_KEYS = {
  free: 'AI_WEEKLY_LIMIT_FREE',
  pro: 'AI_WEEKLY_LIMIT_PRO',
} as const;

type BroadcastHistoryItem = {
  id: string;
  createdAt: string;
  kind: string;
  notifyType: string;
  title: string | null;
  sent: number;
  failed: number;
  total: number;
  errorSample: string | null;
  adminLogin: string;
  deviceId: string | null;
};

type ProLicenseRow = {
  id: string;
  durationMonths: number;
  createdAt: string;
  consumed: boolean;
  consumedAt: string | null;
  devicePrefix: string | null;
};

type AdminTab =
  | 'overview'
  | 'config'
  | 'support'
  | 'releases'
  | 'messaging'
  | 'operations'
  | 'security';

export function AdminDashboard() {
  const router = useRouter();
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<BroadcastResult | null>(null);
  const [broadcastType, setBroadcastType] = useState<string>('policy_update');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [singleDeviceId, setSingleDeviceId] = useState('');
  const [singleType, setSingleType] = useState<string>('policy_update');
  const [singleTitle, setSingleTitle] = useState('');
  const [singleBody, setSingleBody] = useState('');
  const [singleMessage, setSingleMessage] = useState('');
  const [singlePushLoading, setSinglePushLoading] = useState(false);
  const [singlePushResult, setSinglePushResult] = useState<{ ok: true } | { error: string } | null>(
    null,
  );
  const [deviceIds, setDeviceIds] = useState<string[]>([]);
  const [deviceIdsLoading, setDeviceIdsLoading] = useState(false);
  const [github, setGithub] = useState<GitHubResponse | null>(null);
  const [githubLoading, setGithubLoading] = useState(false);

  const [appConfigLoading, setAppConfigLoading] = useState(true);
  const [appConfigEditable, setAppConfigEditable] = useState(false);
  const [appConfigHint, setAppConfigHint] = useState<string | null>(null);
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusCooldownSec, setBonusCooldownSec] = useState('');
  const [bonusKeyPrefix, setBonusKeyPrefix] = useState('');
  const [weeklyLimitFree, setWeeklyLimitFree] = useState('');
  const [weeklyLimitPro, setWeeklyLimitPro] = useState('');
  const [appConfigSaving, setAppConfigSaving] = useState(false);
  const [appConfigMessage, setAppConfigMessage] = useState<string | null>(null);
  const [appConfigError, setAppConfigError] = useState<string | null>(null);

  const [proLicenseMonths, setProLicenseMonths] = useState<string>('12');
  const [proLicenseGenerating, setProLicenseGenerating] = useState(false);
  const [proLicensePlainKey, setProLicensePlainKey] = useState<string | null>(null);
  const [proLicenseList, setProLicenseList] = useState<ProLicenseRow[]>([]);
  const [proLicenseListLoading, setProLicenseListLoading] = useState(false);
  const [proLicenseError, setProLicenseError] = useState<string | null>(null);
  const [proLicenseDeletingId, setProLicenseDeletingId] = useState<string | null>(null);
  const [proLicenseResettingId, setProLicenseResettingId] = useState<string | null>(null);

  const [broadcastConfirm, setBroadcastConfirm] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastHistoryItem[]>([]);
  const [broadcastHistoryLoading, setBroadcastHistoryLoading] = useState(false);

  const fetchBroadcastHistory = useCallback(async () => {
    setBroadcastHistoryLoading(true);
    try {
      const res = await fetch('/api/admin/broadcast-history?limit=30', {
        credentials: 'include',
      });
      const data = (await res.json()) as { ok?: boolean; items?: BroadcastHistoryItem[] };
      setBroadcastHistory(data.ok && Array.isArray(data.items) ? data.items : []);
    } catch {
      setBroadcastHistory([]);
    } finally {
      setBroadcastHistoryLoading(false);
    }
  }, []);

  const fetchAppConfig = useCallback(async () => {
    setAppConfigLoading(true);
    setAppConfigError(null);
    try {
      const res = await fetch('/api/admin/app-config', { credentials: 'include' });
      const data = (await res.json()) as AppConfigApiResponse;
      if (!data.ok || !data.values) {
        setAppConfigError(data.error ?? 'Failed to load config');
        return;
      }
      setAppConfigEditable(!!data.editable);
      setAppConfigHint(data.hint ?? null);
      const v = data.values;
      setBonusAmount(v[BONUS_KEYS.amount] ?? '');
      setBonusCooldownSec(v[BONUS_KEYS.cooldownSeconds] ?? '');
      setBonusKeyPrefix(v[BONUS_KEYS.keyPrefix] ?? '');
      setWeeklyLimitFree(v[WEEKLY_KEYS.free] ?? '');
      setWeeklyLimitPro(v[WEEKLY_KEYS.pro] ?? '');
    } catch {
      setAppConfigError('Request failed');
    } finally {
      setAppConfigLoading(false);
    }
  }, []);

  const handleSaveAppConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppConfigMessage(null);
    setAppConfigError(null);
    setAppConfigSaving(true);
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
        setAppConfigError((data as { error?: string }).error ?? 'Save failed');
        return;
      }
      setAppConfigMessage('Saved.');
      if (data.values) {
        const v = data.values;
        setBonusAmount(v[BONUS_KEYS.amount] ?? '');
        setBonusCooldownSec(v[BONUS_KEYS.cooldownSeconds] ?? '');
        setBonusKeyPrefix(v[BONUS_KEYS.keyPrefix] ?? '');
        setWeeklyLimitFree(v[WEEKLY_KEYS.free] ?? '');
        setWeeklyLimitPro(v[WEEKLY_KEYS.pro] ?? '');
      }
    } catch {
      setAppConfigError('Request failed');
    } finally {
      setAppConfigSaving(false);
    }
  };

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/admin/status', { credentials: 'include' });
      const data = await res.json();
      setStatus(data as StatusResponse);
    } catch {
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchDeviceIds = useCallback(async () => {
    setDeviceIdsLoading(true);
    try {
      const res = await fetch('/api/admin/devices', { credentials: 'include' });
      const data = await res.json();
      setDeviceIds(
        Array.isArray((data as { deviceIds?: string[] }).deviceIds) ? data.deviceIds : [],
      );
    } catch {
      setDeviceIds([]);
    } finally {
      setDeviceIdsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, 60_000);
    return () => clearInterval(t);
  }, [fetchStatus]);

  const fetchProLicenseList = useCallback(async () => {
    setProLicenseListLoading(true);
    setProLicenseError(null);
    try {
      const res = await fetch('/api/admin/pro-licenses', { credentials: 'include' });
      const data = (await res.json()) as { ok?: boolean; items?: ProLicenseRow[]; error?: string };
      if (!res.ok || !data.ok) {
        setProLicenseError(data.error ?? 'Failed to load keys');
        setProLicenseList([]);
        return;
      }
      setProLicenseList(Array.isArray(data.items) ? data.items : []);
    } catch {
      setProLicenseError('Request failed');
      setProLicenseList([]);
    } finally {
      setProLicenseListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminTab === 'config') {
      void fetchAppConfig();
      void fetchProLicenseList();
    }
  }, [adminTab, fetchAppConfig, fetchProLicenseList]);

  const handleGenerateProLicense = async () => {
    setProLicenseError(null);
    setProLicensePlainKey(null);
    setProLicenseGenerating(true);
    try {
      const months = parseInt(proLicenseMonths, 10);
      const res = await fetch('/api/admin/pro-licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ durationMonths: months }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        plainKey?: string;
        error?: string;
        hint?: string;
      };
      if (!res.ok || !data.ok || !data.plainKey) {
        setProLicenseError(data.error ?? 'Generate failed');
        return;
      }
      setProLicensePlainKey(data.plainKey);
      void fetchProLicenseList();
    } catch {
      setProLicenseError('Request failed');
    } finally {
      setProLicenseGenerating(false);
    }
  };

  const handleDeleteProLicense = async (row: ProLicenseRow) => {
    if (row.consumed) return;
    if (
      !window.confirm(
        'Delete this unused license key? This cannot be undone. Redeemed keys cannot be deleted.',
      )
    ) {
      return;
    }
    setProLicenseError(null);
    setProLicenseDeletingId(row.id);
    try {
      const res = await fetch(`/api/admin/pro-licenses/${encodeURIComponent(row.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setProLicenseError(data.error ?? 'Delete failed');
        return;
      }
      void fetchProLicenseList();
    } catch {
      setProLicenseError('Request failed');
    } finally {
      setProLicenseDeletingId(null);
    }
  };

  const handleResetProLicense = async (row: ProLicenseRow) => {
    if (!row.consumed) return;
    if (
      !window.confirm(
        'Reset this redeemed key? It becomes activatable again. Pro time on the previous device will be reduced by the duration of this key (or removed if it would expire).',
      )
    ) {
      return;
    }
    setProLicenseError(null);
    setProLicenseResettingId(row.id);
    try {
      const res = await fetch(`/api/admin/pro-licenses/${encodeURIComponent(row.id)}/reset`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setProLicenseError(data.error ?? 'Reset failed');
        return;
      }
      void fetchProLicenseList();
    } catch {
      setProLicenseError('Request failed');
    } finally {
      setProLicenseResettingId(null);
    }
  };

  const fetchGithub = useCallback(async () => {
    setGithubLoading(true);
    try {
      const res = await fetch('/api/admin/github', { credentials: 'include' });
      const data = await res.json();
      setGithub(data as GitHubResponse);
    } catch {
      setGithub({ ok: false, error: 'Request failed' });
    } finally {
      setGithubLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeviceIds();
  }, [fetchDeviceIds]);

  useEffect(() => {
    fetchGithub();
  }, [fetchGithub]);

  useEffect(() => {
    if (adminTab === 'messaging') void fetchBroadcastHistory();
  }, [adminTab, fetchBroadcastHistory]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    router.refresh();
  };

  const handleSinglePush = async (e: React.FormEvent) => {
    e.preventDefault();
    setSinglePushResult(null);
    setSinglePushLoading(true);
    try {
      const res = await fetch('/api/admin/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          deviceId: singleDeviceId.trim(),
          type: singleType,
          ...(singleTitle && { title: singleTitle }),
          ...(singleBody && { body: singleBody }),
          ...(singleMessage && { message: singleMessage }),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSinglePushResult({ ok: true });
        void fetchBroadcastHistory();
      } else setSinglePushResult({ error: (data as { error?: string }).error ?? 'Failed' });
    } catch {
      setSinglePushResult({ error: 'Request failed' });
    } finally {
      setSinglePushLoading(false);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastConfirm) return;
    setBroadcastResult(null);
    setBroadcastLoading(true);
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: broadcastType,
          ...(broadcastTitle && { title: broadcastTitle }),
          ...(broadcastBody && { body: broadcastBody }),
          ...(broadcastMessage && { message: broadcastMessage }),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBroadcastResult(data as BroadcastResult);
        setBroadcastConfirm(false);
        void fetchBroadcastHistory();
      }
    } finally {
      setBroadcastLoading(false);
    }
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleString();

  const tabClass = (t: AdminTab) =>
    adminTab === t
      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800';

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-zinc-200 bg-white/90 py-6 dark:border-zinc-800 dark:bg-zinc-950/80 md:flex">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Menu</p>
        <nav className="mt-4 flex flex-col gap-1 pr-2">
          <button
            type="button"
            onClick={() => setAdminTab('overview')}
            className={`rounded-lg px-3 py-2 text-left text-sm font-medium ${tabClass('overview')}`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('config')}
            className={`rounded-lg px-3 py-2 text-left text-sm font-medium ${tabClass('config')}`}
          >
            App configuration
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('support')}
            className={`rounded-lg px-3 py-2 text-left text-sm font-medium ${tabClass('support')}`}
          >
            Support
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('releases')}
            className={`rounded-lg px-3 py-2 text-left text-sm font-medium ${tabClass('releases')}`}
          >
            Release notes
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('messaging')}
            className={`rounded-lg px-3 py-2 text-left text-sm font-medium ${tabClass('messaging')}`}
          >
            Push &amp; broadcast
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('operations')}
            className={`rounded-lg px-3 py-2 text-left text-sm font-medium ${tabClass('operations')}`}
          >
            Operations
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('security')}
            className={`rounded-lg px-3 py-2 text-left text-sm font-medium ${tabClass('security')}`}
          >
            Security
          </button>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-100/95 px-4 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 md:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-2xl">
                Voice Inbox — Admin
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Infrastructure, app settings, support inbox, and push
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="self-start rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:self-auto"
            >
              Logout
            </button>
          </div>
          <div className="mx-auto mt-4 flex max-w-6xl gap-2 overflow-x-auto pb-1 md:hidden">
            {(
              [
                'overview',
                'config',
                'support',
                'releases',
                'messaging',
                'operations',
                'security',
              ] as const
            ).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setAdminTab(t)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                  adminTab === t
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-white text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600'
                }`}
              >
                {t === 'overview'
                  ? 'Overview'
                  : t === 'config'
                    ? 'Config'
                    : t === 'support'
                      ? 'Support'
                      : t === 'releases'
                        ? 'Releases'
                        : t === 'messaging'
                          ? 'Push'
                          : t === 'operations'
                            ? 'Ops'
                            : 'Security'}
              </button>
            ))}
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
          {adminTab === 'overview' && (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fetchStatus()}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Refresh status
                </button>
                <button
                  type="button"
                  onClick={() => fetchGithub()}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Refresh GitHub
                </button>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
                <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
                    Postgres
                  </h2>
                  <div className="p-4">
                    {statusLoading ? (
                      <p className="text-sm text-zinc-500">Loading…</p>
                    ) : status?.database?.ok ? (
                      <div className="space-y-1 text-sm">
                        <p className="inline-flex items-center gap-2 font-medium text-green-600 dark:text-green-400">
                          <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />
                          Connected
                        </p>
                        {typeof status.database?.latencyMs === 'number' && (
                          <p className="text-xs text-zinc-500">
                            Ping {status.database.latencyMs} ms
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {status?.database?.error ?? 'Unavailable'}
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
                    Upstash
                  </h2>
                  <div className="p-4">
                    {statusLoading ? (
                      <p className="text-sm text-zinc-500">Loading…</p>
                    ) : status?.upstash.ok ? (
                      <p className="inline-flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                        <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />
                        Connected
                      </p>
                    ) : (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {status?.upstash.error ?? 'Disconnected'}
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
                    App
                  </h2>
                  <div className="p-4">
                    {statusLoading ? (
                      <p className="text-sm text-zinc-500">Loading…</p>
                    ) : status ? (
                      <dl className="space-y-1.5 text-sm">
                        <div>
                          <dt className="text-xs font-medium text-zinc-400">URL</dt>
                          <dd className="text-zinc-700 dark:text-zinc-300">
                            {status.app.baseUrl || '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-zinc-400">Env · Push devices</dt>
                          <dd className="text-zinc-700 dark:text-zinc-300">
                            {status.app.env}
                            {typeof status.app.devicesWithPush === 'number' && (
                              <> · {status.app.devicesWithPush}</>
                            )}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-sm text-zinc-500">Failed to load</p>
                    )}
                  </div>
                </section>
              </div>

              <div className="mb-8 space-y-4 lg:space-y-6">
                {/* Колонка: Vercel, затем GitHub */}
                <div className="flex flex-col gap-4 lg:gap-6">
                  <section className="flex min-h-[260px] max-h-[60vh] flex-col rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                    <h2 className="shrink-0 border-b border-zinc-200 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
                      Vercel
                    </h2>
                    <div className="min-h-0 flex-1 overflow-auto p-4">
                      {statusLoading ? (
                        <p className="text-sm text-zinc-500">Loading…</p>
                      ) : status?.vercel.ok ? (
                        <div className="space-y-2 text-sm">
                          {status.vercel.deployments?.length ? (
                            <ul className="space-y-2">
                              {status.vercel.deployments.map((d) => (
                                <li
                                  key={d.uid}
                                  className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-600"
                                >
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="font-mono text-zinc-500">
                                      {d.uid.slice(0, 8)}
                                    </span>
                                    <span
                                      className={
                                        d.state === 'READY'
                                          ? 'text-green-600 dark:text-green-400'
                                          : d.state === 'ERROR' || d.state === 'CANCELED'
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-amber-600 dark:text-amber-400'
                                      }
                                    >
                                      {d.state}
                                    </span>
                                    {d.target && (
                                      <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs dark:bg-zinc-600">
                                        {d.target}
                                      </span>
                                    )}
                                    {d.branch && <span className="text-zinc-500">{d.branch}</span>}
                                  </div>
                                  <div className="mt-1 text-xs text-zinc-500">
                                    {formatDate(d.created)}
                                    {d.source && ` · ${d.source}`}
                                  </div>
                                  {d.url && (
                                    <div className="mt-1">
                                      <a
                                        href={d.url.startsWith('http') ? d.url : `https://${d.url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 underline dark:text-blue-400"
                                      >
                                        {d.url}
                                      </a>
                                    </div>
                                  )}
                                  {d.inspectorUrl && (
                                    <a
                                      href={d.inspectorUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-0.5 block text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-400"
                                    >
                                      Inspect
                                    </a>
                                  )}
                                  {d.state === 'ERROR' && d.errorMessage && (
                                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                      {d.errorMessage}
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-zinc-500">No deployments</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {status?.vercel.error ?? 'Not configured'}
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="flex min-h-[260px] max-h-[60vh] flex-col rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                    <h2 className="shrink-0 border-b border-zinc-200 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
                      GitHub
                    </h2>
                    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
                      {githubLoading ? (
                        <p className="text-sm text-zinc-500">Loading…</p>
                      ) : github?.ok && github.repoUrl && github.commits?.length ? (
                        <div className="flex min-h-0 flex-1 flex-col text-sm">
                          <a
                            href={github.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-blue-600 underline dark:text-blue-400"
                          >
                            {github.repo}
                          </a>
                          <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto py-1">
                            {github.commits.map((c) => (
                              <li
                                key={c.sha}
                                className="shrink-0 rounded border border-zinc-200 p-1.5 dark:border-zinc-600"
                              >
                                <a
                                  href={c.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-xs text-blue-600 dark:text-blue-400"
                                >
                                  {c.shortSha}
                                </a>
                                <span className="ml-1.5 text-zinc-600 dark:text-zinc-400">
                                  {c.message}
                                </span>
                                <div className="mt-0.5 text-xs text-zinc-500">
                                  {c.author}
                                  {c.date && ` · ${formatDate(new Date(c.date).getTime())}`}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500">
                          {github?.error ?? 'Set GITHUB_REPO (and optionally GITHUB_TOKEN)'}
                        </p>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </>
          )}

          {adminTab === 'config' && (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fetchAppConfig()}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Refresh
                </button>
              </div>

              <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <h2 className="mb-1 text-lg font-medium">AI bonus (rewarded ad)</h2>
                <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                  Values used by <code className="text-xs">getBonusConfig()</code> and{' '}
                  <code className="text-xs">POST /api/ai-usage/bonus</code>. Changing the cooldown
                  key prefix only affects new cooldown keys in Redis.
                </p>
                {appConfigLoading ? (
                  <p className="text-sm text-zinc-500">Loading…</p>
                ) : (
                  <form onSubmit={handleSaveAppConfig} className="space-y-4">
                    {!appConfigEditable && appConfigHint && (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                        {appConfigHint}
                      </p>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                          AI_BONUS_AMOUNT
                        </label>
                        <input
                          type="number"
                          min={1}
                          required
                          disabled={!appConfigEditable}
                          value={bonusAmount}
                          onChange={(e) => setBonusAmount(e.target.value)}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 disabled:opacity-60"
                        />
                        <p className="mt-1 text-xs text-zinc-500">
                          Extra AI requests granted per ad view.
                        </p>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                          AI_BONUS_COOLDOWN_SECONDS
                        </label>
                        <input
                          type="number"
                          min={60}
                          required
                          disabled={!appConfigEditable}
                          value={bonusCooldownSec}
                          onChange={(e) => setBonusCooldownSec(e.target.value)}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 disabled:opacity-60"
                        />
                        <p className="mt-1 text-xs text-zinc-500">
                          Min 60 seconds between bonus claims.
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        AI_BONUS_COOLDOWN_KEY_PREFIX
                      </label>
                      <input
                        type="text"
                        required
                        disabled={!appConfigEditable}
                        value={bonusKeyPrefix}
                        onChange={(e) => setBonusKeyPrefix(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 disabled:opacity-60"
                      />
                      <p className="mt-1 text-xs text-zinc-500">
                        Redis key prefix for per-device cooldown.
                      </p>
                    </div>
                    <div className="border-t border-zinc-200 pt-4 dark:border-zinc-600">
                      <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Weekly AI limits (rolling ISO week)
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                            AI_WEEKLY_LIMIT_FREE
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={500}
                            required
                            disabled={!appConfigEditable}
                            value={weeklyLimitFree}
                            onChange={(e) => setWeeklyLimitFree(e.target.value)}
                            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 disabled:opacity-60"
                          />
                          <p className="mt-1 text-xs text-zinc-500">Free tier (non-Pro devices).</p>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                            AI_WEEKLY_LIMIT_PRO
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={500}
                            required
                            disabled={!appConfigEditable}
                            value={weeklyLimitPro}
                            onChange={(e) => setWeeklyLimitPro(e.target.value)}
                            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 disabled:opacity-60"
                          />
                          <p className="mt-1 text-xs text-zinc-500">
                            Pro tier; must be ≥ free (validated on save).
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="submit"
                        disabled={!appConfigEditable || appConfigSaving}
                        className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        {appConfigSaving ? 'Saving…' : 'Save'}
                      </button>
                      {appConfigMessage && (
                        <span className="text-sm text-green-600 dark:text-green-400">
                          {appConfigMessage}
                        </span>
                      )}
                      {appConfigError && (
                        <span className="text-sm text-red-600 dark:text-red-400">
                          {appConfigError}
                        </span>
                      )}
                    </div>
                  </form>
                )}
              </section>

              <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <h2 className="mb-1 text-lg font-medium">Pro license keys</h2>
                <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                  One-time keys; plaintext is shown only once. Each key activates on a single
                  device.
                </p>
                <div className="mb-4 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Duration (months)
                    </label>
                    <select
                      value={proLicenseMonths}
                      onChange={(e) => setProLicenseMonths(e.target.value)}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                    >
                      <option value="1">1</option>
                      <option value="3">3</option>
                      <option value="6">6</option>
                      <option value="12">12</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={proLicenseGenerating}
                    onClick={() => void handleGenerateProLicense()}
                    className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {proLicenseGenerating ? 'Generating…' : 'Generate key'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void fetchProLicenseList()}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    Refresh list
                  </button>
                </div>
                {proLicensePlainKey && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40">
                    <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
                      Copy this key now — it will not be shown again.
                    </p>
                    <code className="mt-1 block break-all text-sm text-amber-900 dark:text-amber-200">
                      {proLicensePlainKey}
                    </code>
                  </div>
                )}
                {proLicenseError && (
                  <p className="mb-4 text-sm text-red-600 dark:text-red-400">{proLicenseError}</p>
                )}
                {proLicenseListLoading ? (
                  <p className="text-sm text-zinc-500">Loading keys…</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-600">
                          <th className="py-2 pr-4 font-medium">Created</th>
                          <th className="py-2 pr-4 font-medium">Months</th>
                          <th className="py-2 pr-4 font-medium">Status</th>
                          <th className="py-2 pr-4 font-medium">Device</th>
                          <th className="py-2 font-medium"> </th>
                        </tr>
                      </thead>
                      <tbody>
                        {proLicenseList.map((row) => (
                          <tr
                            key={row.id}
                            className="border-b border-zinc-100 dark:border-zinc-700/80"
                          >
                            <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                              {formatDate(new Date(row.createdAt).getTime())}
                            </td>
                            <td className="py-2 pr-4">{row.durationMonths}</td>
                            <td className="py-2 pr-4">
                              {row.consumed ? (
                                <span className="text-green-700 dark:text-green-400">Redeemed</span>
                              ) : (
                                <span className="text-zinc-500">Unused</span>
                              )}
                            </td>
                            <td className="py-2 pr-4 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                              {row.devicePrefix ?? '—'}
                            </td>
                            <td className="py-2 text-right">
                              <div className="flex flex-wrap justify-end gap-2">
                                {!row.consumed && (
                                  <button
                                    type="button"
                                    disabled={proLicenseDeletingId === row.id}
                                    onClick={() => void handleDeleteProLicense(row)}
                                    className="rounded border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-zinc-800 dark:text-red-400 dark:hover:bg-red-950/40"
                                  >
                                    {proLicenseDeletingId === row.id ? 'Deleting…' : 'Delete'}
                                  </button>
                                )}
                                {row.consumed && (
                                  <button
                                    type="button"
                                    disabled={proLicenseResettingId === row.id}
                                    onClick={() => void handleResetProLicense(row)}
                                    className="rounded border border-amber-200 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-900 dark:bg-zinc-800 dark:text-amber-200 dark:hover:bg-amber-950/40"
                                  >
                                    {proLicenseResettingId === row.id ? 'Resetting…' : 'Reset'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {proLicenseList.length === 0 && (
                      <p className="mt-2 text-sm text-zinc-500">No keys yet.</p>
                    )}
                  </div>
                )}
              </section>
            </>
          )}

          {adminTab === 'support' && <AdminSupportPanel />}

          {adminTab === 'releases' && <AdminReleasesPanel />}

          {adminTab === 'operations' && <AdminOperationsPanel />}

          {adminTab === 'security' && <AdminSecurityPanel />}

          {adminTab === 'messaging' && (
            <>
              <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <h2 className="mb-4 text-lg font-medium">Send to one device</h2>
                <form onSubmit={handleSinglePush} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Device ID
                    </label>
                    {deviceIdsLoading ? (
                      <p className="text-sm text-zinc-500">Loading devices…</p>
                    ) : deviceIds.length > 0 ? (
                      <select
                        value={deviceIds.includes(singleDeviceId) ? singleDeviceId : ''}
                        onChange={(e) => setSingleDeviceId(e.target.value)}
                        className="mb-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                      >
                        <option value="">— Choose device —</option>
                        {deviceIds.map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <input
                      type="text"
                      value={singleDeviceId}
                      onChange={(e) => setSingleDeviceId(e.target.value)}
                      required
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="UUID or Android ID (or choose above)"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Type
                    </label>
                    <select
                      value={singleType}
                      onChange={(e) => setSingleType(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                    >
                      <option value="policy_update">Policy update</option>
                      <option value="limit_warning">Limit warning</option>
                      <option value="limit_exceeded">Limit exceeded</option>
                      <option value="ai_complete">AI complete</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Title (optional)
                    </label>
                    <input
                      type="text"
                      value={singleTitle}
                      onChange={(e) => setSingleTitle(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="Override default title"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Body (optional)
                    </label>
                    <input
                      type="text"
                      value={singleBody}
                      onChange={(e) => setSingleBody(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="Override default body"
                    />
                  </div>
                  {singleType === 'policy_update' && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        Message (optional, Markdown)
                      </label>
                      <textarea
                        value={singleMessage}
                        onChange={(e) => setSingleMessage(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                        placeholder="Markdown message"
                      />
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={singlePushLoading}
                    className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {singlePushLoading ? 'Sending…' : 'Send push'}
                  </button>
                </form>
                {singlePushResult && 'ok' in singlePushResult && singlePushResult.ok && (
                  <p className="mt-3 text-sm text-green-600 dark:text-green-400">Push sent.</p>
                )}
                {singlePushResult && 'error' in singlePushResult && (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                    {singlePushResult.error}
                  </p>
                )}
              </section>

              <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <h2 className="mb-4 text-lg font-medium">Push broadcast</h2>
                <form
                  onSubmit={handleBroadcast}
                  className="space-y-4 xl:grid xl:grid-cols-2 xl:gap-6 xl:space-y-0"
                >
                  <div className="xl:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Type
                    </label>
                    <select
                      value={broadcastType}
                      onChange={(e) => setBroadcastType(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                    >
                      <option value="policy_update">Policy update</option>
                      <option value="limit_warning">Limit warning</option>
                      <option value="limit_exceeded">Limit exceeded</option>
                      <option value="ai_complete">AI complete</option>
                    </select>
                  </div>
                  <div className="xl:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Title (optional)
                    </label>
                    <input
                      type="text"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="Override default title"
                    />
                  </div>
                  <div className="xl:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Body (optional)
                    </label>
                    <textarea
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="Override default body"
                    />
                  </div>
                  {broadcastType === 'policy_update' && (
                    <div className="xl:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        Message (optional, Markdown)
                      </label>
                      <textarea
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        rows={4}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                        placeholder="Markdown text for policy update…"
                      />
                    </div>
                  )}
                  <div className="xl:col-span-2 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-600 dark:bg-zinc-900/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Preview
                    </p>
                    <dl className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                      <div>
                        <dt className="inline text-zinc-500">Type · </dt>
                        <dd className="inline font-mono text-xs">{broadcastType}</dd>
                      </div>
                      {broadcastTitle ? (
                        <div>
                          <dt className="text-zinc-500">Title</dt>
                          <dd>{broadcastTitle}</dd>
                        </div>
                      ) : null}
                      {broadcastBody ? (
                        <div>
                          <dt className="text-zinc-500">Body</dt>
                          <dd className="whitespace-pre-wrap">{broadcastBody}</dd>
                        </div>
                      ) : null}
                      {broadcastType === 'policy_update' && broadcastMessage ? (
                        <div>
                          <dt className="text-zinc-500">Message</dt>
                          <dd className="whitespace-pre-wrap font-mono text-xs">
                            {broadcastMessage}
                          </dd>
                        </div>
                      ) : null}
                      <div>
                        <dt className="inline text-zinc-500">Recipients · </dt>
                        <dd className="inline">
                          {statusLoading
                            ? '…'
                            : typeof status?.app.devicesWithPush === 'number'
                              ? `${status.app.devicesWithPush} devices (last status refresh)`
                              : '—'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div className="xl:col-span-2">
                    <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={broadcastConfirm}
                        onChange={(e) => setBroadcastConfirm(e.target.checked)}
                        className="mt-1 rounded border-zinc-300"
                      />
                      <span>
                        I confirm sending this broadcast to all registered push devices (see
                        recipient count above).
                      </span>
                    </label>
                  </div>
                  <div className="xl:col-span-2">
                    <button
                      type="submit"
                      disabled={broadcastLoading || !broadcastConfirm}
                      className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {broadcastLoading ? 'Sending…' : 'Send to all devices'}
                    </button>
                  </div>
                </form>
                {broadcastResult && (
                  <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                    Sent: {broadcastResult.sent}, failed: {broadcastResult.failed}, total:{' '}
                    {broadcastResult.total}
                  </p>
                )}
                <div className="mt-8 border-t border-zinc-100 pt-6 dark:border-zinc-700">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Recent push / broadcast log
                    </h3>
                    <button
                      type="button"
                      onClick={() => void fetchBroadcastHistory()}
                      className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Refresh
                    </button>
                  </div>
                  {broadcastHistoryLoading && broadcastHistory.length === 0 ? (
                    <p className="text-sm text-zinc-500">Loading…</p>
                  ) : broadcastHistory.length === 0 ? (
                    <p className="text-sm text-zinc-500">No entries yet.</p>
                  ) : (
                    <ul className="max-h-64 space-y-2 overflow-y-auto text-xs">
                      {broadcastHistory.map((h) => (
                        <li
                          key={h.id}
                          className="rounded border border-zinc-100 bg-zinc-50/80 p-2 dark:border-zinc-700 dark:bg-zinc-900/40"
                        >
                          <div className="flex flex-wrap gap-x-2 gap-y-1 text-zinc-500">
                            <span>{new Date(h.createdAt).toLocaleString()}</span>
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              {h.kind}
                            </span>
                            <span className="font-mono">{h.notifyType}</span>
                            <span>{h.adminLogin}</span>
                          </div>
                          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                            sent {h.sent} · failed {h.failed} · total {h.total}
                            {h.deviceId && (
                              <>
                                {' '}
                                · device <span className="font-mono">{h.deviceId}</span>
                              </>
                            )}
                          </p>
                          {h.title && (
                            <p className="mt-0.5 text-zinc-700 dark:text-zinc-300">{h.title}</p>
                          )}
                          {h.errorSample && (
                            <p className="mt-1 text-red-600 dark:text-red-400">{h.errorSample}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
