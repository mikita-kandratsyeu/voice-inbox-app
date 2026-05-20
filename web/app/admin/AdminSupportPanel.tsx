'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  AdminEmptyState,
  AdminPanelHeading,
  adminBtnPrimaryClass,
  adminBtnSecondaryClass,
  adminInputClass,
  adminSelectClass,
} from './admin-ui';
import {
  formatSupportProKeySentLabel,
  proLicenseDurationSelectToRequestBody,
} from '@/lib/pro-license-duration-form';
import {
  isSupportProKeyRequestSubject,
  SUPPORT_PRO_KEY_SUBJECT_MARKER,
} from '@/lib/support-pro-key-request';

const PUSH_MESSAGE_MAX = 3500;

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
      <AdminPanelHeading
        title="Support requests"
        description="Messages from the in-app form (device diagnostics attached)."
        actions={
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
              className={`min-w-0 flex-1 sm:min-w-[220px] sm:max-w-md ${adminInputClass}`}
            />
            <label className="sr-only" htmlFor="support-filter">
              Status
            </label>
            <select
              id="support-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'open' | 'closed')}
              className={adminSelectClass}
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
              className={adminBtnSecondaryClass}
            >
              Refresh
            </button>
          </div>
        }
      />

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

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
            return (
              <li
                key={row.id}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80"
              >
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-zinc-400">{row.reference}</span>
                      <span
                        className={
                          row.status === 'open'
                            ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                            : 'rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200'
                        }
                      >
                        {row.status}
                      </span>
                      {isSupportProKeyRequestSubject(row.subject) && (
                        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-900 dark:bg-teal-950/60 dark:text-teal-200">
                          Pro key ({SUPPORT_PRO_KEY_SUBJECT_MARKER})
                        </span>
                      )}
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
                    {isSupportProKeyRequestSubject(row.subject) && (
                      <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/80 p-3 dark:border-teal-900/50 dark:bg-teal-950/25">
                        {row.proLicenseEmailSentAt ? (
                          <p className="text-xs font-medium text-teal-900 dark:text-teal-200">
                            Pro key emailed (
                            {formatSupportProKeySentLabel(
                              row.proLicenseDurationMonths,
                              row.proLicenseDurationDays,
                            )}
                            ) — {formatDate(row.proLicenseEmailSentAt)}. Ticket closed.
                          </p>
                        ) : !row.email ? (
                          <p className="text-xs text-amber-800 dark:text-amber-200">
                            No email on file. Ask the user to send support again with an email
                            address.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                            <p className="text-xs text-teal-900 dark:text-teal-200">
                              Send a license key to {row.email} (HTML email via SMTP).
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
                                className="rounded-lg border border-teal-200 bg-white px-2 py-1.5 text-sm dark:border-teal-800 dark:bg-zinc-900 dark:text-zinc-100"
                              >
                                <option value="d:1">1 day</option>
                                <option value="d:7">7 days</option>
                                <option value="d:14">14 days</option>
                                <option value="m:1">1 mo</option>
                                <option value="m:3">3 mo</option>
                                <option value="m:6">6 mo</option>
                                <option value="m:12">12 mo</option>
                              </select>
                              <button
                                type="button"
                                disabled={supportProKeySendingId === row.id}
                                onClick={() => void handleSendProKeyEmail(row)}
                                className={adminBtnPrimaryClass}
                              >
                                {supportProKeySendingId === row.id ? 'Sending…' : 'Email Pro key'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
                      onClick={() => {
                        setExpanded(isOpen ? null : row.id);
                      }}
                      className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {isOpen ? 'Hide details' : 'Diagnostics & logs'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyOpenId((cur) => (cur === row.id ? null : row.id))}
                      className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
                    >
                      {replyOpenId === row.id ? 'Hide reply' : 'Reply to user'}
                    </button>
                  </div>
                </div>
                {replyOpenId === row.id && (
                  <div className="space-y-3 border-t border-violet-100 bg-violet-50/50 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      <strong>Push</strong> — <span className="font-mono">policy_update</span>{' '}
                      notification + in-app Markdown sheet. <strong>Email</strong> — sends the
                      Markdown below to {row.email ?? 'the user’s address'} (requires SMTP).
                      Optional notes are only for AI draft generation.
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
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
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
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
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
                          className="w-full rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm font-medium text-violet-800 shadow-sm hover:bg-violet-50 disabled:opacity-50 dark:border-violet-700 dark:bg-violet-950/80 dark:text-violet-200 dark:hover:bg-violet-900/60"
                        >
                          {aiLoadingId === row.id ? 'Generating…' : 'Generate Markdown (AI)'}
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
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
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
                        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-50 dark:bg-violet-700 dark:hover:bg-violet-600"
                      >
                        {pushLoadingId === row.id ? 'Sending…' : 'Send push'}
                      </button>
                      <button
                        type="button"
                        disabled={emailLoadingId === row.id || !row.email?.trim()}
                        onClick={() => void handleSendReplyEmail(row)}
                        className="rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-900 shadow-sm hover:bg-violet-50 disabled:opacity-50 dark:border-violet-700 dark:bg-violet-950/80 dark:text-violet-100 dark:hover:bg-violet-900/60"
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
