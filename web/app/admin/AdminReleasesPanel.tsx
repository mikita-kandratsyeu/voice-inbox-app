'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  AdminAlert,
  AdminCard,
  AdminFormField,
  AdminStatusBadge,
  AdminSubNav,
  adminBtnPrimaryClass,
  adminBtnSecondaryClass,
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

const LOCALE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'en', label: 'English' },
  { id: 'ru', label: 'Russian' },
] as const;

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
  const [generatingDraft, setGeneratingDraft] = useState(false);

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

  const handleGenerateDraft = async () => {
    setGeneratingDraft(true);
    setSaveErr(null);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/admin/releases/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ locale: form.locale }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        draft?: {
          locale: string;
          slug: string;
          title: string;
          version: string;
          summary: string;
          body: string;
          commitCount: number;
        };
        error?: string;
      };
      if (!res.ok || !data.ok || !data.draft) {
        setSaveErr(data.error ?? 'Generate failed');
        return;
      }
      const d = data.draft;
      setEditingId(null);
      setForm({
        locale: d.locale === 'ru' ? 'ru' : 'en',
        slug: d.slug,
        title: d.title,
        version: d.version,
        summary: d.summary,
        body: d.body,
        published: false,
        publishedAtLocal: '',
      });
      setSaveMsg(
        `Draft from git (${d.commitCount} commit${d.commitCount === 1 ? '' : 's'}). Review and save.`,
      );
    } catch {
      setSaveErr('Generate request failed');
    } finally {
      setGeneratingDraft(false);
    }
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
            <button type="button" onClick={newRelease} className={adminBtnPrimaryClass}>
              New post
            </button>
          </div>
        </div>
      </AdminCard>

      {listError ? <AdminAlert tone="error">{listError}</AdminAlert> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,300px)_1fr] lg:items-start">
        <AdminCard
          title="Posts"
          description={listLoading ? 'Loading…' : `${items.length} in list`}
          padding={false}
        >
          <div className="max-h-[min(72vh,640px)] overflow-y-auto p-2">
            {!listLoading && items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-zinc-500">No posts yet.</p>
            ) : (
              <ul className="space-y-1">
                {items.map((r) => {
                  const active = editingId === r.id;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => selectItem(r)}
                        className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                          active
                            ? 'bg-indigo-50 ring-1 ring-indigo-200 dark:bg-indigo-950/40 dark:ring-indigo-800'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                        }`}
                      >
                        <p className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {r.title}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[11px] text-zinc-500">
                            {r.locale}/{r.slug}
                          </span>
                          {r.version ? (
                            <span className="text-[11px] text-zinc-400">v{r.version}</span>
                          ) : null}
                          {r.published ? (
                            <AdminStatusBadge tone="success">Live</AdminStatusBadge>
                          ) : (
                            <AdminStatusBadge tone="warning">Draft</AdminStatusBadge>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </AdminCard>

        <AdminCard
          title={editingId ? 'Edit post' : 'New post'}
          description="Markdown body · slug: lowercase, digits, hyphens · one post per locale."
          headerRight={
            <button
              type="button"
              disabled={generatingDraft}
              onClick={() => void handleGenerateDraft()}
              className={adminBtnSecondaryClass}
            >
              {generatingDraft ? 'Generating…' : 'From git'}
            </button>
          }
        >
          <form
            onSubmit={(e) => void handleSave(e)}
            className="flex max-h-[min(72vh,640px)] flex-col"
          >
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
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
                <AdminFormField label="Slug (URL)" hint="e.g. 1-4-0">
                  <input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    required
                    className={`${adminInputClass} font-mono`}
                    placeholder="1-4-0"
                  />
                </AdminFormField>
              </div>
              <AdminFormField label="Title">
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  className={adminInputClass}
                />
              </AdminFormField>
              <AdminFormField label="Version (optional)">
                <input
                  value={form.version}
                  onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                  className={adminInputClass}
                  placeholder="1.4.0"
                />
              </AdminFormField>
              <AdminFormField label="Summary (optional)">
                <textarea
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                  rows={2}
                  className={adminInputClass}
                />
              </AdminFormField>
              <AdminFormField label="Body (Markdown)">
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  required
                  rows={10}
                  className={`${adminInputClass} min-h-[200px] font-mono text-xs leading-relaxed`}
                />
              </AdminFormField>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                  className="rounded border-zinc-300"
                />
                Published on /blog
              </label>
              <AdminFormField
                label="Published at (local)"
                hint="Leave empty to use now when publishing."
              >
                <input
                  type="datetime-local"
                  value={form.publishedAtLocal}
                  onChange={(e) => setForm((f) => ({ ...f, publishedAtLocal: e.target.value }))}
                  className={adminInputClass}
                />
              </AdminFormField>
            </div>

            <div className="mt-4 shrink-0 space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={saving} className={adminBtnPrimaryClass}>
                  {saving ? 'Saving…' : editingId ? 'Save' : 'Create'}
                </button>
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
              {saveMsg ? <AdminAlert tone="success">{saveMsg}</AdminAlert> : null}
              {saveErr ? <AdminAlert tone="error">{saveErr}</AdminAlert> : null}
            </div>
          </form>
        </AdminCard>
      </div>
    </div>
  );
}
