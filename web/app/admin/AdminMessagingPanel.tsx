'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  AdminCard,
  adminBtnPrimaryClass,
  adminBtnSecondaryClass,
  adminInputClass,
  adminSelectClass,
} from './admin-ui';

type BroadcastResult = { ok: true; sent: number; failed: number; total: number };

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

type StatusResponse = {
  app: { devicesWithPush?: number };
};

const NOTIFY_TYPES = [
  { value: 'policy_update', label: 'Policy update' },
  { value: 'limit_warning', label: 'Limit warning' },
  { value: 'limit_exceeded', label: 'Limit exceeded' },
  { value: 'ai_complete', label: 'AI complete' },
] as const;

export function AdminMessagingPanel() {
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
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
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
    void fetchDeviceIds();
    void fetchStatus();
    void fetchBroadcastHistory();
  }, [fetchDeviceIds, fetchStatus, fetchBroadcastHistory]);

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
        void fetchStatus();
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

  return (
    <div className="space-y-8">
      <AdminCard title="Send to one device">
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
              {NOTIFY_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
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
          <button type="submit" disabled={singlePushLoading} className={adminBtnPrimaryClass}>
            {singlePushLoading ? 'Sending…' : 'Send push'}
          </button>
        </form>
        {singlePushResult && 'ok' in singlePushResult && singlePushResult.ok && (
          <p className="mt-3 text-sm text-green-600 dark:text-green-400">Push sent.</p>
        )}
        {singlePushResult && 'error' in singlePushResult && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{singlePushResult.error}</p>
        )}
      </AdminCard>

      <AdminCard
        title="Push broadcast"
        description="Copy is selected per device from its registered push locale (English or Russian). If a field is empty in that language, the English version is used when available, then Firebase defaults."
      >
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
              {NOTIFY_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
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
                    className={adminBtnSecondaryClass}
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
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Preview</p>
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
                    <dt className="text-xs font-semibold uppercase text-zinc-500">Locale {loc}</dt>
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
                I confirm sending this broadcast to all registered push devices (see recipient count
                above).
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
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{h.kind}</span>
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
                  {h.title ? (
                    <p className="mt-0.5 text-zinc-700 dark:text-zinc-300">{h.title}</p>
                  ) : null}
                  {h.errorSample && (
                    <p className="mt-1 text-red-600 dark:text-red-400">{h.errorSample}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </AdminCard>
    </div>
  );
}
