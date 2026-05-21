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
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  AdminMetricCard,
  AdminStatusBadge,
  adminBtnPrimaryClass,
  adminBtnSecondaryClass,
  adminCardSurfaceClass,
  adminInputClass,
  adminSelectClass,
} from './admin-ui';
import { AdminBudgetPanel } from './AdminBudgetPanel';
import { AdminModelManifestPanel } from './AdminModelManifestPanel';
import { AdminOperationsPanel } from './AdminOperationsPanel';
import { AdminReleasesPanel } from './AdminReleasesPanel';
import { AdminSecurityPanel } from './AdminSecurityPanel';
import { AdminSupportPanel } from './AdminSupportPanel';
import {
  formatProLicenseRowDuration,
  proLicenseDurationSelectToRequestBody,
} from '@/lib/pro-license-duration-form';
import { SUPPORT_PRO_KEY_SUBJECT_MARKER } from '@/lib/support-pro-key-request';

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

type StatusResponse = {
  vercel: VercelStatus;
  upstash: UpstashStatus;
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

type AppConfigApiResponse = {
  ok: boolean;
  editable?: boolean;
  hint?: string;
  values?: Record<string, string>;
  effective?: {
    amount: number;
    cooldownSeconds: number;
    cooldownKeyPrefix: string;
    freeWeeklyLimit: number;
    proWeeklyLimit: number;
  };
  error?: string;
};

const BONUS_KEYS = {
  amount: 'AI_BONUS_AMOUNT',
  cooldownSeconds: 'AI_BONUS_COOLDOWN_SECONDS',
  keyPrefix: 'AI_BONUS_COOLDOWN_KEY_PREFIX',
} as const;

const WEEKLY_KEYS = {
  free: 'AI_WEEKLY_LIMIT_FREE',
  pro: 'AI_WEEKLY_LIMIT_PRO',
} as const;

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
  deviceId: string;
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
    description: 'AI limits, mobile model manifest, Pro keys, and environment-backed variables',
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

export function AdminDashboard() {
  const router = useRouter();
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
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

  const [appConfigLoading, setAppConfigLoading] = useState(true);
  const [appConfigEditable, setAppConfigEditable] = useState(false);
  const [appConfigHint, setAppConfigHint] = useState<string | null>(null);
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusCooldownSec, setBonusCooldownSec] = useState('');
  const [bonusKeyPrefix, setBonusKeyPrefix] = useState('');
  const [weeklyLimitFree, setWeeklyLimitFree] = useState('');
  const [weeklyLimitPro, setWeeklyLimitPro] = useState('');
  const [appConfigSaving, setAppConfigSaving] = useState(false);
  const [appConfigMessage, setAppConfigMessage] = useState<string | null>(null);
  const [appConfigError, setAppConfigError] = useState<string | null>(null);

  const [proLicenseDuration, setProLicenseDuration] = useState<string>('m:12');
  const [proLicenseGenerating, setProLicenseGenerating] = useState(false);
  const [proLicensePlainKey, setProLicensePlainKey] = useState<string | null>(null);
  const [proLicenseList, setProLicenseList] = useState<ProLicenseRow[]>([]);
  const [proLicenseStats, setProLicenseStats] = useState<ProLicenseStats | null>(null);
  const [proLicenseStatusFilter, setProLicenseStatusFilter] = useState<
    'all' | 'unused' | 'redeemed'
  >('all');
  const [proLicenseDeviceProFilter, setProLicenseDeviceProFilter] = useState<
    'any' | 'active' | 'inactive'
  >('any');
  const [proLicensePage, setProLicensePage] = useState(1);
  const [proLicensePageSize, setProLicensePageSize] = useState(50);
  const [proLicensePagination, setProLicensePagination] = useState<ProLicensePagination | null>(
    null,
  );
  const [proLicenseListLoading, setProLicenseListLoading] = useState(false);
  const [proLicenseError, setProLicenseError] = useState<string | null>(null);
  const [proLicenseDeletingId, setProLicenseDeletingId] = useState<string | null>(null);
  const [proLicenseResettingId, setProLicenseResettingId] = useState<string | null>(null);
  const [proLicenseNotesEditingId, setProLicenseNotesEditingId] = useState<string | null>(null);
  const [proLicenseNotesDraft, setProLicenseNotesDraft] = useState('');
  const [proLicenseNotesSavingId, setProLicenseNotesSavingId] = useState<string | null>(null);

  const [voucherCount, setVoucherCount] = useState('1');
  const [voucherDuration, setVoucherDuration] = useState<string>('d:14');
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

  const [proKeyRequests, setProKeyRequests] = useState<ProKeyRequestRow[]>([]);
  const [proKeyRequestsLoading, setProKeyRequestsLoading] = useState(false);
  const [proKeyRequestsError, setProKeyRequestsError] = useState<string | null>(null);
  const [proKeyRequestDuration, setProKeyRequestDuration] = useState<Record<string, string>>({});
  const [proKeySendingId, setProKeySendingId] = useState<string | null>(null);
  const [proKeySendMessage, setProKeySendMessage] = useState<string | null>(null);

  const [proDirectEmail, setProDirectEmail] = useState('');
  const [proDirectDuration, setProDirectDuration] = useState<string>('m:12');
  const [proDirectSending, setProDirectSending] = useState(false);
  const [proDirectError, setProDirectError] = useState<string | null>(null);
  const [proDirectSuccess, setProDirectSuccess] = useState<string | null>(null);

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

  const fetchAppConfig = useCallback(async () => {
    setAppConfigLoading(true);
    setAppConfigError(null);
    try {
      const res = await fetch('/api/admin/app-config', { credentials: 'include' });
      const data = (await res.json()) as AppConfigApiResponse;
      if (!data.ok || !data.values) {
        setAppConfigError(data.error ?? 'Failed to load config');
        return;
      }
      setAppConfigEditable(!!data.editable);
      setAppConfigHint(data.hint ?? null);
      const v = data.values;
      setBonusAmount(v[BONUS_KEYS.amount] ?? '');
      setBonusCooldownSec(v[BONUS_KEYS.cooldownSeconds] ?? '');
      setBonusKeyPrefix(v[BONUS_KEYS.keyPrefix] ?? '');
      setWeeklyLimitFree(v[WEEKLY_KEYS.free] ?? '');
      setWeeklyLimitPro(v[WEEKLY_KEYS.pro] ?? '');
    } catch {
      setAppConfigError('Request failed');
    } finally {
      setAppConfigLoading(false);
    }
  }, []);

  const handleSaveAppConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppConfigMessage(null);
    setAppConfigError(null);
    setAppConfigSaving(true);
    try {
      const res = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          [BONUS_KEYS.amount]: bonusAmount.trim(),
          [BONUS_KEYS.cooldownSeconds]: bonusCooldownSec.trim(),
          [BONUS_KEYS.keyPrefix]: bonusKeyPrefix.trim(),
          [WEEKLY_KEYS.free]: weeklyLimitFree.trim(),
          [WEEKLY_KEYS.pro]: weeklyLimitPro.trim(),
        }),
      });
      const data = (await res.json()) as AppConfigApiResponse & { ok: boolean };
      if (!res.ok || !data.ok) {
        setAppConfigError((data as { error?: string }).error ?? 'Save failed');
        return;
      }
      setAppConfigMessage('Saved.');
      if (data.values) {
        const v = data.values;
        setBonusAmount(v[BONUS_KEYS.amount] ?? '');
        setBonusCooldownSec(v[BONUS_KEYS.cooldownSeconds] ?? '');
        setBonusKeyPrefix(v[BONUS_KEYS.keyPrefix] ?? '');
        setWeeklyLimitFree(v[WEEKLY_KEYS.free] ?? '');
        setWeeklyLimitPro(v[WEEKLY_KEYS.pro] ?? '');
      }
    } catch {
      setAppConfigError('Request failed');
    } finally {
      setAppConfigSaving(false);
    }
  };

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

  const fetchProLicenseList = useCallback(async () => {
    setProLicenseListLoading(true);
    setProLicenseError(null);
    try {
      const q = new URLSearchParams({
        status: proLicenseStatusFilter,
        devicePro: proLicenseDeviceProFilter,
        page: String(proLicensePage),
        pageSize: String(proLicensePageSize),
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
        setProLicenseError(data.error ?? 'Failed to load keys');
        setProLicenseList([]);
        setProLicenseStats(null);
        setProLicensePagination(null);
        return;
      }
      setProLicenseList(Array.isArray(data.items) ? data.items : []);
      setProLicenseStats(data.stats ?? null);
      if (data.pagination) {
        setProLicensePagination(data.pagination);
        setProLicensePage(data.pagination.page);
      } else {
        setProLicensePagination(null);
      }
    } catch {
      setProLicenseError('Request failed');
      setProLicenseList([]);
      setProLicenseStats(null);
      setProLicensePagination(null);
    } finally {
      setProLicenseListLoading(false);
    }
  }, [proLicenseDeviceProFilter, proLicensePage, proLicensePageSize, proLicenseStatusFilter]);

  const fetchProKeyRequests = useCallback(async () => {
    setProKeyRequestsLoading(true);
    setProKeyRequestsError(null);
    try {
      const res = await fetch('/api/admin/support/key-requests', { credentials: 'include' });
      const data = (await res.json()) as {
        ok?: boolean;
        items?: ProKeyRequestRow[];
        error?: string;
      };
      if (!res.ok || !data.ok || !data.items) {
        setProKeyRequestsError(data.error ?? 'Failed to load key requests');
        setProKeyRequests([]);
        return;
      }
      setProKeyRequests(data.items);
      setProKeyRequestDuration((prev) => {
        const next = { ...prev };
        for (const r of data.items!) {
          if (next[r.id] === undefined) next[r.id] = 'm:12';
        }
        return next;
      });
    } catch {
      setProKeyRequestsError('Request failed');
      setProKeyRequests([]);
    } finally {
      setProKeyRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminTab === 'config') {
      void fetchAppConfig();
      void fetchProKeyRequests();
    }
  }, [adminTab, fetchAppConfig, fetchProKeyRequests]);

  useEffect(() => {
    if (adminTab === 'config') {
      void fetchProLicenseList();
    }
  }, [adminTab, fetchProLicenseList]);

  useEffect(() => {
    return () => {
      if (voucherPreviewUrlRef.current) {
        URL.revokeObjectURL(voucherPreviewUrlRef.current);
      }
    };
  }, []);

  const handleGenerateProLicense = async () => {
    setProLicenseError(null);
    setProLicensePlainKey(null);
    setProLicenseGenerating(true);
    try {
      const bodyPayload = proLicenseDurationSelectToRequestBody(proLicenseDuration);
      if (!bodyPayload) {
        setProLicenseError('Invalid duration');
        return;
      }
      const res = await fetch('/api/admin/pro-licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bodyPayload),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        plainKey?: string;
        error?: string;
        hint?: string;
      };
      if (!res.ok || !data.ok || !data.plainKey) {
        setProLicenseError(data.error ?? 'Generate failed');
        return;
      }
      setProLicensePlainKey(data.plainKey);
      void fetchProLicenseList();
    } catch {
      setProLicenseError('Request failed');
    } finally {
      setProLicenseGenerating(false);
    }
  };

  const handleDeleteProLicense = async (row: ProLicenseRow) => {
    if (row.consumed) return;
    if (
      !window.confirm(
        'Delete this unused license key? This cannot be undone. Redeemed keys cannot be deleted.',
      )
    ) {
      return;
    }
    setProLicenseError(null);
    setProLicenseDeletingId(row.id);
    try {
      const res = await fetch(`/api/admin/pro-licenses/${encodeURIComponent(row.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setProLicenseError(data.error ?? 'Delete failed');
        return;
      }
      void fetchProLicenseList();
    } catch {
      setProLicenseError('Request failed');
    } finally {
      setProLicenseDeletingId(null);
    }
  };

  const handleResetProLicense = async (row: ProLicenseRow) => {
    if (!row.consumed) return;
    if (
      !window.confirm(
        'Reset this redeemed key? It becomes activatable again. Pro time on the previous device will be reduced by the duration of this key (or removed if it would expire).',
      )
    ) {
      return;
    }
    setProLicenseError(null);
    setProLicenseResettingId(row.id);
    try {
      const res = await fetch(`/api/admin/pro-licenses/${encodeURIComponent(row.id)}/reset`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setProLicenseError(data.error ?? 'Reset failed');
        return;
      }
      void fetchProLicenseList();
    } catch {
      setProLicenseError('Request failed');
    } finally {
      setProLicenseResettingId(null);
    }
  };

  const handleStartEditProLicenseNotes = (row: ProLicenseRow) => {
    setProLicenseNotesEditingId(row.id);
    setProLicenseNotesDraft(row.adminNotes ?? '');
  };

  const handleCancelEditProLicenseNotes = () => {
    setProLicenseNotesEditingId(null);
    setProLicenseNotesDraft('');
  };

  const handleSaveProLicenseNotes = async (row: ProLicenseRow) => {
    setProLicenseError(null);
    setProLicenseNotesSavingId(row.id);
    try {
      const res = await fetch(`/api/admin/pro-licenses/${encodeURIComponent(row.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ adminNotes: proLicenseNotesDraft.trim() || null }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setProLicenseError(data.error ?? 'Failed to save notes');
        return;
      }
      handleCancelEditProLicenseNotes();
      void fetchProLicenseList();
    } catch {
      setProLicenseError('Request failed');
    } finally {
      setProLicenseNotesSavingId(null);
    }
  };

  const setVoucherPreviewBlobUrl = (url: string | null) => {
    if (voucherPreviewUrlRef.current) {
      URL.revokeObjectURL(voucherPreviewUrlRef.current);
      voucherPreviewUrlRef.current = null;
    }
    if (url) voucherPreviewUrlRef.current = url;
    setVoucherPreviewUrl(url);
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
      void fetchProLicenseList();
    } catch {
      setVoucherMessage('Email request failed');
    } finally {
      setVoucherEmailSending(false);
    }
  };

  const handleGenerateVouchers = async () => {
    setVoucherMessage(null);
    setProLicenseError(null);
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
          /* binary error body */
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
          ? `Created ${count} key${count === 1 ? '' : 's'} with note “voucher” and downloaded ZIP (${count} PDFs).`
          : `Created ${count} key${count === 1 ? '' : 's'} with note “voucher” and downloaded one print PDF (${count} page${count === 1 ? '' : 's'}).`,
      );
      void fetchProLicenseList();
    } catch {
      setVoucherMessage('Request failed');
    } finally {
      setVoucherGenerating(false);
    }
  };

  const handleSendProKeyEmail = async (row: ProKeyRequestRow) => {
    const raw = proKeyRequestDuration[row.id] ?? 'm:12';
    const bodyPayload = proLicenseDurationSelectToRequestBody(raw);
    if (!bodyPayload) {
      setProKeyRequestsError('Invalid duration');
      return;
    }
    setProKeySendMessage(null);
    setProKeyRequestsError(null);
    setProKeySendingId(row.id);
    try {
      const res = await fetch('/api/admin/support/send-pro-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ issueId: row.id, ...bodyPayload }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setProKeyRequestsError(data.error ?? 'Send failed');
        return;
      }
      setProKeySendMessage(`Key emailed to ${row.email} and ticket closed.`);
      void fetchProKeyRequests();
      void fetchProLicenseList();
    } catch {
      setProKeyRequestsError('Request failed');
    } finally {
      setProKeySendingId(null);
    }
  };

  const handleSendProLicenseToArbitraryEmail = async () => {
    const email = proDirectEmail.trim();
    if (!email) {
      setProDirectError('Enter an email address');
      return;
    }
    const bodyPayload = proLicenseDurationSelectToRequestBody(proDirectDuration);
    if (!bodyPayload) {
      setProDirectError('Invalid duration');
      return;
    }
    setProDirectError(null);
    setProDirectSuccess(null);
    setProDirectSending(true);
    try {
      const res = await fetch('/api/admin/pro-licenses/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, ...bodyPayload }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setProDirectError(data.error ?? 'Send failed');
        return;
      }
      setProDirectSuccess(`License key emailed to ${email}.`);
      void fetchProLicenseList();
    } catch {
      setProDirectError('Request failed');
    } finally {
      setProDirectSending(false);
    }
  };

  const fetchGithub = useCallback(async () => {
    setGithubLoading(true);
    try {
      const res = await fetch('/api/admin/github', { credentials: 'include' });
      const data = await res.json();
      setGithub(data as GitHubResponse);
    } catch {
      setGithub({ ok: false, error: 'Request failed' });
    } finally {
      setGithubLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeviceIds();
  }, [fetchDeviceIds]);

  useEffect(() => {
    fetchGithub();
  }, [fetchGithub]);

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
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Administration</p>
            </div>
          </div>
        </div>
        <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
          Navigate
        </p>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pr-3">
          {ADMIN_TAB_ORDER.map((t) => {
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
              <p className="text-xs font-medium uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                Voice Inbox AI · Admin
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-2xl">
                {currentMeta.label}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {currentMeta.description}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className={`${adminBtnSecondaryClass} shrink-0 self-start sm:mt-0.5`}
            >
              <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden />
              Log out
            </button>
          </div>
          <div className="mx-auto mt-4 flex max-w-screen-2xl gap-2 overflow-x-auto pt-2 pb-0.5 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ADMIN_TAB_ORDER.map((t) => (
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
                  ) : status?.upstash.ok ? (
                    <AdminStatusBadge tone="success">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                      Connected
                    </AdminStatusBadge>
                  ) : (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {status?.upstash.error ?? 'Disconnected'}
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
                          {status.app.baseUrl || '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                          Environment · Push devices
                        </dt>
                        <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                          {status.app.env}
                          {typeof status.app.devicesWithPush === 'number' && (
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
                  <section
                    className={`flex min-h-[260px] max-h-[60vh] flex-col ${adminCardSurfaceClass}`}
                  >
                    <h2 className="shrink-0 border-b border-zinc-100 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                      Vercel
                    </h2>
                    <div className="min-h-0 flex-1 overflow-auto p-4">
                      {statusLoading ? (
                        <p className="text-sm text-zinc-500">Loading…</p>
                      ) : status?.vercel.ok ? (
                        <div className="space-y-2 text-sm">
                          {status.vercel.deployments?.length ? (
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
                          {status?.vercel.error ?? 'Not configured'}
                        </p>
                      )}
                    </div>
                  </section>

                  <section
                    className={`flex min-h-[260px] max-h-[60vh] flex-col ${adminCardSurfaceClass}`}
                  >
                    <h2 className="shrink-0 border-b border-zinc-100 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                      GitHub
                    </h2>
                    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
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
                    </div>
                  </section>
                </div>
              </div>
            </>
          )}

          {adminTab === 'config' && (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fetchAppConfig()}
                  className={adminBtnSecondaryClass}
                >
                  Refresh
                </button>
              </div>

              <section className={`mb-8 ${adminCardSurfaceClass} p-5`}>
                <h2 className="mb-1 text-lg font-medium">AI bonus (rewarded ad)</h2>
                <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                  Values used by <code className="text-xs">getBonusConfig()</code> and{' '}
                  <code className="text-xs">POST /api/ai-usage/bonus</code>. Changing the cooldown
                  key prefix only affects new cooldown keys in Redis.
                </p>
                {appConfigLoading ? (
                  <p className="text-sm text-zinc-500">Loading…</p>
                ) : (
                  <form onSubmit={handleSaveAppConfig} className="space-y-4">
                    {!appConfigEditable && appConfigHint && (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                        {appConfigHint}
                      </p>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                          AI_BONUS_AMOUNT
                        </label>
                        <input
                          type="number"
                          min={1}
                          required
                          disabled={!appConfigEditable}
                          value={bonusAmount}
                          onChange={(e) => setBonusAmount(e.target.value)}
                          className={`${adminInputClass} disabled:opacity-60`}
                        />
                        <p className="mt-1 text-xs text-zinc-500">
                          Extra AI requests granted per ad view.
                        </p>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                          AI_BONUS_COOLDOWN_SECONDS
                        </label>
                        <input
                          type="number"
                          min={60}
                          required
                          disabled={!appConfigEditable}
                          value={bonusCooldownSec}
                          onChange={(e) => setBonusCooldownSec(e.target.value)}
                          className={`${adminInputClass} disabled:opacity-60`}
                        />
                        <p className="mt-1 text-xs text-zinc-500">
                          Min 60 seconds between bonus claims.
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        AI_BONUS_COOLDOWN_KEY_PREFIX
                      </label>
                      <input
                        type="text"
                        required
                        disabled={!appConfigEditable}
                        value={bonusKeyPrefix}
                        onChange={(e) => setBonusKeyPrefix(e.target.value)}
                        className={`${adminInputClass} font-mono disabled:opacity-60`}
                      />
                      <p className="mt-1 text-xs text-zinc-500">
                        Redis key prefix for per-device cooldown.
                      </p>
                    </div>
                    <div className="border-t border-zinc-200 pt-4 dark:border-zinc-600">
                      <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Weekly AI limits (rolling ISO week)
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                            AI_WEEKLY_LIMIT_FREE
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={500}
                            required
                            disabled={!appConfigEditable}
                            value={weeklyLimitFree}
                            onChange={(e) => setWeeklyLimitFree(e.target.value)}
                            className={`${adminInputClass} disabled:opacity-60`}
                          />
                          <p className="mt-1 text-xs text-zinc-500">Free tier (non-Pro devices).</p>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                            AI_WEEKLY_LIMIT_PRO
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={500}
                            required
                            disabled={!appConfigEditable}
                            value={weeklyLimitPro}
                            onChange={(e) => setWeeklyLimitPro(e.target.value)}
                            className={`${adminInputClass} disabled:opacity-60`}
                          />
                          <p className="mt-1 text-xs text-zinc-500">
                            Pro tier; must be ≥ free (validated on save).
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="submit"
                        disabled={!appConfigEditable || appConfigSaving}
                        className={adminBtnPrimaryClass}
                      >
                        {appConfigSaving ? 'Saving…' : 'Save'}
                      </button>
                      {appConfigMessage && (
                        <span className="text-sm text-green-600 dark:text-green-400">
                          {appConfigMessage}
                        </span>
                      )}
                      {appConfigError && (
                        <span className="text-sm text-red-600 dark:text-red-400">
                          {appConfigError}
                        </span>
                      )}
                    </div>
                  </form>
                )}
              </section>

              <AdminModelManifestPanel />

              <section className={`mb-8 ${adminCardSurfaceClass} p-5`}>
                <h2 className="mb-1 text-lg font-medium">Pro license keys</h2>
                <p className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                  For internal TestFlight builds only.
                </p>
                <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                  One-time keys; plaintext is shown only once. Each key activates on a single
                  device. The Email column is filled when a key is sent from a support request;
                  manual Generate leaves it empty (—).
                </p>

                {proLicenseStats && (
                  <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                    {(
                      [
                        ['Total keys', proLicenseStats.totalKeys],
                        ['Unused', proLicenseStats.unusedKeys],
                        ['Redeemed', proLicenseStats.redeemedKeys],
                        ['Redeemed (7d)', proLicenseStats.redeemedLast7Days],
                        ['Redeemed (30d)', proLicenseStats.redeemedLast30Days],
                        ['Devices w/ active Pro', proLicenseStats.devicesWithActivePro],
                      ] as const
                    ).map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-lg border border-zinc-200 bg-white/90 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900/50"
                      >
                        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          {label}
                        </p>
                        <p className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mb-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  <span className="font-medium text-zinc-600 dark:text-zinc-300">
                    Key grant ends
                  </span>{' '}
                  is this key&apos;s window only (activation + duration; it does not move when the
                  device is extended).{' '}
                  <span className="font-medium text-zinc-600 dark:text-zinc-300">
                    Device Pro until
                  </span>{' '}
                  comes from{' '}
                  <code className="rounded bg-zinc-100 px-1 font-mono text-[10px] dark:bg-zinc-800">
                    DeviceProEntitlement
                  </code>{' '}
                  for that device — stacking, later keys on the same device, IAP, RevenueCat sync,
                  and resets. In Status,{' '}
                  <span className="font-medium text-zinc-600 dark:text-zinc-300">
                    Device in Pro
                  </span>{' '}
                  follows that entitlement, not whether this row&apos;s key grant is still open.
                </p>

                <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50/90 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/35">
                  <h3 className="mb-1 text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                    Email Pro key from support
                  </h3>
                  <p className="mb-3 text-xs leading-relaxed text-emerald-900/95 dark:text-emerald-200/90">
                    If the user opens Support in the app and sets the subject to include{' '}
                    <code className="rounded bg-white/90 px-1 py-0.5 font-mono text-[11px] text-emerald-950 dark:bg-emerald-950/80 dark:text-emerald-100">
                      {SUPPORT_PRO_KEY_SUBJECT_MARKER}
                    </code>{' '}
                    (any case) and leaves an email, the open request appears below. Pick duration (1
                    / 7 / 14 days or 1 / 3 / 6 / 12 months) and send — Nodemailer delivers the HTML
                    email and the ticket closes. Requires SMTP env vars (see{' '}
                    <span className="font-mono">.env.example</span>).
                  </p>
                  {proKeySendMessage && (
                    <p className="mb-3 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                      {proKeySendMessage}
                    </p>
                  )}
                  {proKeyRequestsError && (
                    <p className="mb-3 text-sm text-red-700 dark:text-red-400">
                      {proKeyRequestsError}
                    </p>
                  )}
                  {proKeyRequestsLoading ? (
                    <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80">
                      Loading requests…
                    </p>
                  ) : proKeyRequests.length === 0 ? (
                    <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80">
                      No pending Pro key requests.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {proKeyRequests.map((req) => (
                        <li
                          key={req.id}
                          className="rounded-lg border border-emerald-200/80 bg-white/90 p-3 dark:border-emerald-800/50 dark:bg-zinc-900/60"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div className="min-w-0 text-xs text-zinc-600 dark:text-zinc-400">
                              <p className="font-mono text-[11px] text-zinc-500">{req.reference}</p>
                              <p>
                                <span className="font-medium text-zinc-500">To</span>{' '}
                                <span className="text-zinc-800 dark:text-zinc-200">
                                  {req.email}
                                </span>
                              </p>
                              {req.subject && (
                                <p className="mt-0.5 font-medium text-zinc-800 dark:text-zinc-200">
                                  {req.subject}
                                </p>
                              )}
                              <p className="mt-1 whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                                {req.messagePreview}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                              <select
                                value={proKeyRequestDuration[req.id] ?? 'm:12'}
                                onChange={(e) =>
                                  setProKeyRequestDuration((prev) => ({
                                    ...prev,
                                    [req.id]: e.target.value,
                                  }))
                                }
                                className={adminSelectClass}
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
                                disabled={proKeySendingId === req.id}
                                onClick={() => void handleSendProKeyEmail(req)}
                                className={adminBtnPrimaryClass}
                              >
                                {proKeySendingId === req.id ? 'Sending…' : 'Email key'}
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => void fetchProKeyRequests()}
                    className={`mt-3 ${adminBtnSecondaryClass}`}
                  >
                    Refresh key requests
                  </button>
                </div>

                <div className="mb-6 rounded-lg border border-sky-200 bg-sky-50/90 p-4 dark:border-sky-900/60 dark:bg-sky-950/30">
                  <h3 className="mb-1 text-sm font-semibold text-sky-950 dark:text-sky-100">
                    Email Pro key to any address
                  </h3>
                  <p className="mb-3 text-xs leading-relaxed text-sky-900/90 dark:text-sky-200/85">
                    Same HTML email as support flow: creates a new key, records the recipient in the
                    keys list, and does not require a ticket. Use for testers, refunds, or manual
                    fulfillment.
                  </p>
                  {proDirectSuccess && (
                    <p className="mb-3 text-sm font-medium text-sky-900 dark:text-sky-200">
                      {proDirectSuccess}
                    </p>
                  )}
                  {proDirectError && (
                    <p className="mb-3 text-sm text-red-700 dark:text-red-400">{proDirectError}</p>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="min-w-0 flex-1 sm:max-w-md">
                      <label className="mb-1 block text-sm font-medium text-sky-900/90 dark:text-sky-200/90">
                        Recipient email
                      </label>
                      <input
                        type="email"
                        autoComplete="email"
                        value={proDirectEmail}
                        onChange={(e) => setProDirectEmail(e.target.value)}
                        placeholder="name@example.com"
                        className={`${adminInputClass} w-full`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-sky-900/90 dark:text-sky-200/90">
                        Duration
                      </label>
                      <select
                        value={proDirectDuration}
                        onChange={(e) => setProDirectDuration(e.target.value)}
                        className={adminSelectClass}
                      >
                        <option value="d:1">1 day</option>
                        <option value="d:7">7 days</option>
                        <option value="d:14">14 days</option>
                        <option value="m:1">1 mo</option>
                        <option value="m:3">3 mo</option>
                        <option value="m:6">6 mo</option>
                        <option value="m:12">12 mo</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      disabled={proDirectSending}
                      onClick={() => void handleSendProLicenseToArbitraryEmail()}
                      className={adminBtnPrimaryClass}
                    >
                      {proDirectSending ? 'Sending…' : 'Email key'}
                    </button>
                  </div>
                </div>

                <div className="mb-6 rounded-lg border border-violet-200 bg-violet-50/90 p-4 dark:border-violet-900/60 dark:bg-violet-950/30">
                  <h3 className="mb-1 text-sm font-semibold text-violet-950 dark:text-violet-100">
                    Gift vouchers (PDF)
                  </h3>
                  <p className="mb-3 text-xs leading-relaxed text-violet-900/90 dark:text-violet-200/85">
                    Creates N license keys (each tagged{' '}
                    <code className="rounded bg-white/80 px-1 font-mono text-[11px] dark:bg-violet-950/80">
                      voucher
                    </code>
                    ), then download as one print PDF or a ZIP of separate files (language below).
                    Universal QR link (
                    <code className="rounded bg-white/80 px-1 font-mono text-[11px] dark:bg-violet-950/80">
                      /go?voucher=…
                    </code>
                    ) that redirects to the App Store or Google Play by device.
                  </p>
                  {voucherMessage && (
                    <p className="mb-3 text-sm font-medium text-violet-900 dark:text-violet-200">
                      {voucherMessage}
                    </p>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-violet-900/90 dark:text-violet-200/90">
                        Count (1–50)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={voucherCount}
                        onChange={(e) => setVoucherCount(e.target.value)}
                        className={`${adminInputClass} w-24`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-violet-900/90 dark:text-violet-200/90">
                        Duration
                      </label>
                      <select
                        value={voucherDuration}
                        onChange={(e) => setVoucherDuration(e.target.value)}
                        className={adminSelectClass}
                      >
                        <option value="d:1">1 day</option>
                        <option value="d:7">7 days</option>
                        <option value="d:14">14 days</option>
                        <option value="m:1">1 mo</option>
                        <option value="m:3">3 mo</option>
                        <option value="m:6">6 mo</option>
                        <option value="m:12">12 mo</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-violet-900/90 dark:text-violet-200/90">
                        PDF language
                      </label>
                      <select
                        value={voucherLocale}
                        onChange={(e) => setVoucherLocale(e.target.value as 'en' | 'ru')}
                        className={adminSelectClass}
                      >
                        <option value="en">English</option>
                        <option value="ru">Russian</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-violet-900/90 dark:text-violet-200/90">
                        Print size
                      </label>
                      <select
                        value={voucherPrintSize}
                        onChange={(e) => setVoucherPrintSize(e.target.value as 'a4' | 'us-letter')}
                        className={adminSelectClass}
                      >
                        <option value="a4">A4 — 297×105 mm (EU)</option>
                        <option value="us-letter">US Letter — 11×4.25 in</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-violet-900/90 dark:text-violet-200/90">
                        Download
                      </label>
                      <select
                        value={voucherOutput}
                        onChange={(e) => setVoucherOutput(e.target.value as 'print_pdf' | 'zip')}
                        className={adminSelectClass}
                      >
                        <option value="print_pdf">Single PDF (print)</option>
                        <option value="zip">ZIP (one PDF per voucher)</option>
                      </select>
                    </div>
                    <div className="min-w-0 flex-1 sm:max-w-xs">
                      <label className="mb-1 block text-sm font-medium text-violet-900/90 dark:text-violet-200/90">
                        Promo label (optional)
                      </label>
                      <input
                        type="text"
                        value={voucherPromoLabel}
                        onChange={(e) => setVoucherPromoLabel(e.target.value)}
                        placeholder="e.g. Acme Corp"
                        maxLength={48}
                        className={`${adminInputClass} w-full`}
                      />
                    </div>
                    <div className="min-w-0 flex-1 sm:max-w-xs">
                      <label className="mb-1 block text-sm font-medium text-violet-900/90 dark:text-violet-200/90">
                        Extra note (optional)
                      </label>
                      <input
                        type="text"
                        value={voucherExtraNote}
                        onChange={(e) => setVoucherExtraNote(e.target.value)}
                        placeholder="e.g. batch Berlin 2026"
                        className={`${adminInputClass} w-full`}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={voucherPreviewLoading || voucherGenerating}
                      onClick={() => void handlePreviewVoucher()}
                      className={adminBtnSecondaryClass}
                    >
                      {voucherPreviewLoading ? 'Loading preview…' : 'Preview voucher'}
                    </button>
                    <button
                      type="button"
                      disabled={voucherGenerating}
                      onClick={() => void handleGenerateVouchers()}
                      className={adminBtnPrimaryClass}
                    >
                      {voucherGenerating
                        ? 'Generating…'
                        : voucherOutput === 'zip'
                          ? 'Generate vouchers (ZIP)'
                          : 'Generate vouchers (PDF)'}
                    </button>
                  </div>
                  {voucherPreviewUrl && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium text-violet-900/90 dark:text-violet-200/85">
                        Preview (sample code VI-XXXX-XXXX-XXXX)
                      </p>
                      <div
                        className={`relative min-h-[380px] w-full overflow-hidden rounded-lg border border-violet-200 bg-white dark:border-violet-800 dark:bg-zinc-900 ${
                          voucherPrintSize === 'a4' ? 'aspect-[842/298]' : 'aspect-[792/306]'
                        }`}
                      >
                        <iframe
                          title="Voucher PDF preview"
                          src={voucherPreviewUrl}
                          className="absolute inset-0 h-full w-full border-0"
                        />
                      </div>
                    </div>
                  )}
                  <div className="mt-4 border-t border-violet-200/80 pt-4 dark:border-violet-800/50">
                    <p className="mb-2 text-xs font-medium text-violet-900/90 dark:text-violet-200/85">
                      Email one voucher (creates a key, sends PDF attachment)
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                      <div className="min-w-0 flex-1 sm:max-w-md">
                        <label className="mb-1 block text-sm font-medium text-violet-900/90 dark:text-violet-200/90">
                          Recipient email
                        </label>
                        <input
                          type="email"
                          autoComplete="email"
                          value={voucherEmail}
                          onChange={(e) => setVoucherEmail(e.target.value)}
                          placeholder="name@example.com"
                          className={`${adminInputClass} w-full`}
                        />
                      </div>
                      <button
                        type="button"
                        disabled={voucherEmailSending}
                        onClick={() => void handleEmailVoucher()}
                        className={adminBtnPrimaryClass}
                      >
                        {voucherEmailSending ? 'Sending…' : 'Email voucher'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      List: status
                    </label>
                    <select
                      value={proLicenseStatusFilter}
                      onChange={(e) => {
                        const v = e.target.value as 'all' | 'unused' | 'redeemed';
                        setProLicenseStatusFilter(v);
                        setProLicensePage(1);
                      }}
                      className={adminSelectClass}
                    >
                      <option value="all">All</option>
                      <option value="unused">Unused</option>
                      <option value="redeemed">Redeemed</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      List: device Pro
                    </label>
                    <select
                      value={proLicenseDeviceProFilter}
                      onChange={(e) => {
                        const v = e.target.value as 'any' | 'active' | 'inactive';
                        setProLicenseDeviceProFilter(v);
                        setProLicensePage(1);
                      }}
                      className={adminSelectClass}
                    >
                      <option value="any">Any</option>
                      <option value="active">Active on device</option>
                      <option value="inactive">Not active / ended</option>
                    </select>
                  </div>
                  <a
                    href={`/api/admin/pro-licenses/export?status=${encodeURIComponent(proLicenseStatusFilter)}&devicePro=${encodeURIComponent(proLicenseDeviceProFilter)}`}
                    className={adminBtnSecondaryClass}
                    download
                  >
                    Download CSV
                  </a>
                </div>
                <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                  Filters apply to the table and CSV only. Summary counts above stay global.
                </p>
                <div className="mb-4 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Duration
                    </label>
                    <select
                      value={proLicenseDuration}
                      onChange={(e) => setProLicenseDuration(e.target.value)}
                      className={adminSelectClass}
                    >
                      <option value="d:1">1 day</option>
                      <option value="d:7">7 days</option>
                      <option value="d:14">14 days</option>
                      <option value="m:1">1 mo</option>
                      <option value="m:3">3 mo</option>
                      <option value="m:6">6 mo</option>
                      <option value="m:12">12 mo</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={proLicenseGenerating}
                    onClick={() => void handleGenerateProLicense()}
                    className={adminBtnPrimaryClass}
                  >
                    {proLicenseGenerating ? 'Generating…' : 'Generate key'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void fetchProLicenseList()}
                    className={adminBtnSecondaryClass}
                  >
                    Refresh list
                  </button>
                </div>
                {proLicensePlainKey && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40">
                    <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
                      Copy this key now — it will not be shown again.
                    </p>
                    <code className="mt-1 block break-all text-sm text-amber-900 dark:text-amber-200">
                      {proLicensePlainKey}
                    </code>
                  </div>
                )}
                {proLicenseError && (
                  <p className="mb-4 text-sm text-red-600 dark:text-red-400">{proLicenseError}</p>
                )}
                {proLicenseListLoading ? (
                  <p className="text-sm text-zinc-500">Loading keys…</p>
                ) : (
                  <div className="overflow-x-auto">
                    {proLicensePagination && (
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                        <p className="tabular-nums">
                          {proLicensePagination.totalFiltered === 0
                            ? '0 keys'
                            : (() => {
                                const from =
                                  (proLicensePagination.page - 1) * proLicensePagination.pageSize +
                                  1;
                                const to = Math.min(
                                  proLicensePagination.page * proLicensePagination.pageSize,
                                  proLicensePagination.totalFiltered,
                                );
                                return `${from}–${to} of ${proLicensePagination.totalFiltered}`;
                              })()}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex items-center gap-2">
                            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                              Per page
                            </span>
                            <select
                              value={proLicensePageSize}
                              onChange={(e) => {
                                setProLicensePageSize(Number(e.target.value));
                                setProLicensePage(1);
                              }}
                              className={adminSelectClass}
                            >
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                              <option value={120}>120</option>
                            </select>
                          </label>
                          <button
                            type="button"
                            disabled={proLicenseListLoading || proLicensePagination.page <= 1}
                            onClick={() => setProLicensePage((p) => Math.max(1, p - 1))}
                            className={adminBtnSecondaryClass}
                          >
                            Previous
                          </button>
                          <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                            Page {proLicensePagination.page} of {proLicensePagination.totalPages}
                          </span>
                          <button
                            type="button"
                            disabled={
                              proLicenseListLoading ||
                              proLicensePagination.page >= proLicensePagination.totalPages
                            }
                            onClick={() =>
                              setProLicensePage((p) =>
                                Math.min(proLicensePagination.totalPages, p + 1),
                              )
                            }
                            className={adminBtnSecondaryClass}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-600">
                          <th className="py-2 pr-4 font-medium">ID</th>
                          <th className="py-2 pr-4 font-medium">Created</th>
                          <th className="py-2 pr-4 font-medium">Duration</th>
                          <th className="py-2 pr-4 font-medium">Email</th>
                          <th className="py-2 pr-4 font-medium">Notes</th>
                          <th className="py-2 pr-4 font-medium">Activated</th>
                          <th
                            className="py-2 pr-4 font-medium"
                            title="This key only: activation time + printed duration. Unchanged when another key extends the same device."
                          >
                            Key grant ends
                          </th>
                          <th
                            className="py-2 pr-4 font-medium"
                            title="Current DeviceProEntitlement.expiresAt for this device (one row per device)."
                          >
                            Device Pro until
                          </th>
                          <th
                            className="py-2 pr-4 font-medium"
                            title="Redeemed flags the key record; Device in Pro reflects entitlement on the bound device."
                          >
                            Status
                          </th>
                          <th className="py-2 pr-4 font-medium">Device</th>
                          <th className="py-2 font-medium"> </th>
                        </tr>
                      </thead>
                      <tbody>
                        {proLicenseList.map((row) => {
                          const nominalMs = row.nominalGrantEndsAt
                            ? new Date(row.nominalGrantEndsAt).getTime()
                            : null;
                          const keyGrantEnded =
                            nominalMs !== null &&
                            !Number.isNaN(nominalMs) &&
                            nominalMs <= Date.now();
                          const deviceExtendedPastKeyGrant =
                            row.consumed && keyGrantEnded && row.deviceProActive === true;

                          return (
                            <tr
                              key={row.id}
                              className="border-b border-zinc-100 dark:border-zinc-700/80"
                            >
                              <td className="max-w-[11rem] py-2 pr-4 font-mono text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                                <span className="break-all" title={row.id}>
                                  {row.id}
                                </span>
                              </td>
                              <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                                {formatDate(new Date(row.createdAt).getTime())}
                              </td>
                              <td className="py-2 pr-4">
                                {formatProLicenseRowDuration(row.durationMonths, row.durationDays)}
                              </td>
                              <td className="max-w-[200px] truncate py-2 pr-4 text-zinc-700 dark:text-zinc-300">
                                {row.issuedToEmail ?? '—'}
                              </td>
                              <td className="max-w-[220px] py-2 pr-4 text-zinc-700 dark:text-zinc-300">
                                {proLicenseNotesEditingId === row.id ? (
                                  <div className="flex flex-col gap-1">
                                    <textarea
                                      value={proLicenseNotesDraft}
                                      onChange={(e) => setProLicenseNotesDraft(e.target.value)}
                                      rows={2}
                                      className={`${adminInputClass} w-full min-w-[160px] text-xs`}
                                      placeholder="Internal note…"
                                    />
                                    <div className="flex flex-wrap gap-1">
                                      <button
                                        type="button"
                                        disabled={proLicenseNotesSavingId === row.id}
                                        onClick={() => void handleSaveProLicenseNotes(row)}
                                        className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-[11px] font-medium dark:border-zinc-600 dark:bg-zinc-800"
                                      >
                                        {proLicenseNotesSavingId === row.id ? 'Saving…' : 'Save'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleCancelEditProLicenseNotes}
                                        className="rounded border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-600 dark:border-zinc-600 dark:text-zinc-400"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-0.5">
                                    <span
                                      className="line-clamp-2 text-xs"
                                      title={row.adminNotes ?? undefined}
                                    >
                                      {row.adminNotes ?? '—'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditProLicenseNotes(row)}
                                      className="self-start text-[11px] font-medium text-violet-700 hover:underline dark:text-violet-300"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="whitespace-nowrap py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                                {row.consumedAt
                                  ? formatDate(new Date(row.consumedAt).getTime())
                                  : '—'}
                              </td>
                              <td className="whitespace-nowrap py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                                {row.nominalGrantEndsAt
                                  ? formatDate(new Date(row.nominalGrantEndsAt).getTime())
                                  : '—'}
                              </td>
                              <td className="whitespace-nowrap py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                                {row.deviceProExpiresAt
                                  ? formatDate(new Date(row.deviceProExpiresAt).getTime())
                                  : '—'}
                              </td>
                              <td className="py-2 pr-4">
                                {!row.consumed ? (
                                  <span className="text-zinc-500">Unused</span>
                                ) : (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-green-700 dark:text-green-400">
                                      Redeemed
                                    </span>
                                    {row.deviceProActive ? (
                                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                                        Device in Pro
                                      </span>
                                    ) : row.deviceProExpiresAt ? (
                                      <span className="text-[11px] text-zinc-500">
                                        Device not in Pro
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-amber-600 dark:text-amber-400">
                                        No device row
                                      </span>
                                    )}
                                    {deviceExtendedPastKeyGrant ? (
                                      <span
                                        className="max-w-56 text-[10px] leading-snug text-amber-800 dark:text-amber-200/95"
                                        title="This key's own grant window is past, but DeviceProEntitlement for this device is still in the future (e.g. another key on the same device, IAP, or sync)."
                                      >
                                        This key&apos;s grant ended — device Pro from renewal /
                                        other source
                                      </span>
                                    ) : null}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 pr-4 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                                {row.devicePrefix ?? '—'}
                              </td>
                              <td className="py-2 text-right">
                                <div className="flex flex-wrap justify-end gap-2">
                                  {!row.consumed && (
                                    <button
                                      type="button"
                                      disabled={proLicenseDeletingId === row.id}
                                      onClick={() => void handleDeleteProLicense(row)}
                                      className="rounded border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-zinc-800 dark:text-red-400 dark:hover:bg-red-950/40"
                                    >
                                      {proLicenseDeletingId === row.id ? 'Deleting…' : 'Delete'}
                                    </button>
                                  )}
                                  {row.consumed && (
                                    <button
                                      type="button"
                                      disabled={proLicenseResettingId === row.id}
                                      onClick={() => void handleResetProLicense(row)}
                                      className="rounded border border-amber-200 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-900 dark:bg-zinc-800 dark:text-amber-200 dark:hover:bg-amber-950/40"
                                    >
                                      {proLicenseResettingId === row.id ? 'Resetting…' : 'Reset'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      Table is paginated (newest first) within the current list filters. CSV export
                      includes up to 10,000 rows with the same filters. Totals above are for all
                      keys in the database.
                    </p>
                    {proLicenseList.length === 0 && proLicensePagination != null && (
                      <p className="mt-2 text-sm text-zinc-500">
                        {proLicensePagination.totalFiltered === 0
                          ? proLicenseStatusFilter !== 'all' || proLicenseDeviceProFilter !== 'any'
                            ? 'No keys match these filters.'
                            : 'No keys yet.'
                          : 'No keys on this page.'}
                      </p>
                    )}
                  </div>
                )}
              </section>
            </>
          )}

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
                            : typeof status?.app.devicesWithPush === 'number'
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
