'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import {
  MOBILE_BANNER_LOCALES,
  type MobileBannerConfig,
  type MobileBannerLocale,
  type MobileBannerManifest,
} from '@/lib/mobile-banner-manifest';
import { suggestMobileBannerId } from '@/lib/mobile-banner-id';

import {
  AdminAlert,
  AdminCard,
  AdminFormField,
  adminBtnPrimaryClass,
  adminBtnSecondaryClass,
  adminInputClass,
} from './admin-ui';
import { fromDatetimeLocalValue, toDatetimeLocalValue } from './adminDatetimeLocal';

type ApiOk = {
  ok: true;
  editable?: boolean;
  hint?: string;
  manifest: MobileBannerManifest;
  hasStoredCopy?: boolean;
};

type ApiErr = { ok: false; error?: string };

type LocaleDraft = {
  title: string;
  body: string;
  ctaLabel: string;
};

type BannerDraft = {
  enabled: boolean;
  id: string;
  ctaUrl: string;
  startsAt: string;
  endsAt: string;
  platformsIos: boolean;
  platformsAndroid: boolean;
  minAppVersion: string;
  dismissible: boolean;
  locales: Record<MobileBannerLocale, LocaleDraft>;
};

function emptyLocaleDraft(): LocaleDraft {
  return {
    title: '',
    body: '',
    ctaLabel: '',
  };
}

function emptyDraft(): BannerDraft {
  return {
    enabled: false,
    id: '',
    ctaUrl: '',
    startsAt: '',
    endsAt: '',
    platformsIos: true,
    platformsAndroid: true,
    minAppVersion: '',
    dismissible: true,
    locales: {
      en: emptyLocaleDraft(),
      ru: emptyLocaleDraft(),
    },
  };
}

function toLocaleDraft(content: {
  title: string;
  body: string;
  ctaLabel: string | null;
}): LocaleDraft {
  return {
    title: content.title,
    body: content.body,
    ctaLabel: content.ctaLabel ?? '',
  };
}

function toDraft(banner: MobileBannerConfig | null): BannerDraft {
  if (!banner) {
    return emptyDraft();
  }

  return {
    enabled: banner.enabled,
    id: banner.id,
    ctaUrl: banner.ctaUrl ?? '',
    startsAt: banner.startsAt ?? '',
    endsAt: banner.endsAt ?? '',
    platformsIos: banner.platforms.includes('ios'),
    platformsAndroid: banner.platforms.includes('android'),
    minAppVersion: banner.minAppVersion ?? '',
    dismissible: banner.dismissible,
    locales: {
      en: toLocaleDraft(banner.locales.en),
      ru: toLocaleDraft(banner.locales.ru),
    },
  };
}

function toBannerPayload(draft: BannerDraft): MobileBannerConfig | null {
  if (!draft.enabled) {
    return null;
  }

  const platforms: Array<'ios' | 'android'> = [];
  if (draft.platformsIos) platforms.push('ios');
  if (draft.platformsAndroid) platforms.push('android');

  const locales = {
    en: {
      title: draft.locales.en.title.trim(),
      body: draft.locales.en.body.trim(),
      ctaLabel: draft.locales.en.ctaLabel.trim() || null,
    },
    ru: {
      title: draft.locales.ru.title.trim(),
      body: draft.locales.ru.body.trim(),
      ctaLabel: draft.locales.ru.ctaLabel.trim() || null,
    },
  } satisfies MobileBannerConfig['locales'];

  const id =
    draft.id.trim() ||
    suggestMobileBannerId({
      titleEn: locales.en.title,
      titleRu: locales.ru.title,
      startsAt: draft.startsAt.trim() || null,
    });

  return {
    id,
    enabled: true,
    ctaUrl: draft.ctaUrl.trim() || null,
    startsAt: draft.startsAt.trim() || null,
    endsAt: draft.endsAt.trim() || null,
    platforms,
    minAppVersion: draft.minAppVersion.trim() || null,
    dismissible: draft.dismissible,
    locales,
  };
}

export function AdminMobileBannerPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editable, setEditable] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [hasStoredCopy, setHasStoredCopy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState<BannerDraft>(emptyDraft());
  const [idTouched, setIdTouched] = useState(false);
  const [localeTab, setLocaleTab] = useState<MobileBannerLocale>('en');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publicUrl = `${BASE_URL_OR_FALLBACK.replace(/\/$/, '')}/api/public/mobile-banner`;
  const activeLocaleDraft = draft.locales[localeTab];

  const fetchManifest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/mobile-banner', { credentials: 'include' });
      const data = (await res.json()) as ApiOk | ApiErr;
      if (!res.ok || !data.ok) {
        setError((data as ApiErr).error ?? 'Failed to load banner');
        return;
      }
      setEditable(!!data.editable);
      setHint(data.hint ?? null);
      setHasStoredCopy(!!data.hasStoredCopy);
      setRevision(data.manifest.revision);
      setDraft(toDraft(data.manifest.banner));
      setIdTouched(Boolean(data.manifest.banner?.id));
    } catch {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchManifest();
  }, [fetchManifest]);

  const previewTitle = useMemo(
    () => activeLocaleDraft.title.trim() || 'Banner title',
    [activeLocaleDraft.title],
  );
  const previewBody = useMemo(
    () => activeLocaleDraft.body.trim() || 'Banner body copy appears here.',
    [activeLocaleDraft.body],
  );

  const suggestedBannerId = useMemo(
    () =>
      suggestMobileBannerId({
        titleEn: draft.locales.en.title,
        titleRu: draft.locales.ru.title,
        startsAt: draft.startsAt.trim() || null,
      }),
    [draft.locales.en.title, draft.locales.ru.title, draft.startsAt],
  );

  useEffect(() => {
    if (!draft.enabled || idTouched) {
      return;
    }

    setDraft((prev) => {
      if (prev.id === suggestedBannerId) {
        return prev;
      }
      return { ...prev, id: suggestedBannerId };
    });
  }, [draft.enabled, idTouched, suggestedBannerId]);

  const updateLocaleDraft = (patch: Partial<LocaleDraft>) => {
    setDraft((prev) => ({
      ...prev,
      locales: {
        ...prev.locales,
        [localeTab]: {
          ...prev.locales[localeTab],
          ...patch,
        },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    const banner = toBannerPayload(draft);
    if (banner && banner.platforms.length === 0) {
      setError('Select at least one platform.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/mobile-banner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ banner }),
      });
      const data = (await res.json()) as ApiOk | ApiErr;
      if (!res.ok || !data.ok) {
        setError((data as ApiErr).error ?? 'Save failed');
        return;
      }
      setMessage('Banner saved.');
      setRevision(data.manifest.revision);
      setDraft(toDraft(data.manifest.banner));
      setIdTouched(Boolean(data.manifest.banner?.id));
      setHasStoredCopy(true);
    } catch {
      setError('Request failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPublicUrl = async () => {
    setError(null);
    try {
      await navigator.clipboard.writeText(publicUrl);
      setMessage('Public URL copied.');
    } catch {
      setError('Could not copy URL');
    }
  };

  return (
    <AdminCard
      title="Mobile in-app banner"
      description="Promotional banner shown in the mobile inbox. Fill copy per locale; shared settings apply to all languages."
      headerRight={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void fetchManifest()}
            className={adminBtnSecondaryClass}
          >
            Refresh
          </button>
          <button
            type="button"
            disabled={!editable || saving}
            onClick={() => void handleSave()}
            className={adminBtnPrimaryClass}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      }
    >
      <p className="mb-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">GET {publicUrl}</p>
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">Revision: {revision}</p>

      {!hasStoredCopy && editable ? (
        <AdminAlert tone="warning" className="mb-3">
          Nothing saved yet — the public API returns an empty default until you save.
        </AdminAlert>
      ) : null}
      {hint ? <AdminAlert tone="warning">{hint}</AdminAlert> : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleCopyPublicUrl()}
          className={adminBtnSecondaryClass}
        >
          Copy public URL
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
              <input
                type="checkbox"
                checked={draft.enabled}
                disabled={!editable}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setDraft((prev) => ({
                    ...prev,
                    enabled,
                    id:
                      enabled && !idTouched
                        ? suggestMobileBannerId({
                            titleEn: prev.locales.en.title,
                            titleRu: prev.locales.ru.title,
                            startsAt: prev.startsAt.trim() || null,
                          })
                        : prev.id,
                  }));
                }}
              />
              Banner enabled
            </label>

            <AdminFormField
              label="Banner id"
              hint="Auto-generated from title and start date. Edit manually to keep a custom id."
            >
              <div className="flex flex-wrap gap-2">
                <input
                  value={draft.id}
                  disabled={!editable || !draft.enabled}
                  onChange={(e) => {
                    setIdTouched(true);
                    setDraft((prev) => ({ ...prev, id: e.target.value }));
                  }}
                  placeholder={suggestedBannerId}
                  className={`${adminInputClass} min-w-[220px] flex-1 font-mono text-xs`}
                />
                <button
                  type="button"
                  disabled={!editable || !draft.enabled}
                  onClick={() => {
                    setIdTouched(false);
                    setDraft((prev) => ({ ...prev, id: suggestedBannerId }));
                  }}
                  className={adminBtnSecondaryClass}
                >
                  Regenerate
                </button>
              </div>
            </AdminFormField>

            <div className="flex flex-wrap gap-2">
              {MOBILE_BANNER_LOCALES.map((locale) => (
                <button
                  key={locale}
                  type="button"
                  onClick={() => setLocaleTab(locale)}
                  className={localeTab === locale ? adminBtnPrimaryClass : adminBtnSecondaryClass}
                >
                  {locale.toUpperCase()}
                </button>
              ))}
            </div>

            <AdminFormField label={`Title (${localeTab.toUpperCase()})`}>
              <input
                value={activeLocaleDraft.title}
                disabled={!editable || !draft.enabled}
                onChange={(e) => updateLocaleDraft({ title: e.target.value })}
                className={adminInputClass}
              />
            </AdminFormField>

            <AdminFormField label={`Body (${localeTab.toUpperCase()})`}>
              <textarea
                value={activeLocaleDraft.body}
                disabled={!editable || !draft.enabled}
                onChange={(e) => updateLocaleDraft({ body: e.target.value })}
                rows={4}
                className={`${adminInputClass} min-h-[96px] resize-y`}
              />
            </AdminFormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <AdminFormField label={`CTA label (${localeTab.toUpperCase()})`}>
                <input
                  value={activeLocaleDraft.ctaLabel}
                  disabled={!editable || !draft.enabled}
                  onChange={(e) => updateLocaleDraft({ ctaLabel: e.target.value })}
                  placeholder={localeTab === 'ru' ? 'Открыть' : 'Open'}
                  className={adminInputClass}
                />
              </AdminFormField>
              <AdminFormField label="CTA URL (shared)">
                <input
                  value={draft.ctaUrl}
                  disabled={!editable || !draft.enabled}
                  onChange={(e) => setDraft((prev) => ({ ...prev, ctaUrl: e.target.value }))}
                  placeholder="https://…, mailto:support@…, or voiceinbox://settings/pro"
                  className={adminInputClass}
                />
              </AdminFormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <AdminFormField
                label="Starts at"
                hint="Local date and time. Leave empty for no start limit."
              >
                <input
                  type="datetime-local"
                  value={toDatetimeLocalValue(draft.startsAt)}
                  disabled={!editable || !draft.enabled}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      startsAt: fromDatetimeLocalValue(e.target.value) ?? '',
                    }))
                  }
                  className={adminInputClass}
                />
              </AdminFormField>
              <AdminFormField
                label="Ends at"
                hint="Local date and time. Leave empty for no end limit."
              >
                <input
                  type="datetime-local"
                  value={toDatetimeLocalValue(draft.endsAt)}
                  disabled={!editable || !draft.enabled}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      endsAt: fromDatetimeLocalValue(e.target.value) ?? '',
                    }))
                  }
                  className={adminInputClass}
                />
              </AdminFormField>
            </div>

            <AdminFormField label="Platforms">
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.platformsIos}
                    disabled={!editable || !draft.enabled}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, platformsIos: e.target.checked }))
                    }
                  />
                  iOS
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.platformsAndroid}
                    disabled={!editable || !draft.enabled}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, platformsAndroid: e.target.checked }))
                    }
                  />
                  Android
                </label>
              </div>
            </AdminFormField>

            <AdminFormField label="Minimum app version">
              <input
                value={draft.minAppVersion}
                disabled={!editable || !draft.enabled}
                onChange={(e) => setDraft((prev) => ({ ...prev, minAppVersion: e.target.value }))}
                placeholder="1.4.0"
                className={adminInputClass}
              />
            </AdminFormField>

            <label className="flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
              <input
                type="checkbox"
                checked={draft.dismissible}
                disabled={!editable || !draft.enabled}
                onChange={(e) => setDraft((prev) => ({ ...prev, dismissible: e.target.checked }))}
              />
              Dismissible
            </label>
          </div>

          <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Preview ({localeTab.toUpperCase()})
            </p>
            {draft.enabled ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950/40">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {previewTitle}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {previewBody}
                </p>
                {activeLocaleDraft.ctaLabel.trim() ? (
                  <span className="mt-3 inline-flex rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {activeLocaleDraft.ctaLabel.trim()}
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Banner disabled.</p>
            )}
          </div>
        </div>
      )}

      {message ? (
        <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{message}</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </AdminCard>
  );
}
