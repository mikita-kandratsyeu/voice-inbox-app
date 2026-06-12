'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  TrendingUp,
  XCircle,
} from 'lucide-react';

import {
  AdminAlert,
  AdminCard,
  AdminEmptyState,
  AdminMetricCard,
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

type SupportStats = {
  total: number;
  open: number;
  closed: number;
  avgResponseTime: number | null;
};

function calculateStats(items: SupportItem[]): SupportStats {
  const total = items.length;
  const open = items.filter((i) => i.status === 'open').length;
  const closed = items.filter((i) => i.status === 'closed').length;

  // Calculate average response time for closed tickets (in hours)
  const closedWithTime = items.filter((i) => i.status === 'closed' && i.createdAt && i.updatedAt);
  let avgResponseTime: number | null = null;
  if (closedWithTime.length > 0) {
    const totalTime = closedWithTime.reduce((sum, item) => {
      const created = new Date(item.createdAt).getTime();
      const updated = new Date(item.updatedAt).getTime();
      return sum + (updated - created);
    }, 0);
    avgResponseTime = totalTime / closedWithTime.length / (1000 * 60 * 60); // Convert to hours
  }

  return { total, open, closed, avgResponseTime };
}

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
  const formatRelativeTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  const stats = calculateStats(items);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard title="Total Tickets" icon={BarChart3}>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {stats.total}
            </span>
            <span className="text-sm text-zinc-500">requests</span>
          </div>
        </AdminMetricCard>

        <AdminMetricCard title="Open Issues" icon={MessageSquare}>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.open}
            </span>
            <span className="text-sm text-zinc-500">active</span>
          </div>
        </AdminMetricCard>

        <AdminMetricCard title="Resolved" icon={CheckCircle2}>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {stats.closed}
            </span>
            <span className="text-sm text-zinc-500">completed</span>
          </div>
        </AdminMetricCard>

        <AdminMetricCard title="Avg Response Time" icon={Clock}>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-violet-600 dark:text-violet-400">
              {stats.avgResponseTime ? Math.round(stats.avgResponseTime) : '—'}
            </span>
            <span className="text-sm text-zinc-500">hours</span>
          </div>
        </AdminMetricCard>
      </div>

      {/* Filters and Search */}
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
              placeholder="Search tickets by reference, email, or message..."
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
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="mt-2 text-sm text-zinc-500">Loading tickets...</p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <AdminEmptyState
          title={debouncedSearch ? 'No tickets match this search.' : 'No tickets for this filter.'}
          hint="Tickets will appear here when users submit support requests."
        />
      ) : (
        <div className="space-y-3">
          {items.map((row) => {
            const isOpen = expanded === row.id;
            const isProKey = isSupportProKeyRequestSubject(row.subject);
            const showReply = replyOpenId === row.id;
            const deviceShort =
              row.deviceId.length > 12 ? `${row.deviceId.slice(0, 8)}…` : row.deviceId;

            return (
              <article
                key={row.id}
                className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/80"
              >
                {/* Ticket Header */}
                <div className="border-b border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-200/80 px-2 py-1 font-mono text-xs font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                      #{row.reference}
                    </span>
                    {row.status === 'open' ? (
                      <AdminStatusBadge tone="success">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
                        Open
                      </AdminStatusBadge>
                    ) : (
                      <AdminStatusBadge tone="neutral">
                        <CheckCircle2 className="h-3 w-3" />
                        Closed
                      </AdminStatusBadge>
                    )}
                    {isProKey ? (
                      <AdminStatusBadge tone="info">
                        <TrendingUp className="h-3 w-3" />
                        Pro Key Request
                      </AdminStatusBadge>
                    ) : null}
                    <span className="ml-auto text-xs text-zinc-500">
                      {formatRelativeTime(row.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Ticket Body */}
                <div className="p-4">
                  <div className="flex flex-col gap-4">
                    {/* Subject and Metadata */}
                    <div className="space-y-2">
                      {row.subject ? (
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                          {row.subject}
                        </h3>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(row.createdAt)}
                        </span>
                        {row.email ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {row.email}
                          </span>
                        ) : null}
                        <span className="font-mono text-zinc-400">{deviceShort}</span>
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <p
                        className={`text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 ${
                          isOpen || showReply ? 'whitespace-pre-wrap' : 'line-clamp-3'
                        }`}
                      >
                        {row.message}
                      </p>
                    </div>

                    {/* Pro Key Sent Notice */}
                    {isProKey && row.proLicenseEmailSentAt ? (
                      <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/60 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                        <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
                          Pro key sent (
                          {formatSupportProKeySentLabel(
                            row.proLicenseDurationMonths,
                            row.proLicenseDurationDays,
                          )}
                          ) · {formatDate(row.proLicenseEmailSentAt)}
                        </p>
                      </div>
                    ) : null}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
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
                        className={`${adminSelectClass} w-auto`}
                      >
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => toggleIssueLogs(row.id, isOpen)}
                        className={adminBtnGhostClass}
                      >
                        {isOpen ? 'Hide details' : 'View details'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyOpenId(showReply ? null : row.id)}
                        className={showReply ? `${adminBtnPrimaryClass}` : adminBtnSecondaryClass}
                      >
                        {showReply ? 'Hide reply' : 'Reply'}
                      </button>
                    </div>

                    {/* Pro Key Send Section */}
                    {isProKey && !row.proLicenseEmailSentAt ? (
                      <div className="rounded-lg border border-teal-200/80 bg-teal-50/60 px-3 py-3 dark:border-teal-900/40 dark:bg-teal-950/20">
                        {!row.email ? (
                          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                            No email — ask the user to resubmit with an address.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                            <p className="min-w-0 flex-1 text-xs font-medium text-teal-900 dark:text-teal-200">
                              Send Pro key to {row.email}
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
                                className={`${adminSelectClass} w-auto`}
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
                </div>

                {/* Reply Section */}
                {showReply && (
                  <div className="space-y-4 border-t border-violet-100 bg-violet-50/40 p-4 dark:border-violet-900/40 dark:bg-violet-950/15">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      <h4 className="text-sm font-semibold text-violet-900 dark:text-violet-100">
                        Compose Reply
                      </h4>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Push delivers in-app Markdown; email sends the same text to{' '}
                      {row.email ?? 'the user'} (SMTP required).
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label
                          className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
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
                          className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
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
                          {aiLoadingId === row.id ? 'Generating…' : 'Generate AI draft'}
                        </button>
                      </div>
                      <div className="sm:col-span-2">
                        <label
                          className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
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
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                          Push notification sent successfully.
                        </p>
                      </div>
                    )}
                    {inlineEmailSuccessId === row.id && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                          Email sent to {row.email}.
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pushLoadingId === row.id}
                        onClick={() => void handleSendPush(row)}
                        className={adminBtnPrimaryClass}
                      >
                        {pushLoadingId === row.id ? 'Sending…' : 'Send push notification'}
                      </button>
                      <button
                        type="button"
                        disabled={emailLoadingId === row.id || !row.email?.trim()}
                        onClick={() => void handleSendReplyEmail(row)}
                        className={adminBtnSecondaryClass}
                      >
                        {emailLoadingId === row.id ? 'Sending…' : 'Send email reply'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Details Section (Logs & Diagnostics) */}
                {isOpen && (
                  <div className="space-y-4 border-t border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-700/80 dark:bg-zinc-900/40">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-indigo-500"></div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                          Diagnostics (JSON)
                        </h4>
                      </div>
                      <pre className="max-h-64 overflow-auto rounded-lg border border-zinc-200 bg-white p-3 text-xs leading-relaxed text-zinc-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200">
                        {JSON.stringify(row.diagnostics, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-violet-500"></div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                          Application Logs
                        </h4>
                      </div>
                      {appLogsLoadingId === row.id ? (
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <div className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-indigo-600 border-r-transparent"></div>
                          Loading logs…
                        </div>
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
              </article>
            );
          })}
        </div>
      )}

      {nextCursor && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            disabled={loading}
            onClick={() => void fetchPage(true, nextCursor)}
            className={`${adminBtnSecondaryClass} px-6`}
          >
            {loading ? 'Loading…' : 'Load more tickets'}
          </button>
        </div>
      )}
    </div>
  );
}
