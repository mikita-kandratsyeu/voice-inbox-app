'use client';

import {
  AppWindow,
  Cloud,
  Database,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Radio,
  Rocket,
  Settings,
  Shield,
  Wallet,
  Wrench,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { adminHasPermission, type AdminPermission } from '@/lib/admin-permissions';
import {
  utilitiesGroupedActionClass,
  utilitiesShellClass,
  utilitiesShellDividerClass,
} from '@/components/ui/utilities-shell';

import {
  AdminCollapsibleCard,
  AdminMetricCard,
  AdminStatusBadge,
  adminBtnPrimaryClass,
  adminBtnSecondaryClass,
  adminCardSurfaceClass,
  adminInputClass,
  adminSelectClass,
} from './admin-ui';
import { AdminBudgetPanel } from './AdminBudgetPanel';
import { AdminChangePasswordForm } from './AdminChangePasswordForm';
import { AdminConfigPanel } from './AdminConfigPanel';
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

type QStashStatus = {
  ok: boolean;
  error?: string;
  transport?: string;
};

type StatusResponse = {
  vercel: VercelStatus;
  upstash: UpstashStatus;
  qstash?: QStashStatus;
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

type AdminTab =
  | 'overview'
  | 'config'
  | 'support'
  | 'releases'
  | 'messaging'
  | 'operations'
  | 'budget'
  | 'security';

const ADMIN_TAB_META: Record<
  AdminTab,
  { label: string; short: string; description: string; icon: typeof LayoutDashboard }
> = {
  overview: {
    label: 'Overview',
    short: 'Overview',
    description: 'Health checks, deployments, and recent commits',
    icon: LayoutDashboard,
  },
  config: {
    label: 'App configuration',
    short: 'Config',
    description: 'AI limits, mobile model manifest, and Pro license keys',
    icon: Settings,
  },
  support: {
    label: 'Support',
    short: 'Support',
    description: 'In-app support requests and replies',
    icon: LifeBuoy,
  },
  releases: {
    label: 'Blog',
    short: 'Releases',
    description: 'Landing changelog posts per locale',
    icon: Rocket,
  },
  messaging: {
    label: 'Push & broadcast',
    short: 'Push',
    description: 'Targeted push and broadcast to registered devices',
    icon: Radio,
  },
  operations: {
    label: 'Operations',
    short: 'Ops',
    description: 'Observability links, metrics, exports, audit log',
    icon: Wrench,
  },
  budget: {
    label: 'Budget',
    short: 'Budget',
    description: 'Manual expense ledger and running totals',
    icon: Wallet,
  },
  security: {
    label: 'Security',
    short: 'Security',
    description: 'Access policy, passwords, and admin accounts',
    icon: Shield,
  },
};

const ADMIN_TAB_ORDER: AdminTab[] = [
  'overview',
  'config',
  'support',
  'releases',
  'messaging',
  'operations',
  'budget',
  'security',
];

type AdminDashboardProps = {
  adminLogin: string;
  isSuperadmin: boolean;
  permissions: AdminPermission[];
};

export function AdminDashboard({ adminLogin, isSuperadmin, permissions }: AdminDashboardProps) {
  const router = useRouter();
  const accessProfile = useMemo(() => ({ isSuperadmin, permissions }), [isSuperadmin, permissions]);
  const visibleTabs = useMemo(
    () => ADMIN_TAB_ORDER.filter((tab) => adminHasPermission(accessProfile, tab)),
    [accessProfile],
  );
  const canAccessSecurity = adminHasPermission(accessProfile, 'security');
  const canAccessOverview = adminHasPermission(accessProfile, 'overview');
  const canAccessMessaging = adminHasPermission(accessProfile, 'messaging');
  const [adminTab, setAdminTab] = useState<AdminTab>(() => visibleTabs[0] ?? 'overview');

  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.includes(adminTab)) {
      setAdminTab(visibleTabs[0]!);
    }
  }, [adminTab, visibleTabs]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<BroadcastResult | null>(null);
  const [broadcastType, setBroadcastType] = useState<string>('policy_update');
  const [broadcastLocaleTab, setBroadcastLocaleTab] = useState<'en' | 'ru'>('en');
  const [broadcastI18n, setBroadcastI18n] = useState({
    en: { title: '', body: '', message: '' },
    ru: { title: '', body: '', message: '' },
  });
  const [broadcastPolicyAiBrief, setBroadcastPolicyAiBrief] = useState('');
  const [broadcastPolicyAiLocale, setBroadcastPolicyAiLocale] = useState<'en' | 'ru' | null>(null);
  const [broadcastPolicyAiError, setBroadcastPolicyAiError] = useState<{
    locale: 'en' | 'ru';
    message: string;
  } | null>(null);
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

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/admin/status', { credentials: 'include' });
      const data = (await res.json()) as StatusResponse;
      setStatus(res.ok ? data : null);
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
    if (!canAccessOverview) return;
    void fetchStatus();
    const t = setInterval(() => void fetchStatus(), 60_000);
    return () => clearInterval(t);
  }, [fetchStatus, canAccessOverview]);

  const fetchGithub = useCallback(async () => {
    setGithubLoading(true);
    try {
      const res = await fetch('/api/admin/github', { credentials: 'include' });
      const data = (await res.json()) as GitHubResponse;
      setGithub(res.ok ? data : { ok: false, error: data.error ?? `HTTP ${res.status}` });
    } catch {
      setGithub({ ok: false, error: 'Request failed' });
    } finally {
      setGithubLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccessMessaging && !canAccessOverview) return;
    void fetchDeviceIds();
  }, [fetchDeviceIds, canAccessMessaging, canAccessOverview]);

  useEffect(() => {
    if (!canAccessOverview) return;
    void fetchGithub();
  }, [fetchGithub, canAccessOverview]);

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
      const i18n: Partial<
        Record<'en' | 'ru', { title?: string; body?: string; message?: string }>
      > = {};
      for (const loc of ['en', 'ru'] as const) {
        const row = broadcastI18n[loc];
        const pack: { title?: string; body?: string; message?: string } = {};
        const t = row.title.trim();
        const b = row.body.trim();
        const m = row.message.trim();
        if (t) pack.title = t;
        if (b) pack.body = b;
        if (m) pack.message = m;
        if (Object.keys(pack).length) i18n[loc] = pack;
      }
      const payload: { type: string; i18n?: typeof i18n } = { type: broadcastType };
      if (Object.keys(i18n).length) payload.i18n = i18n;

      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
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

  const handleBroadcastPolicyAiMarkdown = async (locale: 'en' | 'ru') => {
    setBroadcastPolicyAiLocale(locale);
    setBroadcastPolicyAiError(null);
    try {
      const contextParts = [
        broadcastI18n[locale].title.trim(),
        broadcastI18n[locale].body.trim(),
        broadcastI18n[locale].message.trim(),
      ].filter(Boolean);
      const res = await fetch('/api/admin/ai/push-policy-markdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          locale,
          brief: broadcastPolicyAiBrief.trim() || undefined,
          context: contextParts.length ? contextParts.join('\n\n') : undefined,
        }),
      });
      let data: { ok?: boolean; markdown?: string; error?: string };
      try {
        data = (await res.json()) as { ok?: boolean; markdown?: string; error?: string };
      } catch {
        setBroadcastPolicyAiError({
          locale,
          message: 'Invalid response from server (not JSON).',
        });
        return;
      }
      if (res.ok && data.ok && typeof data.markdown === 'string') {
        setBroadcastPolicyAiError(null);
        setBroadcastI18n((prev) => ({
          ...prev,
          [locale]: { ...prev[locale], message: data.markdown as string },
        }));
        return;
      }
      const fromBody =
        typeof data.error === 'string' && data.error.trim() ? data.error.trim() : null;
      setBroadcastPolicyAiError({
        locale,
        message: fromBody ?? `Request failed (${res.status}).`,
      });
    } catch (e) {
      setBroadcastPolicyAiError({
        locale,
        message: e instanceof Error ? e.message : 'Network or unexpected error.',
      });
    } finally {
      setBroadcastPolicyAiLocale(null);
    }
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleString();

  const tabClass = (t: AdminTab) =>
    adminTab === t
      ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500'
      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/80';

  const currentMeta = ADMIN_TAB_META[adminTab];

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 z-20 hidden h-screen w-60 shrink-0 flex-col border-r border-zinc-200/80 bg-white/90 py-5 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 md:flex">
        <div className="px-4 pb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/20 dark:bg-indigo-500">
              <AppWindow className="h-4 w-4" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Voice Inbox AI
              </p>
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <p
                  className="truncate text-xs font-medium text-zinc-600 dark:text-zinc-300"
                  title={adminLogin}
                >
                  {adminLogin}
                </p>
                {isSuperadmin ? (
                  <AdminStatusBadge tone="warning">
                    <Shield className="h-2.5 w-2.5 shrink-0" strokeWidth={2.25} aria-hidden />
                    Super
                  </AdminStatusBadge>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
          Navigate
        </p>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pr-3">
          {visibleTabs.map((t) => {
            const { label, icon: NavIcon } = ADMIN_TAB_META[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setAdminTab(t)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${tabClass(t)}`}
              >
                <NavIcon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
                <span className="min-w-0">{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/85 px-4 py-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/85 md:px-8 lg:px-10">
          <div className="mx-auto flex max-w-screen-2xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  Voice Inbox AI · Admin
                </p>
                {isSuperadmin ? (
                  <AdminStatusBadge tone="warning">
                    <Shield className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
                    Superadmin
                  </AdminStatusBadge>
                ) : null}
              </div>
              <p className="mt-1 truncate text-sm font-medium text-zinc-600 md:hidden dark:text-zinc-300">
                {adminLogin}
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-2xl">
                {currentMeta.label}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {currentMeta.description}
              </p>
            </div>
            <div
              className={`${utilitiesShellClass} self-start sm:mt-0.5`}
              role="group"
              aria-label="Admin preferences"
            >
              <ThemeToggle variant="grouped" />
              <span className={utilitiesShellDividerClass} aria-hidden />
              <button type="button" onClick={handleLogout} className={utilitiesGroupedActionClass}>
                <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          </div>
          <div className="mx-auto mt-4 flex max-w-screen-2xl gap-2 overflow-x-auto pt-2 pb-0.5 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visibleTabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setAdminTab(t)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  adminTab === t
                    ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                    : 'bg-white text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600'
                }`}
              >
                {(() => {
                  const I = ADMIN_TAB_META[t].icon;
                  return <I className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />;
                })()}
                {ADMIN_TAB_META[t].short}
              </button>
            ))}
          </div>
        </header>

        <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-8 lg:px-10">
          {adminTab === 'overview' && (
            <>
              <div className="mb-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fetchStatus()}
                  className={adminBtnSecondaryClass}
                >
                  Refresh status
                </button>
                <button
                  type="button"
                  onClick={() => fetchGithub()}
                  className={adminBtnSecondaryClass}
                >
                  Refresh GitHub
                </button>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
                <AdminMetricCard title="Postgres" icon={Database}>
                  {statusLoading ? (
                    <p className="text-sm text-zinc-500">Loading…</p>
                  ) : status?.database?.ok ? (
                    <div className="space-y-2 text-sm">
                      <AdminStatusBadge tone="success">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                        Connected
                      </AdminStatusBadge>
                      {typeof status.database?.latencyMs === 'number' && (
                        <p className="text-xs text-zinc-500">Ping {status.database.latencyMs} ms</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {status?.database?.error ?? 'Unavailable'}
                    </p>
                  )}
                </AdminMetricCard>

                <AdminMetricCard title="Upstash" icon={Cloud}>
                  {statusLoading ? (
                    <p className="text-sm text-zinc-500">Loading…</p>
                  ) : status?.upstash?.ok ? (
                    <div className="space-y-1">
                      <AdminStatusBadge tone="success">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                        Connected
                      </AdminStatusBadge>
                      {status.qstash ? (
                        <p className="text-xs text-zinc-500">
                          QStash:{' '}
                          {status.qstash.ok
                            ? `ok (${status.qstash.transport ?? 'qstash'})`
                            : (status.qstash.error ?? 'not configured')}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {status?.upstash?.error ?? 'Disconnected'}
                    </p>
                  )}
                </AdminMetricCard>

                <AdminMetricCard title="App" icon={AppWindow}>
                  {statusLoading ? (
                    <p className="text-sm text-zinc-500">Loading…</p>
                  ) : status ? (
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                          URL
                        </dt>
                        <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                          {status.app?.baseUrl || '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                          Environment · Push devices
                        </dt>
                        <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                          {status.app?.env ?? '—'}
                          {typeof status.app?.devicesWithPush === 'number' && (
                            <> · {status.app.devicesWithPush}</>
                          )}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-sm text-zinc-500">Failed to load</p>
                  )}
                </AdminMetricCard>
              </div>

              <div className="mb-8 space-y-4 lg:space-y-6">
                {/* Колонка: Vercel, затем GitHub */}
                <div className="flex flex-col gap-4 lg:gap-6">
                  <AdminCollapsibleCard title="Vercel">
                    {statusLoading ? (
                      <p className="text-sm text-zinc-500">Loading…</p>
                    ) : status?.vercel?.ok ? (
                      <div className="space-y-2 text-sm">
                        {status.vercel?.deployments?.length ? (
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
                        {status?.vercel?.error ?? 'Not configured'}
                      </p>
                    )}
                  </AdminCollapsibleCard>

                  <AdminCollapsibleCard
                    title="GitHub"
                    contentClassName="flex min-h-0 flex-1 flex-col"
                  >
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
                  </AdminCollapsibleCard>
                </div>
              </div>
              {!canAccessSecurity ? (
                <div className="mt-8">
                  <AdminChangePasswordForm />
                </div>
              ) : null}
            </>
          )}

          {adminTab === 'config' && <AdminConfigPanel />}

          {adminTab === 'support' && <AdminSupportPanel />}

          {adminTab === 'releases' && <AdminReleasesPanel />}

          {adminTab === 'operations' && <AdminOperationsPanel />}

          {adminTab === 'budget' && <AdminBudgetPanel />}

          {adminTab === 'security' && <AdminSecurityPanel />}

          {adminTab === 'messaging' && (
            <>
              <section className={`mb-8 ${adminCardSurfaceClass} p-5`}>
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
                        className={`mb-2 w-full ${adminInputClass} font-mono`}
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
                      className={`${adminInputClass} font-mono`}
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
                      className={adminSelectClass}
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
                      className={adminInputClass}
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
                      className={adminInputClass}
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
                        className={`${adminInputClass} font-mono`}
                        placeholder="Markdown message"
                      />
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={singlePushLoading}
                    className={adminBtnPrimaryClass}
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

              <section className={`mt-8 ${adminCardSurfaceClass} p-5`}>
                <h2 className="mb-2 text-lg font-medium">Push broadcast</h2>
                <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                  Copy is selected per device from its registered push locale (English or Russian).
                  If a field is empty in that language, the English version is used when available,
                  then Firebase defaults.
                </p>
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
                      className={adminSelectClass}
                    >
                      <option value="policy_update">Policy update</option>
                      <option value="limit_warning">Limit warning</option>
                      <option value="limit_exceeded">Limit exceeded</option>
                      <option value="ai_complete">AI complete</option>
                    </select>
                  </div>
                  <div className="xl:col-span-2 flex flex-wrap gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-600">
                    {(['en', 'ru'] as const).map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setBroadcastLocaleTab(loc)}
                        className={
                          broadcastLocaleTab === loc
                            ? 'rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white dark:bg-indigo-500'
                            : 'rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/80'
                        }
                      >
                        {loc === 'en' ? 'English (en)' : 'Russian (ru)'}
                      </button>
                    ))}
                  </div>
                  <div className="xl:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Title (optional)
                    </label>
                    <input
                      type="text"
                      value={broadcastI18n[broadcastLocaleTab].title}
                      onChange={(e) =>
                        setBroadcastI18n((p) => ({
                          ...p,
                          [broadcastLocaleTab]: {
                            ...p[broadcastLocaleTab],
                            title: e.target.value,
                          },
                        }))
                      }
                      className={adminInputClass}
                      placeholder="Override default title"
                    />
                  </div>
                  <div className="xl:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Body (optional)
                    </label>
                    <textarea
                      value={broadcastI18n[broadcastLocaleTab].body}
                      onChange={(e) =>
                        setBroadcastI18n((p) => ({
                          ...p,
                          [broadcastLocaleTab]: {
                            ...p[broadcastLocaleTab],
                            body: e.target.value,
                          },
                        }))
                      }
                      rows={2}
                      className={adminInputClass}
                      placeholder="Override default body"
                    />
                  </div>
                  {broadcastType === 'policy_update' && (
                    <>
                      <div className="xl:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                          Brief for AI (optional, shared)
                        </label>
                        <textarea
                          value={broadcastPolicyAiBrief}
                          onChange={(e) => {
                            setBroadcastPolicyAiError(null);
                            setBroadcastPolicyAiBrief(e.target.value);
                          }}
                          rows={2}
                          className={adminInputClass}
                          placeholder="What should the notice say? Used when generating Markdown below."
                        />
                      </div>
                      <div className="xl:col-span-2">
                        <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
                          <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                            Message (optional, Markdown) — {broadcastLocaleTab.toUpperCase()}
                          </label>
                          <button
                            type="button"
                            onClick={() => void handleBroadcastPolicyAiMarkdown(broadcastLocaleTab)}
                            disabled={broadcastPolicyAiLocale !== null}
                            className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            {broadcastPolicyAiLocale === broadcastLocaleTab
                              ? 'Generating…'
                              : 'Generate Markdown (AI)'}
                          </button>
                        </div>
                        <textarea
                          value={broadcastI18n[broadcastLocaleTab].message}
                          onChange={(e) => {
                            setBroadcastPolicyAiError((prev) =>
                              prev?.locale === broadcastLocaleTab ? null : prev,
                            );
                            setBroadcastI18n((p) => ({
                              ...p,
                              [broadcastLocaleTab]: {
                                ...p[broadcastLocaleTab],
                                message: e.target.value,
                              },
                            }));
                          }}
                          rows={4}
                          className={`${adminInputClass} font-mono`}
                          placeholder="Markdown for this locale…"
                        />
                        {broadcastPolicyAiError?.locale === broadcastLocaleTab ? (
                          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                            {broadcastPolicyAiError.message}
                          </p>
                        ) : null}
                      </div>
                    </>
                  )}
                  <div className="xl:col-span-2 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-600 dark:bg-zinc-900/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Preview
                    </p>
                    <dl className="mt-2 space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
                      <div>
                        <dt className="inline text-zinc-500">Type · </dt>
                        <dd className="inline font-mono text-xs">{broadcastType}</dd>
                      </div>
                      {(['en', 'ru'] as const).map((loc) => {
                        const row = broadcastI18n[loc];
                        const has = row.title.trim() || row.body.trim() || row.message.trim();
                        if (!has) return null;
                        return (
                          <div
                            key={loc}
                            className="rounded-md border border-zinc-200/80 bg-white/60 p-2 dark:border-zinc-600 dark:bg-zinc-950/40"
                          >
                            <dt className="text-xs font-semibold uppercase text-zinc-500">
                              Locale {loc}
                            </dt>
                            {row.title.trim() ? (
                              <div className="mt-1">
                                <span className="text-zinc-500">Title · </span>
                                {row.title.trim()}
                              </div>
                            ) : null}
                            {row.body.trim() ? (
                              <div className="mt-1 whitespace-pre-wrap">
                                <span className="text-zinc-500">Body · </span>
                                {row.body.trim()}
                              </div>
                            ) : null}
                            {broadcastType === 'policy_update' && row.message.trim() ? (
                              <div className="mt-1 whitespace-pre-wrap font-mono text-xs">
                                <span className="text-zinc-500">Message · </span>
                                {row.message.trim()}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      <div>
                        <dt className="inline text-zinc-500">Recipients · </dt>
                        <dd className="inline">
                          {statusLoading
                            ? '…'
                            : typeof status?.app?.devicesWithPush === 'number'
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
                      className={adminBtnPrimaryClass}
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
