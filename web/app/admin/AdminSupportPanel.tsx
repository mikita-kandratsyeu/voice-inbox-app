'use client';

import { useCallback, useEffect, useState } from 'react';

type SupportItem = {
  id: string;
  deviceId: string;
  email: string | null;
  subject: string | null;
  message: string;
  diagnostics: unknown;
  appLogs: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = {
  ok: boolean;
  items?: SupportItem[];
  nextCursor?: string | null;
  error?: string;
};

export function AdminSupportPanel() {
  const [items, setItems] = useState<SupportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('open');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [patching, setPatching] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    async (append: boolean, cursorForNext: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: '25', status: statusFilter });
        if (debouncedSearch) params.set('q', debouncedSearch);
        if (append && cursorForNext) params.set('cursor', cursorForNext);
        const res = await fetch(`/api/admin/support?${params}`, { credentials: 'include' });
        const data = (await res.json()) as ListResponse;
        if (!data.ok || !data.items) {
          setError(data.error ?? 'Failed to load');
          return;
        }
        setItems((prev) => (append ? [...prev, ...data.items!] : data.items!));
        setNextCursor(data.nextCursor ?? null);
      } catch {
        setError('Request failed');
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, debouncedSearch],
  );

  useEffect(() => {
    void fetchPage(false, null);
  }, [fetchPage]);

  const handlePatch = async (id: string, status: 'open' | 'closed') => {
    setPatching(id);
    try {
      const res = await fetch('/api/admin/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, status }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Update failed');
        return;
      }
      setItems((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r)),
      );
    } catch {
      setError('Update failed');
    } finally {
      setPatching(null);
    }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleString();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Support requests
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Messages from the in-app form (device diagnostics attached).
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <label className="sr-only" htmlFor="support-search">
            Search
          </label>
          <input
            id="support-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search device, email, subject, message…"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 sm:min-w-[220px] sm:max-w-md"
          />
          <label className="sr-only" htmlFor="support-filter">
            Status
          </label>
          <select
            id="support-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'open' | 'closed')}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
          <button
            type="button"
            onClick={() => {
              void fetchPage(false, null);
            }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      {loading && items.length === 0 ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
          {debouncedSearch ? 'No requests match this search.' : 'No requests for this filter.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((row) => {
            const isOpen = expanded === row.id;
            return (
              <li
                key={row.id}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80"
              >
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-zinc-400">
                        {row.id.slice(0, 12)}…
                      </span>
                      <span
                        className={
                          row.status === 'open'
                            ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                            : 'rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200'
                        }
                      >
                        {row.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">{formatDate(row.createdAt)}</p>
                    {row.subject && (
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.subject}</p>
                    )}
                    <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                      {row.message}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                      <span>
                        <span className="font-medium text-zinc-400">Device</span>{' '}
                        <span className="font-mono text-zinc-600 dark:text-zinc-400">
                          {row.deviceId}
                        </span>
                      </span>
                      {row.email && (
                        <span>
                          <span className="font-medium text-zinc-400">Email</span> {row.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <label className="sr-only" htmlFor={`status-${row.id}`}>
                      Update status
                    </label>
                    <select
                      id={`status-${row.id}`}
                      value={row.status}
                      disabled={patching === row.id}
                      onChange={(e) =>
                        void handlePatch(row.id, e.target.value as 'open' | 'closed')
                      }
                      className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : row.id)}
                      className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {isOpen ? 'Hide details' : 'Diagnostics & logs'}
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="space-y-3 border-t border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-700/80 dark:bg-zinc-900/40">
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Diagnostics (JSON)
                      </p>
                      <pre className="max-h-64 overflow-auto rounded-lg border border-zinc-200 bg-white p-3 text-xs leading-relaxed text-zinc-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200">
                        {JSON.stringify(row.diagnostics, null, 2)}
                      </pre>
                    </div>
                    {row.appLogs && (
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          Extra logs from user
                        </p>
                        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200">
                          {row.appLogs}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {nextCursor && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void fetchPage(true, nextCursor)}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
