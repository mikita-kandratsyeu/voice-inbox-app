'use client';

import {
  AppWindow,
  Cloud,
  Database,
  LayoutDashboard,
  LifeBuoy,
  ExternalLink,
  LogOut,
  Radio,
  Rocket,
  Sparkles,
  Settings,
  Shield,
  User,
  Wallet,
  Wrench,
  Activity,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { adminHasPermission, type AdminPermission } from '@/lib/admin-permissions';
import {
  utilitiesGroupedActionBaseClass,
  utilitiesGroupedActionClass,
  utilitiesShellClass,
  utilitiesShellDividerClass,
} from '@/components/ui/utilities-shell';

import {
  adminHeaderShellClass,
  adminMainContainerClass,
  adminHeaderScrollRowClass,
  adminMainGutterXClass,
  adminMainInsetClass,
} from './admin-layout';

// Import ENHANCED UI components
import {
  AdminCollapsibleCard,
  AdminMetricCard,
  AdminStatusBadge,
  AdminEmptyState,
  AdminAlert,
  adminBtnSecondaryClass,
} from './admin-ui';

import { AdminBudgetPanel } from './AdminBudgetPanel';
import { AdminChangePasswordForm } from './AdminChangePasswordForm';
import { AdminConfigPanel } from './AdminConfigPanel';
import { AdminOperationsPanel } from './AdminOperationsPanel';
import { AdminInAppEventsPanel } from './AdminInAppEventsPanel';
import { AdminMessagingPanel } from './AdminMessagingPanel';
import { AdminReleasesPanel } from './AdminReleasesPanel';
import { AdminSecurityPanel } from './AdminSecurityPanel';
import { AdminSupportPanel } from './AdminSupportPanel';

// Types remain the same
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

type AdminTab =
  | 'overview'
  | 'config'
  | 'support'
  | 'releases'
  | 'in_app_events'
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
    description: 'System health, deployments, and recent activity',
    icon: LayoutDashboard,
  },
  config: {
    label: 'Configuration',
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
    label: 'Blog & Releases',
    short: 'Blog',
    description: 'Landing changelog posts per locale',
    icon: Rocket,
  },
  in_app_events: {
    label: 'In-app Events',
    short: 'Events',
    description: 'App Store event pages for the mobile app',
    icon: Sparkles,
  },
  messaging: {
    label: 'Push & Broadcast',
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
  'in_app_events',
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
  const [adminTab, setAdminTab] = useState<AdminTab>(() => visibleTabs[0] ?? 'overview');

  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.includes(adminTab)) {
      setAdminTab(visibleTabs[0]!);
    }
  }, [adminTab, visibleTabs]);

  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [github, setGithub] = useState<GitHubResponse | null>(null);
  const [githubLoading, setGithubLoading] = useState(false);

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
    if (!canAccessOverview) return;
    void fetchGithub();
  }, [fetchGithub, canAccessOverview]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    router.refresh();
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleString();

  const tabClass = (t: AdminTab) =>
    adminTab === t
      ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-md dark:from-indigo-500 dark:to-indigo-600'
      : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100';

  const currentMeta = ADMIN_TAB_META[adminTab];

  return (
    <div className="flex min-h-screen">
      {/* Enhanced Sidebar */}
      <aside className="sticky top-0 z-20 hidden h-screen w-64 shrink-0 flex-col border-r border-zinc-200/80 bg-gradient-to-b from-white via-white to-zinc-50/50 py-6 backdrop-blur-md dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/50 md:flex">
        <div className="px-5 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/25 ring-1 ring-indigo-500/20 dark:from-indigo-500 dark:to-indigo-600">
              <AppWindow className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Voice Inbox AI</p>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Admin Panel</p>
            </div>
          </div>
        </div>
        <p className="px-5 pb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          Navigation
        </p>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pr-4">
          {visibleTabs.map((t) => {
            const { label, icon: NavIcon } = ADMIN_TAB_META[t];
            const isActive = adminTab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setAdminTab(t)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all duration-200 ${tabClass(t)} ${isActive ? 'scale-[1.02]' : ''}`}
              >
                <NavIcon className="h-4.5 w-4.5 shrink-0" strokeWidth={2.5} aria-hidden />
                <span className="min-w-0 truncate">{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick Stats in Sidebar */}
        <div className="mt-auto border-t border-zinc-200/80 px-5 pt-4 dark:border-zinc-800">
          <div className="space-y-2 rounded-xl bg-gradient-to-br from-zinc-50 to-zinc-100/50 p-3 text-xs dark:from-zinc-900/50 dark:to-zinc-800/30">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">Status</span>
              <AdminStatusBadge tone="success">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                Online
              </AdminStatusBadge>
            </div>
            {typeof status?.app?.devicesWithPush === 'number' && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Devices</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {status.app.devicesWithPush}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className={`min-w-0 flex-1 ${adminMainGutterXClass}`}>
        {/* Enhanced Header */}
        <header className="sticky top-2 z-10 pt-2 sm:top-3 sm:pt-3 md:pt-4">
          <div
            className={`${adminMainContainerClass} ${adminHeaderShellClass} ${adminMainInsetClass} py-3 sm:py-4`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                    Voice Inbox AI · Admin
                  </p>
                  {currentMeta.icon && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100/80 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                      {(() => {
                        const Icon = currentMeta.icon;
                        return <Icon className="h-3 w-3" strokeWidth={2.5} />;
                      })()}
                    </div>
                  )}
                </div>
                <h1 className="mt-1 text-xl font-bold tracking-tight text-zinc-900 sm:mt-1.5 sm:text-2xl md:text-3xl dark:text-zinc-50">
                  {currentMeta.label}
                </h1>
                <p className="mt-1.5 hidden max-w-2xl text-sm leading-relaxed text-zinc-600 sm:block dark:text-zinc-400">
                  {currentMeta.description}
                </p>
              </div>

              <div
                className={`${utilitiesShellClass} shrink-0`}
                role="group"
                aria-label="Admin preferences"
              >
                <div
                  className={`flex ${utilitiesGroupedActionBaseClass} max-w-36 items-center gap-2.5 px-2.5 sm:max-w-44 md:max-w-56 md:px-3`}
                  title={adminLogin}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/15 to-indigo-600/15 text-indigo-700 ring-1 ring-indigo-500/20 dark:from-indigo-400/20 dark:to-indigo-500/20 dark:text-indigo-200 dark:ring-indigo-400/25"
                    aria-hidden
                  >
                    <User className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                  <span className="hidden min-w-0 flex-col leading-tight min-[360px]:flex">
                    <span className="truncate text-sm font-semibold text-black/90 dark:text-white/95">
                      {adminLogin}
                    </span>
                    {isSuperadmin ? (
                      <span className="truncate text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        Superadmin
                      </span>
                    ) : null}
                  </span>
                </div>
                <span className={utilitiesShellDividerClass} aria-hidden />
                <ThemeToggle variant="grouped" />
                <span className={utilitiesShellDividerClass} aria-hidden />
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Log out"
                  className={utilitiesGroupedActionClass}
                >
                  <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                  <span className="hidden md:inline">Log out</span>
                </button>
              </div>
            </div>

            {/* Mobile Tab Navigation */}
            <div
              className={`${adminHeaderScrollRowClass} mt-4 border-t border-zinc-200/80 pt-3 md:hidden dark:border-zinc-700/80`}
            >
              {visibleTabs.map((t) => {
                const isActive = adminTab === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAdminTab(t)}
                    className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-md dark:from-indigo-500 dark:to-indigo-600'
                        : 'bg-white/90 text-zinc-600 ring-1 ring-zinc-200/90 hover:bg-zinc-50 dark:bg-zinc-800/80 dark:text-zinc-300 dark:ring-zinc-600/90 dark:hover:bg-zinc-700/80'
                    }`}
                  >
                    {(() => {
                      const I = ADMIN_TAB_META[t].icon;
                      return <I className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />;
                    })()}
                    {ADMIN_TAB_META[t].short}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <div className={`${adminMainContainerClass} min-w-0 pb-10 pt-4 sm:pt-6`}>
          {adminTab === 'overview' && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    System Health
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Monitor your infrastructure status
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchStatus()}
                  disabled={statusLoading}
                  className={adminBtnSecondaryClass}
                >
                  <Activity className="h-4 w-4" strokeWidth={2} />
                  {statusLoading ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>

              <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
                <AdminMetricCard title="PostgreSQL" icon={Database} trend="neutral">
                  {statusLoading ? (
                    <div className="h-8 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
                  ) : status?.database?.ok ? (
                    <div className="space-y-2">
                      <AdminStatusBadge tone="success">
                        <Zap className="h-3 w-3" strokeWidth={2.5} />
                        Connected
                      </AdminStatusBadge>
                      {typeof status.database?.latencyMs === 'number' && (
                        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                          {status.database.latencyMs}
                          <span className="ml-1 text-sm font-medium text-zinc-500">ms</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <AdminAlert tone="error" className="text-xs">
                      {status?.database?.error ?? 'Unavailable'}
                    </AdminAlert>
                  )}
                </AdminMetricCard>

                <AdminMetricCard title="Upstash Redis" icon={Cloud} trend="neutral">
                  {statusLoading ? (
                    <div className="h-8 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
                  ) : status?.upstash?.ok ? (
                    <div className="space-y-2">
                      <AdminStatusBadge tone="success">
                        <Zap className="h-3 w-3" strokeWidth={2.5} />
                        Connected
                      </AdminStatusBadge>
                      {status.qstash && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          QStash:{' '}
                          {status.qstash.ok
                            ? `✓ ${status.qstash.transport ?? 'qstash'}`
                            : (status.qstash.error ?? 'not configured')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <AdminAlert tone="error" className="text-xs">
                      {status?.upstash?.error ?? 'Disconnected'}
                    </AdminAlert>
                  )}
                </AdminMetricCard>

                <AdminMetricCard title="Application" icon={AppWindow} trend="up">
                  {statusLoading ? (
                    <div className="h-8 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
                  ) : status ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                          Environment
                        </p>
                        <p className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100">
                          {status.app?.env ?? '—'}
                        </p>
                      </div>
                      {typeof status.app?.devicesWithPush === 'number' && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                            Push Devices
                          </p>
                          <p className="mt-0.5 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {status.app.devicesWithPush}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <AdminAlert tone="error" className="text-xs">
                      Failed to load
                    </AdminAlert>
                  )}
                </AdminMetricCard>
              </div>

              <div className="space-y-6 lg:space-y-8">
                <AdminCollapsibleCard
                  title="Vercel Deployments"
                  headerAction={
                    <button
                      type="button"
                      onClick={() => void fetchStatus()}
                      disabled={statusLoading}
                      className={`${adminBtnSecondaryClass} px-3 py-1.5 text-xs`}
                    >
                      {statusLoading ? '…' : 'Refresh'}
                    </button>
                  }
                >
                  {statusLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-20 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700"
                        />
                      ))}
                    </div>
                  ) : status?.vercel?.ok ? (
                    <div className="space-y-3">
                      {status.vercel?.deployments?.length ? (
                        status.vercel.deployments.map((d) => (
                          <div
                            key={d.uid}
                            className="overflow-hidden rounded-xl border border-zinc-200/80 bg-gradient-to-br from-white to-zinc-50/50 p-4 transition-all duration-200 hover:shadow-md dark:border-zinc-700/80 dark:from-zinc-900/50 dark:to-zinc-800/30"
                          >
                            <div className="flex items-start gap-3">
                              <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                                  <code className="rounded-md bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                                    {d.uid.slice(0, 10)}
                                  </code>
                                  <AdminStatusBadge
                                    tone={
                                      d.state === 'READY'
                                        ? 'success'
                                        : d.state === 'ERROR' || d.state === 'CANCELED'
                                          ? 'error'
                                          : 'warning'
                                    }
                                  >
                                    {d.state}
                                  </AdminStatusBadge>
                                  {d.target && (
                                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                      {d.target}
                                    </span>
                                  )}
                                  {d.branch && (
                                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                      {d.branch}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-zinc-500">
                                  {formatDate(d.created)}
                                  {d.source && ` · ${d.source}`}
                                </div>
                                {d.url && (
                                  <a
                                    href={d.url.startsWith('http') ? d.url : `https://${d.url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={d.url}
                                    className="block min-w-0 break-all text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                                  >
                                    {d.url}
                                  </a>
                                )}
                              </div>
                              {d.inspectorUrl && (
                                <a
                                  href={d.inspectorUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`${adminBtnSecondaryClass} shrink-0 px-3 py-1.5 text-xs`}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                                  View
                                </a>
                              )}
                            </div>
                            {d.state === 'ERROR' && d.errorMessage && (
                              <AdminAlert tone="error" className="mt-3 text-xs">
                                {d.errorMessage}
                              </AdminAlert>
                            )}
                          </div>
                        ))
                      ) : (
                        <AdminEmptyState title="No deployments found" icon={Cloud} />
                      )}
                    </div>
                  ) : (
                    <AdminAlert tone="error">
                      {status?.vercel?.error ?? 'Not configured'}
                    </AdminAlert>
                  )}
                </AdminCollapsibleCard>

                <AdminCollapsibleCard
                  title="Recent GitHub Commits"
                  headerAction={
                    <button
                      type="button"
                      onClick={() => void fetchGithub()}
                      disabled={githubLoading}
                      className={`${adminBtnSecondaryClass} px-3 py-1.5 text-xs`}
                    >
                      {githubLoading ? '…' : 'Refresh'}
                    </button>
                  }
                >
                  {githubLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-16 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700"
                        />
                      ))}
                    </div>
                  ) : github?.ok && github.repoUrl && github.commits?.length ? (
                    <div className="space-y-3">
                      <a
                        href={github.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        <ExternalLink className="h-4 w-4" strokeWidth={2} />
                        {github.repo}
                      </a>
                      {github.commits.map((c) => (
                        <div
                          key={c.sha}
                          className="overflow-hidden rounded-xl border border-zinc-200/80 bg-gradient-to-br from-white to-zinc-50/50 p-3 transition-all duration-200 hover:shadow-md dark:border-zinc-700/80 dark:from-zinc-900/50 dark:to-zinc-800/30"
                        >
                          <div className="flex items-start gap-3">
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 rounded-md bg-zinc-200 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                            >
                              {c.shortSha}
                            </a>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {c.message}
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                {c.author}
                                {c.date && ` · ${formatDate(new Date(c.date).getTime())}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <AdminEmptyState
                      title="GitHub not configured"
                      hint={github?.error ?? 'Set GITHUB_REPO and optionally GITHUB_TOKEN'}
                      icon={ExternalLink}
                    />
                  )}
                </AdminCollapsibleCard>
              </div>

              {!canAccessSecurity && (
                <div className="mt-8">
                  <AdminChangePasswordForm />
                </div>
              )}
            </>
          )}

          {adminTab === 'config' && <AdminConfigPanel />}
          {adminTab === 'support' && <AdminSupportPanel />}
          {adminTab === 'releases' && <AdminReleasesPanel />}
          {adminTab === 'in_app_events' && <AdminInAppEventsPanel />}
          {adminTab === 'operations' && <AdminOperationsPanel />}
          {adminTab === 'budget' && <AdminBudgetPanel />}
          {adminTab === 'security' && <AdminSecurityPanel />}
          {adminTab === 'messaging' && <AdminMessagingPanel />}
        </div>
      </div>
    </div>
  );
}
