'use client';

import { Copy, Eye } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  AdminAlert,
  AdminCard,
  AdminFormField,
  AdminStatusBadge,
  AdminSubNav,
  adminBtnGhostClass,
  adminBtnPrimaryClass,
  adminBtnSecondaryClass,
  adminInputClass,
  adminSelectClass,
} from './admin-ui';

type EventItem = {
  id: string;
  eventId: string;
  locale: string;
  title: string;
  contentType: 'html' | 'markdown';
  body: string;
  ctaLabel: string | null;
  published: boolean;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

const LOCALE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'en', label: 'English' },
  { id: 'ru', label: 'Russian' },
] as const;

const emptyForm = {
  eventId: '',
  locale: 'en' as 'en' | 'ru',
  title: '',
  contentType: 'html' as 'html' | 'markdown',
  body: '',
  ctaLabel: '',
  published: false,
};

function suggestCloneEventId(eventId: string, locale: string, items: EventItem[]): string {
  const base = eventId.replace(/(-copy(-\d+)?)+$/, '') || eventId;
  const taken = new Set(
    items.filter((i) => i.locale === locale).map((i) => i.eventId),
  );
  const first = `${base}-copy`;
  if (!taken.has(first) && first.length <= 120) return first;
  for (let n = 2; n < 500; n++) {
    const candidate = `${base}-copy-${n}`;
    if (!taken.has(candidate) && candidate.length <= 120) return candidate;
  }
  return `${base.slice(0, 100)}-copy`.slice(0, 120);
}

export function AdminInAppEventsPanel() {
  const [listLocale, setListLocale] = useState<'all' | 'en' | 'ru'>('all');
  const [items, setItems] = useState<EventItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErr, setPreviewErr] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const q = listLocale === 'all' ? '' : `?locale=${listLocale}`;
      const res = await fetch(`/api/admin/in-app-events${q}`, { credentials: 'include' });
      const data = (await res.json()) as { ok?: boolean; items?: EventItem[]; error?: string };
      if (!data.ok || !data.items) {
        setListError(data.error ?? 'Failed to load');
        return;
      }
      setItems(data.items);
    } catch {
      setListError('Request failed');
    } finally {
      setListLoading(false);
    }
  }, [listLocale]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const selectItem = (item: EventItem) => {
    setEditingId(item.id);
    setSaveMsg(null);
    setSaveErr(null);
    setPreviewHtml(null);
    setPreviewErr(null);
    setForm({
      eventId: item.eventId,
      locale: item.locale === 'ru' ? 'ru' : 'en',
      title: item.title,
      contentType: item.contentType === 'markdown' ? 'markdown' : 'html',
      body: item.body,
      ctaLabel: item.ctaLabel ?? '',
      published: item.published,
    });
  };

  const newEvent = () => {
    setEditingId(null);
    setSaveMsg(null);
    setSaveErr(null);
    setPreviewHtml(null);
    setPreviewErr(null);
    setForm({ ...emptyForm });
  };

  const cloneEvent = (item: EventItem) => {
    setEditingId(null);
    setSaveErr(null);
    setPreviewHtml(null);
    setForm({
      eventId: suggestCloneEventId(item.eventId, item.locale, items),
      locale: item.locale === 'ru' ? 'ru' : 'en',
      title: `${item.title} (copy)`,
      contentType: item.contentType === 'markdown' ? 'markdown' : 'html',
      body: item.body,
      ctaLabel: item.ctaLabel ?? '',
      published: false,
    });
    setSaveMsg('Cloned as draft — review eventId and title, then Create.');
  };

  const cloneLocale = (item: EventItem) => {
    const nextLocale = item.locale === 'ru' ? 'en' : 'ru';
    const exists = items.some((i) => i.eventId === item.eventId && i.locale === nextLocale);
    if (exists) {
      setSaveErr(`A ${nextLocale} page already exists for eventId ${item.eventId}.`);
      return;
    }
    setEditingId(null);
    setSaveErr(null);
    setPreviewHtml(null);
    setForm({
      eventId: item.eventId,
      locale: nextLocale,
      title: item.title,
      contentType: item.contentType === 'markdown' ? 'markdown' : 'html',
      body: item.body,
      ctaLabel: item.ctaLabel ?? '',
      published: false,
    });
    setSaveMsg(`Copied body to ${nextLocale} locale — translate and save.`);
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreviewErr(null);
    try {
      const res = await fetch('/api/admin/in-app-events/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          contentType: form.contentType,
          body: form.body,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        documentHtml?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.documentHtml) {
        setPreviewErr(data.error ?? 'Preview failed');
        setPreviewHtml(null);
        return;
      }
      setPreviewHtml(data.documentHtml);
    } catch {
      setPreviewErr('Preview request failed');
      setPreviewHtml(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMsg(null);
    setSaveErr(null);
    setSaving(true);
    try {
      const payload = {
        eventId: form.eventId.trim().toLowerCase(),
        locale: form.locale,
        title: form.title.trim(),
        contentType: form.contentType,
        body: form.body,
        ctaLabel: form.ctaLabel.trim() || null,
        published: form.published,
      };

      if (editingId) {
        const res = await fetch(`/api/admin/in-app-events/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setSaveErr(data.error ?? 'Save failed');
          return;
        }
        setSaveMsg('Saved.');
        void fetchList();
      } else {
        const res = await fetch('/api/admin/in-app-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; item?: EventItem; error?: string };
        if (!res.ok || !data.ok || !data.item) {
          setSaveErr(data.error ?? 'Create failed');
          return;
        }
        setSaveMsg('Created.');
        setEditingId(data.item.id);
        void fetchList();
      }
    } catch {
      setSaveErr('Request failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!window.confirm('Delete this in-app event page?')) return;
    setSaveErr(null);
    try {
      const res = await fetch(`/api/admin/in-app-events/${editingId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setSaveErr(data.error ?? 'Delete failed');
        return;
      }
      newEvent();
      void fetchList();
    } catch {
      setSaveErr('Request failed');
    }
  };

  const deepLink =
    form.eventId.trim().length > 0
      ? `voiceinbox://in-app-event/${form.eventId.trim().toLowerCase()}`
      : 'voiceinbox://in-app-event/<eventId>';

  return (
    <div className="space-y-4">
      <AdminCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <AdminSubNav
            items={LOCALE_FILTERS}
            value={listLocale}
            onChange={(id) => setListLocale(id)}
          />
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => void fetchList()}
              className={adminBtnSecondaryClass}
            >
              Refresh
            </button>
            <button type="button" onClick={newEvent} className={adminBtnPrimaryClass}>
              New event
            </button>
          </div>
        </div>
      </AdminCard>

      {listError ? <AdminAlert tone="error">{listError}</AdminAlert> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,280px)_1fr_minmax(0,320px)] xl:items-start">
        <AdminCard
          title="Events"
          description={listLoading ? 'Loading…' : `${items.length} in list`}
          padding={false}
        >
          <div className="max-h-[min(72vh,640px)] overflow-y-auto p-2">
            {!listLoading && items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-zinc-500">No events yet.</p>
            ) : (
              <ul className="space-y-1">
                {items.map((item) => {
                  const active = editingId === item.id;
                  return (
                    <li key={item.id} className="group flex items-stretch gap-0.5">
                      <button
                        type="button"
                        onClick={() => selectItem(item)}
                        className={`min-w-0 flex-1 rounded-lg px-3 py-2.5 text-left transition-colors ${
                          active
                            ? 'bg-indigo-50 ring-1 ring-indigo-200 dark:bg-indigo-950/40 dark:ring-indigo-800'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                        }`}
                      >
                        <p className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {item.title}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[11px] text-zinc-500">
                            {item.locale}/{item.eventId}
                          </span>
                          {item.published ? (
                            <AdminStatusBadge tone="success">Live</AdminStatusBadge>
                          ) : (
                            <AdminStatusBadge tone="warning">Draft</AdminStatusBadge>
                          )}
                        </div>
                      </button>
                      <button
                        type="button"
                        title="Clone event"
                        aria-label={`Clone ${item.title}`}
                        onClick={() => cloneEvent(item)}
                        className={`${adminBtnGhostClass} shrink-0 self-center px-2 opacity-70 group-hover:opacity-100`}
                      >
                        <Copy className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </AdminCard>

        <AdminCard
          title={editingId ? 'Edit event' : 'New event'}
          description="HTML or Markdown body · eventId matches App Store deep link slug."
        >
          {saveMsg || saveErr ? (
            <div className="mb-4 space-y-2">
              {saveMsg ? <AdminAlert tone="success">{saveMsg}</AdminAlert> : null}
              {saveErr ? <AdminAlert tone="error">{saveErr}</AdminAlert> : null}
            </div>
          ) : null}
          <form
            onSubmit={(e) => void handleSave(e)}
            className="flex max-h-[min(72vh,640px)] flex-col"
          >
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              <AdminFormField label="Deep link" hint="Use in App Store Connect → Event deep link">
                <input
                  readOnly
                  value={deepLink}
                  className={`${adminInputClass} font-mono text-xs`}
                />
              </AdminFormField>
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminFormField label="Locale">
                  <select
                    value={form.locale}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, locale: e.target.value as 'en' | 'ru' }))
                    }
                    className={adminSelectClass}
                  >
                    <option value="en">English (en)</option>
                    <option value="ru">Russian (ru)</option>
                  </select>
                </AdminFormField>
                <AdminFormField label="Event ID" hint="e.g. update_1-1-0">
                  <input
                    value={form.eventId}
                    onChange={(e) => setForm((f) => ({ ...f, eventId: e.target.value }))}
                    required
                    className={`${adminInputClass} font-mono`}
                    placeholder="update_1-1-0"
                  />
                </AdminFormField>
              </div>
              <AdminFormField label="Title (admin list)">
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  className={adminInputClass}
                />
              </AdminFormField>
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminFormField label="Content type">
                  <select
                    value={form.contentType}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        contentType: e.target.value as 'html' | 'markdown',
                      }))
                    }
                    className={adminSelectClass}
                  >
                    <option value="html">HTML</option>
                    <option value="markdown">Markdown</option>
                  </select>
                </AdminFormField>
                <AdminFormField label="CTA label (optional)" hint="Mobile footer button">
                  <input
                    value={form.ctaLabel}
                    onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                    className={adminInputClass}
                    placeholder="Continue"
                  />
                </AdminFormField>
              </div>
              <AdminFormField
                label={form.contentType === 'markdown' ? 'Body (Markdown)' : 'Body (HTML)'}
              >
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  required
                  rows={12}
                  className={`${adminInputClass} min-h-[220px] font-mono text-xs leading-relaxed`}
                />
              </AdminFormField>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                  className="rounded border-zinc-300"
                />
                Published (visible in mobile app)
              </label>
            </div>

            <div className="mt-4 shrink-0 space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={saving} className={adminBtnPrimaryClass}>
                  {saving ? 'Saving…' : editingId ? 'Save' : 'Create'}
                </button>
                <button
                  type="button"
                  disabled={previewLoading || !form.body.trim()}
                  onClick={() => void handlePreview()}
                  className={adminBtnSecondaryClass}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Eye className="h-4 w-4" aria-hidden />
                    {previewLoading ? 'Preview…' : 'Preview'}
                  </span>
                </button>
                {editingId ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const source = items.find((i) => i.id === editingId);
                        if (source) cloneLocale(source);
                      }}
                      className={adminBtnSecondaryClass}
                    >
                      Copy locale
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const source = items.find((i) => i.id === editingId);
                        if (source) cloneEvent(source);
                      }}
                      className={adminBtnSecondaryClass}
                    >
                      Clone
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      Delete
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </form>
        </AdminCard>

        <AdminCard title="Preview" description="Approximate WebView rendering in the app.">
          {previewErr ? <AdminAlert tone="error">{previewErr}</AdminAlert> : null}
          {previewHtml ? (
            <iframe
              title="In-app event preview"
              srcDoc={previewHtml}
              sandbox=""
              className="h-[min(72vh,640px)] w-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-700"
            />
          ) : (
            <p className="py-12 text-center text-sm text-zinc-500">
              Click Preview to render the current body.
            </p>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
