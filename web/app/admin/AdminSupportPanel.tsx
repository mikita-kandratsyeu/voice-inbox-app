'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  AdminAlert,
  AdminCard,
  AdminEmptyState,
  AdminStatusBadge,
  AdminSubNav,
  adminBtnGhostClass,
  adminBtnPrimaryClass,
  adminBtnSecondaryClass,
  adminInputClass,
  adminSelectClass,
} from './admin-ui';
import {
  formatSupportProKeySentLabel,
  PRO_LICENSE_DURATION_OPTIONS,
  proLicenseDurationSelectToRequestBody,
} from '@/lib/pro-license-duration-form';
import { isSupportProKeyRequestSubject } from '@/lib/support-pro-key-request';

const PUSH_MESSAGE_MAX = 3500;

const SUPPORT_STATUS_FILTERS = [
  { id: 'open', label: 'Open' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' },
] as const;

function guessLocaleFromDiagnostics(diagnostics: unknown): 'en' | 'ru' | undefined {
  if (!diagnostics || typeof diagnostics !== 'object') return undefined;
  const locales = (diagnostics as { locales?: unknown }).locales;
  if (!Array.isArray(locales) || locales.length === 0) return undefined;
  const first = locales[0];
  if (!first || typeof first !== 'object' || !('languageCode' in first)) return undefined;
  const code = String((first as { languageCode: unknown }).languageCode).toLowerCase();
  if (code === 'ru' || code === 'en') return code;
  return undefined;
}

function supportPushNotificationCopy(locale: 'en' | 'ru' | undefined): {
  title: string;
  body: string;
} {
  if (locale === 'ru') {
    return {
      title: 'Voice Inbox AI',
      body: 'Ответ по вашему обращению в поддержку. Откройте приложение.',
    };
  }
  return {
    title: 'Voice Inbox AI',
    body: 'Reply to your support request. Open the app to read.',
  };
}

type ReplyDraft = {
  markdown: string;
  resolutionHint: string;
  locale: 'auto' | 'en' | 'ru';
};

type SupportItem = {
  id: string;
  reference: string;
  deviceId: string;
  email: string | null;
  subject: string | null;
  message: string;
  diagnostics: unknown;
  appLogs: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  proLicenseEmailSentAt: string | null;
  proLicenseDurationMonths: number | null;
  proLicenseDurationDays: number | null;
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
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, ReplyDraft>>({});
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [pushLoadingId, setPushLoadingId] = useState<string | null>(null);
  const [emailLoadingId, setEmailLoadingId] = useState<string | null>(null);
  const [inlineSuccessId, setInlineSuccessId] = useState<string | null>(null);
  const [inlineEmailSuccessId, setInlineEmailSuccessId] = useState<string | null>(null);
  const [supportProKeyDuration, setSupportProKeyDuration] = useState<Record<string, string>>({});
  const [supportProKeySendingId, setSupportProKeySendingId] = useState<string | null>(null);
  const [appLogsById, setAppLogsById] = useState<Record<string, string | null>>({});
  const [appLogsLoadingId, setAppLogsLoadingId] = useState<string | null>(null);

  const loadAppLogs = useCallback(
    async (issueId: string) => {
      if (appLogsById[issueId] !== undefined) {
        return;
      }
      setAppLogsLoadingId(issueId);
      try {
        const res = await fetch(`/api/admin/support/${issueId}`, { credentials: 'include' });
        const data = (await res.json()) as { ok?: boolean; appLogs?: string | null };
        if (data.ok) {
          setAppLogsById((prev) => ({ ...prev, [issueId]: data.appLogs ?? null }));
        }
      } finally {
        setAppLogsLoadingId(null);
      }
    },
    [appLogsById],
  );

  const toggleIssueLogs = useCallback(
    (issueId: string, isOpen: boolean) => {
      if (isOpen) {
        setExpanded(null);
        return;
      }
      setExpanded(issueId);
      void loadAppLogs(issueId);
    },
    [loadAppLogs],
  );

  const getDraft = useCallback(
    (id: string): ReplyDraft =>
      replyDrafts[id] ?? { markdown: '', resolutionHint: '', locale: 'auto' },
    [replyDrafts],
  );

  const setDraftField = useCallback((id: string, patch: Partial<ReplyDraft>) => {
    setReplyDrafts((prev) => {
      const base: ReplyDraft = prev[id] ?? {
        markdown: '',
        resolutionHint: '',
        locale: 'auto',
      };
      return { ...prev, [id]: { ...base, ...patch } };
    });
  }, []);

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
        const mapped = data.items!.map((item) => ({
          ...item,
          proLicenseEmailSentAt: item.proLicenseEmailSentAt ?? null,
          proLicenseDurationMonths: item.proLicenseDurationMonths ?? null,
          proLicenseDurationDays: item.proLicenseDurationDays ?? null,
        }));
        setItems((prev) => (append ? [...prev, ...mapped] : mapped));
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

  const handleGenerateDraft = async (row: SupportItem) => {
    const d = getDraft(row.id);
    setAiLoadingId(row.id);
    setError(null);
    try {
      const localeForApi =
        d.locale === 'auto' ? guessLocaleFromDiagnostics(row.diagnostics) : d.locale;
      const res = await fetch('/api/admin/ai/support-reply-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject: row.subject,
          message: row.message,
          resolutionHint: d.resolutionHint.trim() || undefined,
          ...(localeForApi ? { locale: localeForApi } : {}),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; markdown?: string; error?: string };
      if (!res.ok || !data.ok || typeof data.markdown !== 'string') {
        setError(data.error ?? 'AI draft failed');
        return;
      }
      setDraftField(row.id, { markdown: data.markdown.slice(0, PUSH_MESSAGE_MAX) });
    } catch {
      setError('AI draft request failed');
    } finally {
      setAiLoadingId(null);
    }
  };

  const handleSendReplyEmail = async (row: SupportItem) => {
    const d = getDraft(row.id);
    const message = d.markdown.trim();
    if (!message) {
      setError('Add reply text (Markdown) before sending email.');
      return;
    }
    if (!row.email?.trim()) {
      setError('This request has no email — use push or ask the user to resubmit with an address.');
      return;
    }
    if (message.length > PUSH_MESSAGE_MAX) {
      setError(`Message is too long for email (max ${PUSH_MESSAGE_MAX} characters).`);
      return;
    }
    setEmailLoadingId(row.id);
    setError(null);
    setInlineEmailSuccessId(null);
    try {
      const localeForApi =
        d.locale === 'auto' ? (guessLocaleFromDiagnostics(row.diagnostics) ?? 'auto') : d.locale;
      const res = await fetch('/api/admin/support/send-reply-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          issueId: row.id,
          markdown: message,
          locale: localeForApi,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Email failed');
        return;
      }
      setInlineEmailSuccessId(row.id);
      setItems((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, status: 'closed', updatedAt: new Date().toISOString() } : r,
        ),
      );
      window.setTimeout(() => setInlineEmailSuccessId(null), 5000);
    } catch {
      setError('Email request failed');
    } finally {
      setEmailLoadingId(null);
    }
  };

  const handleSendPush = async (row: SupportItem) => {
    const d = getDraft(row.id);
    const message = d.markdown.trim();
    if (!message) {
      setError('Add in-app message text (Markdown) before sending.');
      return;
    }
    if (message.length > PUSH_MESSAGE_MAX) {
      setError(`Message is too long (max ${PUSH_MESSAGE_MAX} characters).`);
      return;
    }
    setPushLoadingId(row.id);
    setError(null);
    setInlineSuccessId(null);
    try {
      const notifyLocale =
        d.locale === 'auto' ? guessLocaleFromDiagnostics(row.diagnostics) : d.locale;
      const { title, body } = supportPushNotificationCopy(notifyLocale);
      const res = await fetch('/api/admin/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          deviceId: row.deviceId,
          type: 'policy_update',
          title,
          body,
          message,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Push failed');
        return;
      }
      setInlineSuccessId(row.id);
      window.setTimeout(() => setInlineSuccessId(null), 5000);
    } catch {
      setError('Push request failed');
    } finally {
      setPushLoadingId(null);
    }
  };

  const handleSendProKeyEmail = async (row: SupportItem) => {
    if (!row.email?.trim()) {
      setError('This request has no email — the user must resubmit with an address.');
      return;
    }
    const raw = supportProKeyDuration[row.id] ?? 'm:12';
    const bodyPayload = proLicenseDurationSelectToRequestBody(raw);
    if (!bodyPayload) {
      setError('Invalid duration');
      return;
    }
    setSupportProKeySendingId(row.id);
    setError(null);
    try {
      const res = await fetch('/api/admin/support/send-pro-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ issueId: row.id, ...bodyPayload }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Send failed');
        return;
      }
      const now = new Date().toISOString();
      setItems((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                status: 'closed',
                updatedAt: now,
                proLicenseEmailSentAt: now,
                proLicenseDurationMonths:
                  'durationMonths' in bodyPayload ? bodyPayload.durationMonths : null,
                proLicenseDurationDays:
                  'durationDays' in bodyPayload ? bodyPayload.durationDays : null,
              }
            : r,
        ),
      );
    } catch {
      setError('Request failed');
    } finally {
      setSupportProKeySendingId(null);
    }
  };

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
      <AdminCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <AdminSubNav
            items={SUPPORT_STATUS_FILTERS}
            value={statusFilter}
            onChange={(id) => {
              setStatusFilter(id);
            }}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center lg:max-w-xl lg:justify-end">
            <label className="sr-only" htmlFor="support-search">
              Search
            </label>
            <input
              id="support-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              autoComplete="off"
              className={`min-w-0 flex-1 ${adminInputClass}`}
            />
            <button
              type="button"
              onClick={() => {
                void fetchPage(false, null);
              }}
              className={`${adminBtnSecondaryClass} shrink-0`}
            >
              Refresh
            </button>
          </div>
        </div>
      </AdminCard>

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}

      {loading && items.length === 0 ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : items.length === 0 ? (
        <AdminEmptyState
          title={
            debouncedSearch ? 'No requests match this search.' : 'No requests for this filter.'
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((row) => {
            const isOpen = expanded === row.id;
            const isProKey = isSupportProKeyRequestSubject(row.subject);
            const showReply = replyOpenId === row.id;
            const deviceShort =
              row.deviceId.length > 12 ? `${row.deviceId.slice(0, 8)}…` : row.deviceId;

            return (
              <li
                key={row.id}
                className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80"
              >
                <div className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-medium text-zinc-500">
                          {row.reference}
                        </span>
                        {row.status === 'open' ? (
                          <AdminStatusBadge tone="success">Open</AdminStatusBadge>
                        ) : (
                          <AdminStatusBadge tone="neutral">Closed</AdminStatusBadge>
                        )}
                        {isProKey ? <AdminStatusBadge tone="info">Pro key</AdminStatusBadge> : null}
                      </div>
                      <p className="text-xs text-zinc-500">
                        {formatDate(row.createdAt)}
                        {row.email ? ` · ${row.email}` : ''}
                        <span className="text-zinc-400"> · </span>
                        <span className="font-mono">{deviceShort}</span>
                      </p>
                      {row.subject ? (
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {row.subject}
                        </p>
                      ) : null}
                      <p
                        className={`text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 ${
                          isOpen || showReply ? 'whitespace-pre-wrap' : 'line-clamp-2'
                        }`}
                      >
                        {row.message}
                      </p>
                      {isProKey && row.proLicenseEmailSentAt ? (
                        <p className="text-xs text-teal-700 dark:text-teal-300">
                          Pro key sent (
                          {formatSupportProKeySentLabel(
                            row.proLicenseDurationMonths,
                            row.proLicenseDurationDays,
                          )}
                          ) · {formatDate(row.proLicenseEmailSentAt)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                      <label className="sr-only" htmlFor={`status-${row.id}`}>
                        Status
                      </label>
                      <select
                        id={`status-${row.id}`}
                        value={row.status}
                        disabled={patching === row.id}
                        onChange={(e) =>
                          void handlePatch(row.id, e.target.value as 'open' | 'closed')
                        }
                        className={`${adminSelectClass} w-[6.5rem]`}
                      >
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => toggleIssueLogs(row.id, isOpen)}
                        className={adminBtnGhostClass}
                      >
                        {isOpen ? 'Hide logs' : 'Logs'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyOpenId(showReply ? null : row.id)}
                        className={
                          showReply
                            ? `${adminBtnSecondaryClass} ring-2 ring-violet-500/30`
                            : adminBtnSecondaryClass
                        }
                      >
                        {showReply ? 'Hide reply' : 'Reply'}
                      </button>
                    </div>
                  </div>

                  {isProKey && !row.proLicenseEmailSentAt ? (
                    <div className="mt-3 rounded-lg border border-teal-200/80 bg-teal-50/60 px-3 py-2.5 dark:border-teal-900/40 dark:bg-teal-950/20">
                      {!row.email ? (
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                          No email — ask the user to resubmit with an address.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                          <p className="min-w-0 flex-1 text-xs text-teal-900 dark:text-teal-200">
                            Email Pro key to {row.email}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={supportProKeyDuration[row.id] ?? 'm:12'}
                              onChange={(e) =>
                                setSupportProKeyDuration((prev) => ({
                                  ...prev,
                                  [row.id]: e.target.value,
                                }))
                              }
                              className={adminSelectClass}
                            >
                              {PRO_LICENSE_DURATION_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={supportProKeySendingId === row.id}
                              onClick={() => void handleSendProKeyEmail(row)}
                              className={adminBtnPrimaryClass}
                            >
                              {supportProKeySendingId === row.id ? 'Sending…' : 'Send key'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
                {showReply && (
                  <div className="space-y-3 border-t border-violet-100 bg-violet-50/40 p-4 dark:border-violet-900/40 dark:bg-violet-950/15">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Push delivers in-app Markdown; email sends the same text to{' '}
                      {row.email ?? 'the user'} (SMTP required).
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label
                          className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                          htmlFor={`hint-${row.id}`}
                        >
                          Resolution notes (optional, for AI only)
                        </label>
                        <textarea
                          id={`hint-${row.id}`}
                          value={getDraft(row.id).resolutionHint}
                          onChange={(e) =>
                            setDraftField(row.id, { resolutionHint: e.target.value })
                          }
                          rows={2}
                          placeholder="e.g. Fixed sync on server, please reopen the app"
                          className={adminInputClass}
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                          htmlFor={`locale-${row.id}`}
                        >
                          Reply language hint (AI)
                        </label>
                        <select
                          id={`locale-${row.id}`}
                          value={getDraft(row.id).locale}
                          onChange={(e) =>
                            setDraftField(row.id, {
                              locale: e.target.value as ReplyDraft['locale'],
                            })
                          }
                          className={adminSelectClass}
                        >
                          <option value="auto">
                            Auto ({guessLocaleFromDiagnostics(row.diagnostics) ?? 'from message'})
                          </option>
                          <option value="en">English</option>
                          <option value="ru">Russian</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          disabled={aiLoadingId === row.id}
                          onClick={() => void handleGenerateDraft(row)}
                          className={`${adminBtnSecondaryClass} w-full`}
                        >
                          {aiLoadingId === row.id ? 'Generating…' : 'AI draft'}
                        </button>
                      </div>
                      <div className="sm:col-span-2">
                        <label
                          className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                          htmlFor={`md-${row.id}`}
                        >
                          Reply message (Markdown, max {PUSH_MESSAGE_MAX})
                        </label>
                        <textarea
                          id={`md-${row.id}`}
                          value={getDraft(row.id).markdown}
                          onChange={(e) => setDraftField(row.id, { markdown: e.target.value })}
                          rows={8}
                          placeholder={'## What we changed\n\n- …'}
                          className={`${adminInputClass} font-mono`}
                        />
                        <p className="mt-1 text-xs text-zinc-500">
                          {getDraft(row.id).markdown.length} / {PUSH_MESSAGE_MAX}
                        </p>
                      </div>
                    </div>
                    {inlineSuccessId === row.id && (
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        Push sent to this device.
                      </p>
                    )}
                    {inlineEmailSuccessId === row.id && (
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        Email sent to {row.email}.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pushLoadingId === row.id}
                        onClick={() => void handleSendPush(row)}
                        className={adminBtnPrimaryClass}
                      >
                        {pushLoadingId === row.id ? 'Sending…' : 'Send push'}
                      </button>
                      <button
                        type="button"
                        disabled={emailLoadingId === row.id || !row.email?.trim()}
                        onClick={() => void handleSendReplyEmail(row)}
                        className={adminBtnSecondaryClass}
                      >
                        {emailLoadingId === row.id ? 'Sending…' : 'Send email'}
                      </button>
                    </div>
                  </div>
                )}
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
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Extra logs from user
                      </p>
                      {appLogsLoadingId === row.id ? (
                        <p className="text-xs text-zinc-500">Loading logs…</p>
                      ) : appLogsById[row.id] ? (
                        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200">
                          {appLogsById[row.id]}
                        </pre>
                      ) : appLogsById[row.id] === null ? (
                        <p className="text-xs text-zinc-500">No extra logs attached.</p>
                      ) : null}
                    </div>
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
            className={adminBtnSecondaryClass}
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
