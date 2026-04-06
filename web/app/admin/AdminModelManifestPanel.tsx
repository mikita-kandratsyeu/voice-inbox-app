'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  adminBtnPrimaryClass,
  adminBtnSecondaryClass,
  adminCardSurfaceClass,
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
      setMessage('Manifest saved. Public endpoint will serve this copy.');
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
      setMessage('Public URL copied to clipboard.');
    } catch {
      setError('Could not copy URL');
    }
  };

  return (
    <section className={`mb-8 ${adminCardSurfaceClass} p-5`}>
      <h2 className="mb-1 text-lg font-medium">Mobile model manifest</h2>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        JSON describing on-device model artifacts (Whisper weights, iOS Core ML encoders, local GGUF
        LLMs): stable <code className="text-xs">id</code>, <code className="text-xs">url</code>,{' '}
        <code className="text-xs">active</code>, optional <code className="text-xs">bytes</code> /{' '}
        <code className="text-xs">sha256</code> / <code className="text-xs">platform</code>. Use{' '}
        <span className="font-medium">Generate default</span> to pre-fill from the same Hugging Face
        URLs as the current mobile app, then edit and save. The mobile client can fetch the public
        endpoint below (not wired yet in the app).
      </p>
      <p className="mb-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">GET {publicUrl}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void fetchManifest()}
          className={adminBtnSecondaryClass}
        >
          Refresh
        </button>
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
        <button
          type="button"
          disabled={!editable || saving}
          onClick={() => void handleSave()}
          className={adminBtnPrimaryClass}
        >
          {saving ? 'Saving…' : 'Save to database'}
        </button>
      </div>
      {!hasStoredCopy && editable && (
        <p className="mb-3 text-sm text-amber-800 dark:text-amber-200">
          Nothing saved yet — the public API falls back to the built-in default until you save.
        </p>
      )}
      {hint && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {hint}
        </p>
      )}
      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Manifest JSON
          </label>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            disabled={!editable}
            spellCheck={false}
            rows={22}
            className={`${adminInputClass} min-h-[320px] resize-y font-mono text-xs leading-relaxed disabled:opacity-60`}
          />
        </div>
      )}
      {message && <p className="mt-3 text-sm text-green-600 dark:text-green-400">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
