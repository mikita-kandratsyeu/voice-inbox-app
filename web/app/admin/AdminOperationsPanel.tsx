'use client';

import { useCallback, useEffect, useState } from 'react';

import { AdminExternalObservabilityLinks } from './AdminExternalObservabilityLinks';

type SupportStats = {
  ok: boolean;
  totalOpen?: number;
  openCreatedInLast7Days?: number;
  openCreatedInLast30Days?: number;
  avgResolutionHoursClosed?: number | null;
  closedSampleSize?: number;
  error?: string;
};

type AuditItem = {
  id: string;
  createdAt: string;
  adminLogin: string;
  action: string;
  metadata: unknown;
};

type ObservabilityResponse = {
  ok: boolean;
  vercelWebAnalyticsNote?: string;
  apiErrorsToday?: {
    day: string;
    totalErrors: number;
    topRoutes: { key: string; count: number }[];
  } | null;
  error?: string;
};

export function AdminOperationsPanel() {
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [obs, setObs] = useState<ObservabilityResponse | null>(null);
  const [obsLoading, setObsLoading] = useState(true);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [auditCursor, setAuditCursor] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/support/stats', { credentials: 'include' });
      const data = (await res.json()) as SupportStats;
      setStats(data.ok ? data : { ok: false, error: data.error ?? 'Failed' });
    } catch {
      setStats({ ok: false, error: 'Request failed' });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchObs = useCallback(async () => {
    setObsLoading(true);
    try {
      const res = await fetch('/api/admin/observability', { credentials: 'include' });
      const data = (await res.json()) as ObservabilityResponse;
      setObs(data);
    } catch {
      setObs({ ok: false, error: 'Request failed' });
    } finally {
      setObsLoading(false);
    }
  }, []);

  const fetchAuditPage = useCallback(async (append: boolean, cursor: string | null) => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const params = new URLSearchParams({ limit: '40' });
      if (append && cursor) params.set('cursor', cursor);
      const res = await fetch(`/api/admin/audit?${params}`, { credentials: 'include' });
      const data = (await res.json()) as {
        ok?: boolean;
        items?: AuditItem[];
        nextCursor?: string | null;
        error?: string;
      };
      if (!data.ok || !data.items) {
        setAuditError(data.error ?? 'Failed to load audit log');
        return;
      }
      setAuditItems((prev) => (append ? [...prev, ...data.items!] : data.items!));
      setAuditCursor(data.nextCursor ?? null);
    } catch {
      setAuditError('Request failed');
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
    void fetchObs();
    void fetchAuditPage(false, null);
  }, [fetchStats, fetchObs, fetchAuditPage]);

  return (
    <div className="space-y-8">
      <AdminExternalObservabilityLinks />

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Support summary
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Open tickets and average time to close (closed tickets, last 5000 updates).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/api/admin/support/export"
            download
            className="inline-flex rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Download CSV export
          </a>
          <button
            type="button"
            onClick={() => void fetchStats()}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Refresh stats
          </button>
        </div>
        {statsLoading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading…</p>
        ) : stats?.ok ? (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
              <dt className="text-xs font-medium text-zinc-400">Open (all)</dt>
              <dd className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {stats.totalOpen ?? '—'}
              </dd>
            </div>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
              <dt className="text-xs font-medium text-zinc-400">Open, created last 7 days</dt>
              <dd className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {stats.openCreatedInLast7Days ?? '—'}
              </dd>
            </div>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
              <dt className="text-xs font-medium text-zinc-400">Open, created last 30 days</dt>
              <dd className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {stats.openCreatedInLast30Days ?? '—'}
              </dd>
            </div>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
              <dt className="text-xs font-medium text-zinc-400">Avg. hours to close</dt>
              <dd className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {typeof stats.avgResolutionHoursClosed === 'number'
                  ? stats.avgResolutionHoursClosed.toFixed(1)
                  : '—'}
                {stats.closedSampleSize != null && stats.closedSampleSize > 0 && (
                  <span className="ml-1 text-xs font-normal text-zinc-500">
                    (n={stats.closedSampleSize})
                  </span>
                )}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{stats?.error ?? 'Error'}</p>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          API errors (today, UTC)
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {obs?.vercelWebAnalyticsNote ??
            'Histogram of 4xx/5xx from routes using apiError(), stored in Redis.'}
        </p>
        {obsLoading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading…</p>
        ) : obs?.ok ? (
          <div className="mt-4 space-y-2 text-sm">
            {!obs.apiErrorsToday ? (
              <p className="text-zinc-500">
                Redis not configured — error histogram is only stored with Upstash.
              </p>
            ) : (
              <>
                <p className="text-zinc-700 dark:text-zinc-300">
                  Day <span className="font-mono">{obs.apiErrorsToday.day}</span> · Total errors:{' '}
                  <span className="font-semibold">{obs.apiErrorsToday.totalErrors}</span>
                </p>
                {obs.apiErrorsToday.topRoutes.length === 0 ? (
                  <p className="text-zinc-500">No errors recorded yet for this UTC day.</p>
                ) : (
                  <ul className="space-y-1 border-t border-zinc-100 pt-2 dark:border-zinc-700">
                    {obs.apiErrorsToday.topRoutes.map((r) => (
                      <li
                        key={r.key}
                        className="flex justify-between gap-2 font-mono text-xs text-zinc-600 dark:text-zinc-400"
                      >
                        <span className="min-w-0 truncate">{r.key}</span>
                        <span className="shrink-0">{r.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{obs?.error ?? 'Error'}</p>
        )}
        <button
          type="button"
          onClick={() => void fetchObs()}
          className="mt-4 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Refresh
        </button>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Admin audit log
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Config changes, support status, push actions, user management.
        </p>
        {auditError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{auditError}</p>}
        {auditLoading && auditItems.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Loading…</p>
        ) : auditItems.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No entries.</p>
        ) : (
          <ul className="mt-4 max-h-[min(60vh,480px)] space-y-2 overflow-y-auto text-sm">
            {auditItems.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/40"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-mono text-xs text-zinc-400">{row.id.slice(0, 10)}…</span>
                  <span className="text-xs text-zinc-500">
                    {new Date(row.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 font-medium text-zinc-800 dark:text-zinc-200">
                  <span className="text-zinc-500">{row.adminLogin}</span> · {row.action}
                </p>
                {row.metadata != null && (
                  <pre className="mt-2 max-h-32 overflow-auto rounded bg-white p-2 text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
                    {JSON.stringify(row.metadata, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
        {auditCursor && (
          <button
            type="button"
            disabled={auditLoading}
            onClick={() => void fetchAuditPage(true, auditCursor)}
            className="mt-4 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            {auditLoading ? 'Loading…' : 'Load more'}
          </button>
        )}
      </section>
    </div>
  );
}
