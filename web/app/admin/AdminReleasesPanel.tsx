'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  AdminPanelHeading,
  adminBtnPrimaryClass,
  adminBtnSecondaryClass,
  adminCardSurfaceClass,
  adminInputClass,
  adminSelectClass,
} from './admin-ui';

type ReleaseItem = {
  id: string;
  locale: string;
  slug: string;
  title: string;
  version: string | null;
  summary: string | null;
  body: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(v: string): string | null {
  if (!v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const emptyForm = {
  locale: 'en' as 'en' | 'ru',
  slug: '',
  title: '',
  version: '',
  summary: '',
  body: '',
  published: false,
  publishedAtLocal: '',
};

export function AdminReleasesPanel() {
  const [listLocale, setListLocale] = useState<'all' | 'en' | 'ru'>('all');
  const [items, setItems] = useState<ReleaseItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const q = listLocale === 'all' ? '' : `?locale=${listLocale}`;
      const res = await fetch(`/api/admin/releases${q}`, { credentials: 'include' });
      const data = (await res.json()) as { ok?: boolean; items?: ReleaseItem[]; error?: string };
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

  const selectItem = (r: ReleaseItem) => {
    setEditingId(r.id);
    setSaveMsg(null);
    setSaveErr(null);
    setForm({
      locale: r.locale === 'ru' ? 'ru' : 'en',
      slug: r.slug,
      title: r.title,
      version: r.version ?? '',
      summary: r.summary ?? '',
      body: r.body,
      published: r.published,
      publishedAtLocal: toDatetimeLocalValue(r.publishedAt),
    });
  };

  const newRelease = () => {
    setEditingId(null);
    setSaveMsg(null);
    setSaveErr(null);
    setForm({ ...emptyForm });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMsg(null);
    setSaveErr(null);
    setSaving(true);
    const publishedAtIso = fromDatetimeLocalValue(form.publishedAtLocal);
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/releases/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            locale: form.locale,
            slug: form.slug.trim().toLowerCase(),
            title: form.title.trim(),
            version: form.version.trim() || null,
            summary: form.summary.trim() || null,
            body: form.body,
            published: form.published,
            publishedAt: form.published ? (publishedAtIso ?? new Date().toISOString()) : null,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setSaveErr(data.error ?? 'Save failed');
          return;
        }
        setSaveMsg('Saved.');
        void fetchList();
      } else {
        const res = await fetch('/api/admin/releases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            locale: form.locale,
            slug: form.slug.trim().toLowerCase(),
            title: form.title.trim(),
            version: form.version.trim() || null,
            summary: form.summary.trim() || null,
            body: form.body,
            published: form.published,
            publishedAt: form.published ? publishedAtIso : null,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; item?: ReleaseItem; error?: string };
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
    if (!window.confirm('Delete this release?')) return;
    setSaveErr(null);
    try {
      const res = await fetch(`/api/admin/releases/${editingId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setSaveErr(data.error ?? 'Delete failed');
        return;
      }
      newRelease();
      void fetchList();
    } catch {
      setSaveErr('Request failed');
    }
  };

  return (
    <div className="space-y-8">
      <AdminPanelHeading
        title="Blog (landing page)"
        description="Markdown body. Slug: lowercase, digits, hyphens. Separate post per locale (en / ru)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="rel-locale-filter">
              Filter list
            </label>
            <select
              id="rel-locale-filter"
              value={listLocale}
              onChange={(e) => setListLocale(e.target.value as 'all' | 'en' | 'ru')}
              className={adminSelectClass}
            >
              <option value="all">All locales</option>
              <option value="en">English only</option>
              <option value="ru">Russian only</option>
            </select>
            <button
              type="button"
              onClick={() => void fetchList()}
              className={adminBtnSecondaryClass}
            >
              Refresh list
            </button>
            <button type="button" onClick={newRelease} className={adminBtnPrimaryClass}>
              New release
            </button>
          </div>
        }
      />

      {listError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {listError}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className={adminCardSurfaceClass}>
          <h3 className="border-b border-zinc-100 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            Posts
          </h3>
          <div className="max-h-[min(70vh,520px)] overflow-y-auto p-2">
            {listLoading ? (
              <p className="p-4 text-sm text-zinc-500">Loading…</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">No posts.</p>
            ) : (
              <ul className="space-y-1">
                {items.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => selectItem(r)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        editingId === r.id
                          ? 'bg-zinc-200 dark:bg-zinc-700'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                      }`}
                    >
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {r.title}
                      </span>
                      <span className="ml-2 font-mono text-xs text-zinc-500">
                        {r.locale}/{r.slug}
                      </span>
                      {!r.published && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                          draft
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className={`${adminCardSurfaceClass} p-5`}>
          <h3 className="mb-4 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            {editingId ? 'Edit release' : 'New release'}
          </h3>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Locale</label>
                <select
                  value={form.locale}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, locale: e.target.value as 'en' | 'ru' }))
                  }
                  className={adminSelectClass}
                >
                  <option value="en">en</option>
                  <option value="ru">ru</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Slug (URL)</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  required
                  className={`${adminInputClass} font-mono`}
                  placeholder="1-4-0"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                className={adminInputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Version (optional)
              </label>
              <input
                value={form.version}
                onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                className={adminInputClass}
                placeholder="1.4.0"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Summary (optional, list preview)
              </label>
              <textarea
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                rows={2}
                className={adminInputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Body (Markdown)
              </label>
              <textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                required
                rows={12}
                className={`${adminInputClass} font-mono`}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                className="rounded border-zinc-300"
              />
              Published (visible on /releases)
            </label>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Published date (local, optional if publishing now)
              </label>
              <input
                type="datetime-local"
                value={form.publishedAtLocal}
                onChange={(e) => setForm((f) => ({ ...f, publishedAtLocal: e.target.value }))}
                className={adminInputClass}
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button type="submit" disabled={saving} className={adminBtnPrimaryClass}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Delete
                </button>
              )}
            </div>
            {saveMsg && <p className="text-sm text-green-600 dark:text-green-400">{saveMsg}</p>}
            {saveErr && <p className="text-sm text-red-600 dark:text-red-400">{saveErr}</p>}
          </form>
        </section>
      </div>
    </div>
  );
}
