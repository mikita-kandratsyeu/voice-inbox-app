'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

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

type StatusResponse = {
  vercel: VercelStatus;
  upstash: UpstashStatus;
  app: { baseUrl: string; env: string; devicesWithPush?: number };
};

type BroadcastResult = { ok: true; sent: number; failed: number; total: number };

export function AdminDashboard() {
  const router = useRouter();
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

  useEffect(() => {
    fetchDeviceIds();
  }, [fetchDeviceIds]);

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
      if (res.ok) setSinglePushResult({ ok: true });
      else setSinglePushResult({ error: (data as { error?: string }).error ?? 'Failed' });
    } catch {
      setSinglePushResult({ error: 'Request failed' });
    } finally {
      setSinglePushLoading(false);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (res.ok) setBroadcastResult(data as BroadcastResult);
    } finally {
      setBroadcastLoading(false);
    }
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleString();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:max-w-6xl">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Logout
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 lg:min-h-0">
          <h2 className="mb-4 text-lg font-medium">Status</h2>
          {statusLoading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : status ? (
            <div className="space-y-4">
              <div>
                <h3 className="mb-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Vercel
                </h3>
                {status.vercel.ok ? (
                  <div className="space-y-3 text-sm">
                    {status.vercel.deployments?.length ? (
                      <ul className="space-y-3">
                        {status.vercel.deployments.map((d) => (
                          <li
                            key={d.uid}
                            className="rounded-lg border border-zinc-200 p-2.5 dark:border-zinc-600"
                          >
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="font-mono text-zinc-500">{d.uid.slice(0, 8)}</span>
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
                              {d.branch && (
                                <span className="text-zinc-500">branch: {d.branch}</span>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                              {formatDate(d.created)}
                              {d.source && ` · ${d.source}`}
                              {d.name && ` · ${d.name}`}
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
                              <div className="mt-0.5">
                                <a
                                  href={d.inspectorUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-400"
                                >
                                  Inspect
                                </a>
                              </div>
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
                    {status.vercel.error ?? 'Not configured'}
                  </p>
                )}
              </div>
              <div>
                <h3 className="mb-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Upstash
                </h3>
                {status.upstash.ok ? (
                  <p className="text-sm text-green-600 dark:text-green-400">Connected</p>
                ) : (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {status.upstash.error ?? 'Disconnected'}
                  </p>
                )}
              </div>
              <div className="border-t border-zinc-200 pt-3 dark:border-zinc-600">
                <p className="text-xs text-zinc-500">
                  App: {status.app.baseUrl || '—'} · {status.app.env}
                  {typeof status.app.devicesWithPush === 'number' && (
                    <> · Devices with push: {status.app.devicesWithPush}</>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Failed to load status</p>
          )}
          <button
            type="button"
            onClick={() => fetchStatus()}
            className="mt-3 text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-400"
          >
            Refresh
          </button>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 lg:min-h-0">
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
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{singlePushResult.error}</p>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 lg:mt-8">
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
          <div className="xl:col-span-2">
            <button
              type="submit"
              disabled={broadcastLoading}
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
      </section>
    </div>
  );
}
