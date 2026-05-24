'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  AdminAlert,
  AdminCard,
  AdminDetailsSection,
  AdminFormField,
  AdminStatusBadge,
  adminBtnGhostClass,
  adminBtnPrimaryClass,
  adminBtnSecondaryClass,
  adminInputClass,
  adminSelectClass,
  formatAdminDate,
} from './admin-ui';
import {
  formatProLicenseRowDuration,
  PRO_LICENSE_DURATION_OPTIONS,
  proLicenseDurationSelectToRequestBody,
} from '@/lib/pro-license-duration-form';
import { SUPPORT_PRO_KEY_SUBJECT_MARKER } from '@/lib/support-pro-key-request';

type ProLicenseStats = {
  totalKeys: number;
  unusedKeys: number;
  redeemedKeys: number;
  redeemedLast7Days: number;
  redeemedLast30Days: number;
  devicesWithActivePro: number;
};

type ProLicensePagination = {
  page: number;
  pageSize: number;
  totalFiltered: number;
  totalPages: number;
};

type ProLicenseRow = {
  id: string;
  durationMonths: number;
  durationDays: number | null;
  createdAt: string;
  issuedToEmail?: string | null;
  adminNotes?: string | null;
  consumed: boolean;
  consumedAt: string | null;
  nominalGrantEndsAt?: string | null;
  deviceProExpiresAt?: string | null;
  deviceProActive?: boolean;
  devicePrefix: string | null;
};

type ProKeyRequestRow = {
  id: string;
  reference: string;
  email: string;
  subject: string | null;
  messagePreview: string;
  createdAt: string;
};

function ProDurationSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? adminSelectClass}
    >
      {PRO_LICENSE_DURATION_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

const STAT_LABELS: { key: keyof ProLicenseStats; label: string }[] = [
  { key: 'totalKeys', label: 'Total' },
  { key: 'unusedKeys', label: 'Unused' },
  { key: 'redeemedKeys', label: 'Redeemed' },
  { key: 'redeemedLast7Days', label: '7d' },
  { key: 'redeemedLast30Days', label: '30d' },
  { key: 'devicesWithActivePro', label: 'Devices in Pro' },
];

export function AdminProLicensesPanel() {
  const [duration, setDuration] = useState('m:12');
  const [generating, setGenerating] = useState(false);
  const [plainKey, setPlainKey] = useState<string | null>(null);
  const [list, setList] = useState<ProLicenseRow[]>([]);
  const [stats, setStats] = useState<ProLicenseStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unused' | 'redeemed'>('all');
  const [deviceProFilter, setDeviceProFilter] = useState<'any' | 'active' | 'inactive'>('any');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [pagination, setPagination] = useState<ProLicensePagination | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [notesEditingId, setNotesEditingId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [notesSavingId, setNotesSavingId] = useState<string | null>(null);

  const [keyRequests, setKeyRequests] = useState<ProKeyRequestRow[]>([]);
  const [keyRequestsLoading, setKeyRequestsLoading] = useState(false);
  const [keyRequestsError, setKeyRequestsError] = useState<string | null>(null);
  const [keyRequestDuration, setKeyRequestDuration] = useState<Record<string, string>>({});
  const [keySendingId, setKeySendingId] = useState<string | null>(null);
  const [keySendMessage, setKeySendMessage] = useState<string | null>(null);

  const [directEmail, setDirectEmail] = useState('');
  const [directDuration, setDirectDuration] = useState('m:12');
  const [directSending, setDirectSending] = useState(false);
  const [directError, setDirectError] = useState<string | null>(null);
  const [directSuccess, setDirectSuccess] = useState<string | null>(null);

  const [voucherCount, setVoucherCount] = useState('1');
  const [voucherDuration, setVoucherDuration] = useState('d:14');
  const [voucherLocale, setVoucherLocale] = useState<'en' | 'ru'>('en');
  const [voucherPrintSize, setVoucherPrintSize] = useState<'a4' | 'us-letter'>('a4');
  const [voucherOutput, setVoucherOutput] = useState<'print_pdf' | 'zip'>('print_pdf');
  const [voucherExtraNote, setVoucherExtraNote] = useState('');
  const [voucherPromoLabel, setVoucherPromoLabel] = useState('');
  const [voucherGenerating, setVoucherGenerating] = useState(false);
  const [voucherPreviewLoading, setVoucherPreviewLoading] = useState(false);
  const [voucherPreviewUrl, setVoucherPreviewUrl] = useState<string | null>(null);
  const voucherPreviewUrlRef = useRef<string | null>(null);
  const [voucherEmail, setVoucherEmail] = useState('');
  const [voucherEmailSending, setVoucherEmailSending] = useState(false);
  const [voucherMessage, setVoucherMessage] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        status: statusFilter,
        devicePro: deviceProFilter,
        page: String(page),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/admin/pro-licenses?${q}`, { credentials: 'include' });
      const data = (await res.json()) as {
        ok?: boolean;
        items?: ProLicenseRow[];
        stats?: ProLicenseStats;
        pagination?: ProLicensePagination;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Failed to load keys');
        setList([]);
        setStats(null);
        setPagination(null);
        return;
      }
      setList(Array.isArray(data.items) ? data.items : []);
      setStats(data.stats ?? null);
      if (data.pagination) {
        setPagination(data.pagination);
        setPage(data.pagination.page);
      } else {
        setPagination(null);
      }
    } catch {
      setError('Request failed');
      setList([]);
      setStats(null);
      setPagination(null);
    } finally {
      setListLoading(false);
    }
  }, [deviceProFilter, page, pageSize, statusFilter]);

  const fetchKeyRequests = useCallback(async () => {
    setKeyRequestsLoading(true);
    setKeyRequestsError(null);
    try {
      const res = await fetch('/api/admin/support/key-requests', { credentials: 'include' });
      const data = (await res.json()) as {
        ok?: boolean;
        items?: ProKeyRequestRow[];
        error?: string;
      };
      if (!res.ok || !data.ok || !data.items) {
        setKeyRequestsError(data.error ?? 'Failed to load key requests');
        setKeyRequests([]);
        return;
      }
      setKeyRequests(data.items);
      setKeyRequestDuration((prev) => {
        const next = { ...prev };
        for (const r of data.items!) {
          if (next[r.id] === undefined) next[r.id] = 'm:12';
        }
        return next;
      });
    } catch {
      setKeyRequestsError('Request failed');
      setKeyRequests([]);
    } finally {
      setKeyRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchList();
    void fetchKeyRequests();
  }, [fetchList, fetchKeyRequests]);

  useEffect(() => {
    return () => {
      if (voucherPreviewUrlRef.current) {
        URL.revokeObjectURL(voucherPreviewUrlRef.current);
      }
    };
  }, []);

  const setVoucherPreviewBlobUrl = (url: string | null) => {
    if (voucherPreviewUrlRef.current) {
      URL.revokeObjectURL(voucherPreviewUrlRef.current);
      voucherPreviewUrlRef.current = null;
    }
    if (url) voucherPreviewUrlRef.current = url;
    setVoucherPreviewUrl(url);
  };

  const handleGenerate = async () => {
    setError(null);
    setPlainKey(null);
    setGenerating(true);
    try {
      const bodyPayload = proLicenseDurationSelectToRequestBody(duration);
      if (!bodyPayload) {
        setError('Invalid duration');
        return;
      }
      const res = await fetch('/api/admin/pro-licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bodyPayload),
      });
      const data = (await res.json()) as { ok?: boolean; plainKey?: string; error?: string };
      if (!res.ok || !data.ok || !data.plainKey) {
        setError(data.error ?? 'Generate failed');
        return;
      }
      setPlainKey(data.plainKey);
      void fetchList();
    } catch {
      setError('Request failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (row: ProLicenseRow) => {
    if (row.consumed) return;
    if (!window.confirm('Delete this unused license key? This cannot be undone.')) return;
    setError(null);
    setDeletingId(row.id);
    try {
      const res = await fetch(`/api/admin/pro-licenses/${encodeURIComponent(row.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Delete failed');
        return;
      }
      void fetchList();
    } catch {
      setError('Request failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleReset = async (row: ProLicenseRow) => {
    if (!row.consumed) return;
    if (
      !window.confirm(
        'Reset this redeemed key? It becomes activatable again. Pro time on the previous device will be reduced by this key’s duration.',
      )
    ) {
      return;
    }
    setError(null);
    setResettingId(row.id);
    try {
      const res = await fetch(`/api/admin/pro-licenses/${encodeURIComponent(row.id)}/reset`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Reset failed');
        return;
      }
      void fetchList();
    } catch {
      setError('Request failed');
    } finally {
      setResettingId(null);
    }
  };

  const handleSaveNotes = async (row: ProLicenseRow) => {
    setError(null);
    setNotesSavingId(row.id);
    try {
      const res = await fetch(`/api/admin/pro-licenses/${encodeURIComponent(row.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ adminNotes: notesDraft.trim() || null }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Failed to save notes');
        return;
      }
      setNotesEditingId(null);
      setNotesDraft('');
      void fetchList();
    } catch {
      setError('Request failed');
    } finally {
      setNotesSavingId(null);
    }
  };

  const handleSendKeyFromSupport = async (row: ProKeyRequestRow) => {
    const raw = keyRequestDuration[row.id] ?? 'm:12';
    const bodyPayload = proLicenseDurationSelectToRequestBody(raw);
    if (!bodyPayload) {
      setKeyRequestsError('Invalid duration');
      return;
    }
    setKeySendMessage(null);
    setKeyRequestsError(null);
    setKeySendingId(row.id);
    try {
      const res = await fetch('/api/admin/support/send-pro-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ issueId: row.id, ...bodyPayload }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setKeyRequestsError(data.error ?? 'Send failed');
        return;
      }
      setKeySendMessage(`Key emailed to ${row.email} and ticket closed.`);
      void fetchKeyRequests();
      void fetchList();
    } catch {
      setKeyRequestsError('Request failed');
    } finally {
      setKeySendingId(null);
    }
  };

  const handleSendDirect = async () => {
    const email = directEmail.trim();
    if (!email) {
      setDirectError('Enter an email address');
      return;
    }
    const bodyPayload = proLicenseDurationSelectToRequestBody(directDuration);
    if (!bodyPayload) {
      setDirectError('Invalid duration');
      return;
    }
    setDirectError(null);
    setDirectSuccess(null);
    setDirectSending(true);
    try {
      const res = await fetch('/api/admin/pro-licenses/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, ...bodyPayload }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setDirectError(data.error ?? 'Send failed');
        return;
      }
      setDirectSuccess(`License key emailed to ${email}.`);
      void fetchList();
    } catch {
      setDirectError('Request failed');
    } finally {
      setDirectSending(false);
    }
  };

  const handlePreviewVoucher = async () => {
    setVoucherMessage(null);
    const bodyPayload = proLicenseDurationSelectToRequestBody(voucherDuration);
    if (!bodyPayload) {
      setVoucherMessage('Invalid duration.');
      return;
    }
    setVoucherPreviewLoading(true);
    try {
      const res = await fetch('/api/admin/pro-licenses/vouchers/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          locale: voucherLocale,
          printSize: voucherPrintSize,
          ...bodyPayload,
          ...(voucherPromoLabel.trim() ? { promoLabel: voucherPromoLabel.trim() } : {}),
        }),
      });
      if (!res.ok) {
        let err = 'Preview failed';
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) err = data.error;
        } catch {
          /* non-json */
        }
        setVoucherMessage(err);
        return;
      }
      const blob = await res.blob();
      setVoucherPreviewBlobUrl(URL.createObjectURL(blob));
    } catch {
      setVoucherMessage('Preview request failed');
    } finally {
      setVoucherPreviewLoading(false);
    }
  };

  const handleGenerateVouchers = async () => {
    setVoucherMessage(null);
    setError(null);
    const count = parseInt(voucherCount.trim(), 10);
    if (!Number.isFinite(count) || count < 1 || count > 50) {
      setVoucherMessage('Enter a count between 1 and 50.');
      return;
    }
    const bodyPayload = proLicenseDurationSelectToRequestBody(voucherDuration);
    if (!bodyPayload) {
      setVoucherMessage('Invalid duration.');
      return;
    }
    setVoucherGenerating(true);
    try {
      const res = await fetch('/api/admin/pro-licenses/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          count,
          locale: voucherLocale,
          printSize: voucherPrintSize,
          output: voucherOutput,
          ...bodyPayload,
          ...(voucherExtraNote.trim() ? { adminNotes: voucherExtraNote.trim() } : {}),
          ...(voucherPromoLabel.trim() ? { promoLabel: voucherPromoLabel.trim() } : {}),
        }),
      });
      if (!res.ok) {
        let err = 'Voucher generation failed';
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) err = data.error;
        } catch {
          /* binary */
        }
        setVoucherMessage(err);
        return;
      }
      const blob = await res.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      const ext = voucherOutput === 'zip' ? 'zip' : 'pdf';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `voice-inbox-vouchers-${voucherLocale}-${count}x-${stamp}.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
      setVoucherMessage(
        voucherOutput === 'zip'
          ? `Created ${count} key(s) and downloaded ZIP.`
          : `Created ${count} key(s) and downloaded print PDF.`,
      );
      void fetchList();
    } catch {
      setVoucherMessage('Request failed');
    } finally {
      setVoucherGenerating(false);
    }
  };

  const handleEmailVoucher = async () => {
    setVoucherMessage(null);
    const email = voucherEmail.trim();
    if (!email) {
      setVoucherMessage('Enter a recipient email.');
      return;
    }
    const bodyPayload = proLicenseDurationSelectToRequestBody(voucherDuration);
    if (!bodyPayload) {
      setVoucherMessage('Invalid duration.');
      return;
    }
    setVoucherEmailSending(true);
    try {
      const res = await fetch('/api/admin/pro-licenses/vouchers/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          locale: voucherLocale,
          printSize: voucherPrintSize,
          ...bodyPayload,
          ...(voucherExtraNote.trim() ? { adminNotes: voucherExtraNote.trim() } : {}),
          ...(voucherPromoLabel.trim() ? { promoLabel: voucherPromoLabel.trim() } : {}),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setVoucherMessage(data.error ?? 'Failed to send voucher email');
        return;
      }
      setVoucherMessage(`Voucher emailed to ${email}.`);
      setVoucherEmail('');
      void fetchList();
    } catch {
      setVoucherMessage('Email request failed');
    } finally {
      setVoucherEmailSending(false);
    }
  };

  const pendingRequests = keyRequests.length;

  return (
    <div className="space-y-4">
      {stats ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {STAT_LABELS.map(({ key, label }) => (
            <div
              key={key}
              className="rounded-xl border border-zinc-200/90 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/50"
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                {label}
              </p>
              <p className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {stats[key]}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <AdminDetailsSection
        summary="Support Pro key requests"
        defaultOpen={pendingRequests > 0}
        badge={
          pendingRequests > 0 ? (
            <AdminStatusBadge tone="warning">{pendingRequests} pending</AdminStatusBadge>
          ) : null
        }
      >
        <p className="mb-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          Open tickets whose subject includes{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-[11px] dark:bg-zinc-800">
            {SUPPORT_PRO_KEY_SUBJECT_MARKER}
          </code>{' '}
          (any case) with an email address.
        </p>
        {keySendMessage ? <AdminAlert tone="success">{keySendMessage}</AdminAlert> : null}
        {keyRequestsError ? <AdminAlert tone="error">{keyRequestsError}</AdminAlert> : null}
        {keyRequestsLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : keyRequests.length === 0 ? (
          <p className="text-sm text-zinc-500">No pending requests.</p>
        ) : (
          <ul className="space-y-3">
            {keyRequests.map((req) => (
              <li
                key={req.id}
                className="rounded-lg border border-zinc-200/90 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/60"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0 text-xs text-zinc-600 dark:text-zinc-400">
                    <p className="font-mono text-[11px] text-zinc-500">{req.reference}</p>
                    <p>
                      <span className="font-medium text-zinc-500">To</span>{' '}
                      <span className="text-zinc-800 dark:text-zinc-200">{req.email}</span>
                    </p>
                    {req.subject ? (
                      <p className="mt-0.5 font-medium text-zinc-800 dark:text-zinc-200">
                        {req.subject}
                      </p>
                    ) : null}
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap">{req.messagePreview}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <ProDurationSelect
                      value={keyRequestDuration[req.id] ?? 'm:12'}
                      onChange={(v) => setKeyRequestDuration((prev) => ({ ...prev, [req.id]: v }))}
                    />
                    <button
                      type="button"
                      disabled={keySendingId === req.id}
                      onClick={() => void handleSendKeyFromSupport(req)}
                      className={adminBtnPrimaryClass}
                    >
                      {keySendingId === req.id ? 'Sending…' : 'Email key'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => void fetchKeyRequests()}
          className={`mt-3 ${adminBtnSecondaryClass}`}
        >
          Refresh requests
        </button>
      </AdminDetailsSection>

      <AdminDetailsSection summary="Email Pro key to any address">
        {directSuccess ? <AdminAlert tone="success">{directSuccess}</AdminAlert> : null}
        {directError ? <AdminAlert tone="error">{directError}</AdminAlert> : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <AdminFormField label="Recipient email">
              <input
                type="email"
                autoComplete="email"
                value={directEmail}
                onChange={(e) => setDirectEmail(e.target.value)}
                placeholder="name@example.com"
                className={adminInputClass}
              />
            </AdminFormField>
          </div>
          <div>
            <AdminFormField label="Duration">
              <ProDurationSelect value={directDuration} onChange={setDirectDuration} />
            </AdminFormField>
          </div>
          <button
            type="button"
            disabled={directSending}
            onClick={() => void handleSendDirect()}
            className={adminBtnPrimaryClass}
          >
            {directSending ? 'Sending…' : 'Send email'}
          </button>
        </div>
      </AdminDetailsSection>

      <AdminDetailsSection summary="Gift vouchers (PDF / ZIP)">
        {voucherMessage ? (
          <AdminAlert tone={voucherMessage.includes('failed') ? 'error' : 'success'}>
            {voucherMessage}
          </AdminAlert>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminFormField label="Count (1–50)">
            <input
              type="number"
              min={1}
              max={50}
              value={voucherCount}
              onChange={(e) => setVoucherCount(e.target.value)}
              className={`${adminInputClass} max-w-[6rem]`}
            />
          </AdminFormField>
          <AdminFormField label="Duration">
            <ProDurationSelect value={voucherDuration} onChange={setVoucherDuration} />
          </AdminFormField>
          <AdminFormField label="PDF language">
            <select
              value={voucherLocale}
              onChange={(e) => setVoucherLocale(e.target.value as 'en' | 'ru')}
              className={adminSelectClass}
            >
              <option value="en">English</option>
              <option value="ru">Russian</option>
            </select>
          </AdminFormField>
          <AdminFormField label="Print size">
            <select
              value={voucherPrintSize}
              onChange={(e) => setVoucherPrintSize(e.target.value as 'a4' | 'us-letter')}
              className={adminSelectClass}
            >
              <option value="a4">A4</option>
              <option value="us-letter">US Letter</option>
            </select>
          </AdminFormField>
          <AdminFormField label="Download">
            <select
              value={voucherOutput}
              onChange={(e) => setVoucherOutput(e.target.value as 'print_pdf' | 'zip')}
              className={adminSelectClass}
            >
              <option value="print_pdf">Single PDF</option>
              <option value="zip">ZIP (one PDF each)</option>
            </select>
          </AdminFormField>
          <AdminFormField label="Promo label (optional)">
            <input
              type="text"
              value={voucherPromoLabel}
              onChange={(e) => setVoucherPromoLabel(e.target.value)}
              maxLength={48}
              className={adminInputClass}
            />
          </AdminFormField>
          <AdminFormField label="Batch note (optional)">
            <input
              type="text"
              value={voucherExtraNote}
              onChange={(e) => setVoucherExtraNote(e.target.value)}
              className={adminInputClass}
            />
          </AdminFormField>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={voucherPreviewLoading || voucherGenerating}
            onClick={() => void handlePreviewVoucher()}
            className={adminBtnSecondaryClass}
          >
            {voucherPreviewLoading ? 'Loading…' : 'Preview'}
          </button>
          <button
            type="button"
            disabled={voucherGenerating}
            onClick={() => void handleGenerateVouchers()}
            className={adminBtnPrimaryClass}
          >
            {voucherGenerating ? 'Generating…' : 'Download'}
          </button>
        </div>
        {voucherPreviewUrl ? (
          <div className="mt-4">
            <iframe
              title="Voucher preview"
              src={voucherPreviewUrl}
              className={`w-full rounded-lg border border-zinc-200 dark:border-zinc-700 ${
                voucherPrintSize === 'a4'
                  ? 'aspect-[842/298] min-h-[200px]'
                  : 'aspect-[792/306] min-h-[200px]'
              }`}
            />
          </div>
        ) : null}
        <div className="mt-4 border-t border-zinc-200/80 pt-4 dark:border-zinc-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 sm:max-w-md">
              <AdminFormField label="Email one voucher">
                <input
                  type="email"
                  value={voucherEmail}
                  onChange={(e) => setVoucherEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={adminInputClass}
                />
              </AdminFormField>
            </div>
            <button
              type="button"
              disabled={voucherEmailSending}
              onClick={() => void handleEmailVoucher()}
              className={adminBtnPrimaryClass}
            >
              {voucherEmailSending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </AdminDetailsSection>

      <AdminDetailsSection summary="Column glossary">
        <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          <strong>Key grant ends</strong> — this key only (activation + duration).{' '}
          <strong>Device Pro until</strong> — current{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-[10px] dark:bg-zinc-800">
            DeviceProEntitlement
          </code>{' '}
          for the bound device (stacking, IAP, sync). <strong>Device in Pro</strong> follows
          entitlement, not whether this row&apos;s grant window is still open.
        </p>
      </AdminDetailsSection>

      <AdminCard
        title="Key registry"
        description="Paginated list; CSV export uses the same filters (up to 10k rows). Summary counts above are global."
        headerRight={
          <a
            href={`/api/admin/pro-licenses/export?status=${encodeURIComponent(statusFilter)}&devicePro=${encodeURIComponent(deviceProFilter)}`}
            className={adminBtnSecondaryClass}
            download
          >
            Export CSV
          </a>
        }
      >
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <AdminFormField label="Status">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                setPage(1);
              }}
              className={adminSelectClass}
            >
              <option value="all">All</option>
              <option value="unused">Unused</option>
              <option value="redeemed">Redeemed</option>
            </select>
          </AdminFormField>
          <AdminFormField label="Device Pro">
            <select
              value={deviceProFilter}
              onChange={(e) => {
                setDeviceProFilter(e.target.value as typeof deviceProFilter);
                setPage(1);
              }}
              className={adminSelectClass}
            >
              <option value="any">Any</option>
              <option value="active">Active</option>
              <option value="inactive">Not active</option>
            </select>
          </AdminFormField>
          <AdminFormField label="New key duration">
            <ProDurationSelect value={duration} onChange={setDuration} />
          </AdminFormField>
          <button
            type="button"
            disabled={generating}
            onClick={() => void handleGenerate()}
            className={adminBtnPrimaryClass}
          >
            {generating ? 'Generating…' : 'Generate key'}
          </button>
          <button type="button" onClick={() => void fetchList()} className={adminBtnSecondaryClass}>
            Refresh
          </button>
        </div>

        {plainKey ? (
          <AdminAlert tone="warning" className="mb-4">
            <span className="font-medium">Copy now — shown once:</span>
            <code className="mt-1 block break-all font-mono text-xs">{plainKey}</code>
          </AdminAlert>
        ) : null}
        {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}

        {listLoading ? (
          <p className="text-sm text-zinc-500">Loading keys…</p>
        ) : (
          <div className="overflow-x-auto">
            {pagination ? (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                <p className="tabular-nums">
                  {pagination.totalFiltered === 0
                    ? '0 keys'
                    : `${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(
                        pagination.page * pagination.pageSize,
                        pagination.totalFiltered,
                      )} of ${pagination.totalFiltered}`}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-xs">
                    Per page
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className={adminSelectClass}
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={listLoading || pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={adminBtnSecondaryClass}
                  >
                    Previous
                  </button>
                  <span className="tabular-nums">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={listLoading || pagination.page >= pagination.totalPages}
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    className={adminBtnSecondaryClass}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}

            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-600">
                  <th className="py-2 pr-3 font-medium">Created</th>
                  <th className="py-2 pr-3 font-medium">Duration</th>
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 pr-3 font-medium">Notes</th>
                  <th className="w-0 py-2 pr-3 font-medium whitespace-nowrap">Status</th>
                  <th className="py-2 pr-3 font-medium">Device</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {list.map((row) => {
                  const nominalMs = row.nominalGrantEndsAt
                    ? new Date(row.nominalGrantEndsAt).getTime()
                    : null;
                  const keyGrantEnded =
                    nominalMs !== null && !Number.isNaN(nominalMs) && nominalMs <= Date.now();
                  const deviceExtended =
                    row.consumed && keyGrantEnded && row.deviceProActive === true;

                  return (
                    <tr key={row.id} className="border-b border-zinc-100 dark:border-zinc-700/80">
                      <td className="whitespace-nowrap py-2 pr-3 text-zinc-600 dark:text-zinc-400">
                        {formatAdminDate(new Date(row.createdAt))}
                      </td>
                      <td className="py-2 pr-3">
                        {formatProLicenseRowDuration(row.durationMonths, row.durationDays)}
                      </td>
                      <td className="max-w-[160px] truncate py-2 pr-3">
                        {row.issuedToEmail ?? '—'}
                      </td>
                      <td className="max-w-[180px] py-2 pr-3">
                        {notesEditingId === row.id ? (
                          <div className="flex flex-col gap-1">
                            <textarea
                              value={notesDraft}
                              onChange={(e) => setNotesDraft(e.target.value)}
                              rows={2}
                              className={`${adminInputClass} text-xs`}
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                disabled={notesSavingId === row.id}
                                onClick={() => void handleSaveNotes(row)}
                                className={adminBtnSecondaryClass}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setNotesEditingId(null);
                                  setNotesDraft('');
                                }}
                                className={adminBtnGhostClass}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setNotesEditingId(row.id);
                              setNotesDraft(row.adminNotes ?? '');
                            }}
                            className="text-left text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                          >
                            {row.adminNotes ? (
                              <span className="line-clamp-2 text-zinc-700 dark:text-zinc-300">
                                {row.adminNotes}
                              </span>
                            ) : (
                              'Add note'
                            )}
                          </button>
                        )}
                      </td>
                      <td className="w-0 py-2 pr-3 whitespace-nowrap">
                        {!row.consumed ? (
                          <AdminStatusBadge tone="neutral">Unused</AdminStatusBadge>
                        ) : (
                          <div className="flex w-fit flex-col items-start gap-0.5">
                            <AdminStatusBadge tone="success">Redeemed</AdminStatusBadge>
                            {row.deviceProActive ? (
                              <span className="text-[11px] text-emerald-600">Device in Pro</span>
                            ) : (
                              <span className="text-[11px] text-zinc-500">Device not in Pro</span>
                            )}
                            {deviceExtended ? (
                              <span className="max-w-40 text-[10px] text-amber-700 dark:text-amber-200">
                                Grant ended; device extended elsewhere
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">{row.devicePrefix ?? '—'}</td>
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-1">
                          {!row.consumed ? (
                            <button
                              type="button"
                              disabled={deletingId === row.id}
                              onClick={() => void handleDelete(row)}
                              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                            >
                              Delete
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={resettingId === row.id}
                              onClick={() => void handleReset(row)}
                              className="text-xs font-medium text-amber-800 hover:underline disabled:opacity-50 dark:text-amber-200"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {list.length === 0 && pagination?.totalFiltered === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No keys match these filters.</p>
            ) : null}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
