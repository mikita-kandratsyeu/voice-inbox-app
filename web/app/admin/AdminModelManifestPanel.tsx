'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  AdminAlert,
  AdminCard,
  AdminFormField,
  adminBtnPrimaryClass,
  adminBtnSecondaryClass,
  adminInputClass,
} from './admin-ui';
import {
  createDefaultMobileModelManifest,
  parseMobileModelManifestString,
  stringifyMobileModelManifest,
} from '@/lib/mobile-model-manifest';
import { BASE_URL_OR_FALLBACK } from '@/config/constants';

type ManifestApiOk = {
  ok: true;
  editable?: boolean;
  hint?: string;
  jsonText: string;
  hasStoredCopy?: boolean;
};

type ManifestApiErr = { ok: false; error?: string };

export function AdminModelManifestPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editable, setEditable] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [hasStoredCopy, setHasStoredCopy] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publicUrl = `${BASE_URL_OR_FALLBACK.replace(/\/$/, '')}/api/public/mobile-model-manifest`;

  const fetchManifest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/mobile-model-manifest', { credentials: 'include' });
      const data = (await res.json()) as ManifestApiOk | ManifestApiErr;
      if (!res.ok || !data.ok) {
        setError((data as ManifestApiErr).error ?? 'Failed to load manifest');
        return;
      }
      setEditable(!!data.editable);
      setHint(data.hint ?? null);
      setHasStoredCopy(!!data.hasStoredCopy);
      setJsonText(data.jsonText);
    } catch {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchManifest();
  }, [fetchManifest]);

  const handleInsertDefault = () => {
    setError(null);
    setMessage(null);
    setJsonText(stringifyMobileModelManifest(createDefaultMobileModelManifest()));
  };

  const handleFormat = () => {
    setError(null);
    setMessage(null);
    const parsed = parseMobileModelManifestString(jsonText);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setJsonText(stringifyMobileModelManifest(parsed.manifest));
    setMessage('JSON formatted and validated.');
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/mobile-model-manifest', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ json: jsonText }),
      });
      const data = (await res.json()) as ManifestApiOk | ManifestApiErr;
      if (!res.ok || !data.ok) {
        setError((data as ManifestApiErr).error ?? 'Save failed');
        return;
      }
      setMessage('Manifest saved.');
      if (data.jsonText) setJsonText(data.jsonText);
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
      title="Mobile model manifest"
      description="On-device model artifacts (Whisper, Core ML, local LLMs). Public endpoint serves the saved copy or built-in default."
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

      {!hasStoredCopy && editable ? (
        <AdminAlert tone="warning" className="mb-3">
          Nothing saved yet — the public API uses the built-in default until you save.
        </AdminAlert>
      ) : null}
      {hint ? <AdminAlert tone="warning">{hint}</AdminAlert> : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={handleInsertDefault} className={adminBtnSecondaryClass}>
          Generate default
        </button>
        <button type="button" onClick={handleFormat} className={adminBtnSecondaryClass}>
          Validate &amp; format
        </button>
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
        <AdminFormField label="Manifest JSON">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            disabled={!editable}
            spellCheck={false}
            rows={18}
            className={`${adminInputClass} min-h-[280px] resize-y font-mono text-xs leading-relaxed disabled:opacity-60`}
          />
        </AdminFormField>
      )}

      {message ? (
        <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{message}</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </AdminCard>
  );
}
