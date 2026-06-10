'use client';

import { Plus, Star, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  createEmptyLandingTestimonial,
  getDefaultLandingSocialProof,
  MAX_LANDING_TESTIMONIALS,
  type LandingSocialProofConfig,
  type LandingTestimonial,
} from '@/lib/landing-social-proof-defaults';

import {
  AdminAlert,
  AdminCard,
  AdminFormField,
  adminBtnGhostClass,
  adminBtnPrimaryClass,
  adminBtnSecondaryClass,
  adminInputClass,
} from './admin-ui';

type ApiResponse = {
  ok: boolean;
  editable?: boolean;
  hint?: string;
  config?: LandingSocialProofConfig;
  hasStoredCopy?: boolean;
  error?: string;
};

type PreviewLocale = 'en' | 'ru';

function starFillState(starIndex: number, rating: number): 'full' | 'partial' | 'empty' {
  if (rating >= starIndex) return 'full';
  if (rating >= starIndex - 0.5) return 'partial';
  return 'empty';
}

function AdminHeroRatingPreview({
  config,
}: {
  config: LandingSocialProofConfig;
}): React.ReactElement {
  if (!config.enabled || config.ratingsCount <= 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Hero rating hidden.</p>;
  }

  return (
    <p className="inline-flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
      <span className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: 5 }, (_, index) => {
          const starIndex = index + 1;
          const state = starFillState(starIndex, config.rating);
          return (
            <Star
              key={starIndex}
              className={
                state === 'full'
                  ? 'h-3.5 w-3.5 fill-amber-400 text-amber-400'
                  : state === 'partial'
                    ? 'h-3.5 w-3.5 fill-amber-400/45 text-amber-400'
                    : 'h-3.5 w-3.5 text-zinc-200 dark:text-zinc-700'
              }
              strokeWidth={1.75}
            />
          );
        })}
      </span>
      <span className="tabular-nums font-semibold">{config.rating.toFixed(1)}</span>
      <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>
        ·
      </span>
      <span className="font-normal text-zinc-500 dark:text-zinc-400">App Store</span>
    </p>
  );
}

function AdminTestimonialsPreview({
  config,
  locale,
}: {
  config: LandingSocialProofConfig;
  locale: PreviewLocale;
}): React.ReactElement {
  if (!config.testimonialsEnabled || config.testimonials.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Testimonials section hidden.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {config.testimonials.map((item, index) => {
        const quote = locale === 'ru' ? item.quoteRu : item.quoteEn;
        const source = locale === 'ru' ? item.sourceRu : item.sourceEn;

        return (
          <blockquote
            key={`${index}-${quote}`}
            className="rounded-2xl border border-zinc-200/90 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/60"
          >
            <div className="mb-2 flex gap-0.5" aria-hidden>
              {Array.from({ length: 5 }, (_, starIndex) => (
                <Star
                  key={starIndex}
                  className="h-3 w-3 fill-amber-400 text-amber-400"
                  strokeWidth={1.75}
                />
              ))}
            </div>
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
              &ldquo;{quote || '—'}&rdquo;
            </p>
            <footer className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {source || '—'}
            </footer>
          </blockquote>
        );
      })}
    </div>
  );
}

function TestimonialEditor({
  index,
  item,
  editable,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  item: LandingTestimonial;
  editable: boolean;
  onChange: (next: LandingTestimonial) => void;
  onRemove: () => void;
  canRemove: boolean;
}): React.ReactElement {
  return (
    <div className="rounded-xl border border-zinc-200/90 p-4 dark:border-zinc-700">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Testimonial {index + 1}
        </h4>
        {canRemove ? (
          <button
            type="button"
            disabled={!editable}
            onClick={onRemove}
            className={adminBtnGhostClass}
            aria-label={`Remove testimonial ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminFormField label="Quote (English)">
          <textarea
            required
            rows={3}
            disabled={!editable}
            value={item.quoteEn}
            onChange={(e) => onChange({ ...item, quoteEn: e.target.value })}
            className={adminInputClass}
          />
        </AdminFormField>
        <AdminFormField label="Quote (Russian)">
          <textarea
            required
            rows={3}
            disabled={!editable}
            value={item.quoteRu}
            onChange={(e) => onChange({ ...item, quoteRu: e.target.value })}
            className={adminInputClass}
          />
        </AdminFormField>
        <AdminFormField label="Source (English)">
          <input
            type="text"
            required
            disabled={!editable}
            value={item.sourceEn}
            onChange={(e) => onChange({ ...item, sourceEn: e.target.value })}
            className={adminInputClass}
          />
        </AdminFormField>
        <AdminFormField label="Source (Russian)">
          <input
            type="text"
            required
            disabled={!editable}
            value={item.sourceRu}
            onChange={(e) => onChange({ ...item, sourceRu: e.target.value })}
            className={adminInputClass}
          />
        </AdminFormField>
      </div>
    </div>
  );
}

export function AdminLandingSocialProofPanel(): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [editable, setEditable] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [hasStoredCopy, setHasStoredCopy] = useState(false);
  const [previewLocale, setPreviewLocale] = useState<PreviewLocale>('en');
  const [config, setConfig] = useState<LandingSocialProofConfig>(getDefaultLandingSocialProof());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/landing-social-proof', { credentials: 'include' });
      const data = (await res.json()) as ApiResponse;
      if (!data.ok || !data.config) {
        setError(data.error ?? 'Failed to load config');
        return;
      }
      setEditable(!!data.editable);
      setHint(data.hint ?? null);
      setHasStoredCopy(!!data.hasStoredCopy);
      setConfig(data.config);
    } catch {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/admin/landing-social-proof', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Save failed');
        return;
      }
      setMessage('Landing social proof saved.');
      if (data.config) {
        setConfig(data.config);
      }
      setHasStoredCopy(true);
    } catch {
      setError('Request failed');
    } finally {
      setSaving(false);
    }
  };

  const patch = (partial: Partial<LandingSocialProofConfig>) => {
    setConfig((current) => ({ ...current, ...partial }));
  };

  const updateTestimonial = (index: number, next: LandingTestimonial) => {
    setConfig((current) => ({
      ...current,
      testimonials: current.testimonials.map((item, itemIndex) =>
        itemIndex === index ? next : item,
      ),
    }));
  };

  const addTestimonial = () => {
    if (config.testimonials.length >= MAX_LANDING_TESTIMONIALS) return;
    setConfig((current) => ({
      ...current,
      testimonials: [...current.testimonials, createEmptyLandingTestimonial()],
    }));
  };

  const removeTestimonial = (index: number) => {
    setConfig((current) => ({
      ...current,
      testimonials: current.testimonials.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  return (
    <AdminCard
      title="Landing — social proof"
      description="Hero App Store rating and testimonials section. Stored in AppConfig as LANDING_SOCIAL_PROOF."
      headerRight={
        <button type="button" onClick={() => void fetchConfig()} className={adminBtnSecondaryClass}>
          Refresh
        </button>
      }
    >
      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
          {!editable && hint ? <AdminAlert tone="warning">{hint}</AdminAlert> : null}
          {editable && !hasStoredCopy ? (
            <AdminAlert tone="info">
              No saved copy yet — preview shows defaults until you save.
            </AdminAlert>
          ) : null}

          <fieldset className="space-y-4" disabled={!editable}>
            <legend className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Hero rating
            </legend>
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => patch({ enabled: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Show in hero
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminFormField label="Average rating" hint="0–5, one decimal (e.g. 5.0)">
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  required
                  value={config.rating}
                  onChange={(e) => patch({ rating: parseFloat(e.target.value) || 0 })}
                  className={adminInputClass}
                />
              </AdminFormField>
              <AdminFormField label="Ratings count" hint="Total App Store ratings">
                <input
                  type="number"
                  min={0}
                  required
                  value={config.ratingsCount}
                  onChange={(e) => patch({ ratingsCount: parseInt(e.target.value, 10) || 0 })}
                  className={adminInputClass}
                />
              </AdminFormField>
            </div>
          </fieldset>

          <fieldset
            className="space-y-4 border-t border-zinc-100 pt-6 dark:border-zinc-800"
            disabled={!editable}
          >
            <legend className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Testimonials section
            </legend>
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
              <input
                type="checkbox"
                checked={config.testimonialsEnabled}
                onChange={(e) => patch({ testimonialsEnabled: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Show testimonials on landing page
            </label>

            <div className="space-y-4">
              {config.testimonials.map((item, index) => (
                <TestimonialEditor
                  key={index}
                  index={index}
                  item={item}
                  editable={editable}
                  onChange={(next) => updateTestimonial(index, next)}
                  onRemove={() => removeTestimonial(index)}
                  canRemove={config.testimonials.length > 1}
                />
              ))}
            </div>

            {config.testimonials.length < MAX_LANDING_TESTIMONIALS ? (
              <button
                type="button"
                disabled={!editable}
                onClick={addTestimonial}
                className={adminBtnSecondaryClass}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add testimonial
              </button>
            ) : null}
          </fieldset>

          <div className="space-y-4 border-t border-zinc-100 pt-6 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Preview</h3>
              <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
                {(['en', 'ru'] as const).map((locale) => (
                  <button
                    key={locale}
                    type="button"
                    onClick={() => setPreviewLocale(locale)}
                    className={`rounded-md px-3 py-1 text-xs font-medium uppercase ${
                      previewLocale === locale
                        ? 'bg-indigo-600 text-white'
                        : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {locale}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4 rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Hero
                </p>
                <AdminHeroRatingPreview config={config} />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Testimonials
                </p>
                <AdminTestimonialsPreview config={config} locale={previewLocale} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <button type="submit" disabled={!editable || saving} className={adminBtnPrimaryClass}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {message ? (
              <span className="text-sm text-emerald-600 dark:text-emerald-400">{message}</span>
            ) : null}
            {error ? <span className="text-sm text-red-600 dark:text-red-400">{error}</span> : null}
          </div>
        </form>
      )}
    </AdminCard>
  );
}
