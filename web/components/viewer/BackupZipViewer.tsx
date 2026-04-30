'use client';

import { Archive, ChevronLeft, FileAudio, Folder, Loader2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  BackupZipParseError,
  getAudioBytesFromBackup,
  MAX_BACKUP_ZIP_BYTES,
  parseBackupZip,
  type ParsedBackup,
  type ParsedRecord,
} from '@/lib/backup-export';

function guessAudioMime(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.m4a') || lower.endsWith('.mp4')) return 'audio/mp4';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.aac')) return 'audio/aac';
  if (lower.endsWith('.webm')) return 'audio/webm';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  return 'audio/mp4';
}

function sortRecords(a: ParsedRecord, b: ParsedRecord): number {
  const ta = Date.parse(a.createdAt) || 0;
  const tb = Date.parse(b.createdAt) || 0;
  return tb - ta;
}

function formatExportedAt(iso: string): string {
  const d = Date.parse(iso);
  if (!Number.isFinite(d)) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

type TabId = 'transcript' | 'summary' | 'tasks' | 'translation';

export function BackupZipViewer(): React.ReactElement {
  const t = useTranslations('viewerPage');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isNarrow, setNarrow] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [backup, setBackup] = useState<ParsedBackup | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('transcript');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const fn = () => setNarrow(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    return () => {
      void backup?.dispose();
    };
  }, [backup]);

  const sortedRecords = useMemo(() => {
    if (!backup) return [];
    return [...backup.records].sort(sortRecords);
  }, [backup]);

  const folderNameById = useMemo(() => {
    const m = new Map<string, string>();
    if (!backup) return m;
    for (const f of backup.folders) {
      m.set(f.id, f.name);
    }
    return m;
  }, [backup]);

  const sortedFolders = useMemo(() => {
    if (!backup) return [];
    return [...backup.folders].sort((a, b) => {
      const sa = a.sortOrder ?? 0;
      const sb = b.sortOrder ?? 0;
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name);
    });
  }, [backup]);

  const groupedSections = useMemo(() => {
    const sections: { folderId: string | null; label: string; items: ParsedRecord[] }[] = [];
    const byFolder = new Map<string | null, ParsedRecord[]>();

    for (const r of sortedRecords) {
      const fid = r.folderId ?? null;
      if (!byFolder.has(fid)) byFolder.set(fid, []);
      byFolder.get(fid)!.push(r);
    }

    for (const f of sortedFolders) {
      const items = byFolder.get(f.id);
      if (items?.length) {
        sections.push({ folderId: f.id, label: f.name, items });
      }
    }

    const unfoldered = byFolder.get(null) ?? [];
    if (unfoldered.length > 0) {
      sections.push({ folderId: null, label: t('unfoldered'), items: unfoldered });
    }

    for (const [fid, items] of byFolder) {
      if (fid === null) continue;
      if (sortedFolders.some((x) => x.id === fid)) continue;
      if (items.length) {
        sections.push({
          folderId: fid,
          label: folderNameById.get(fid) ?? t('unknownFolder'),
          items,
        });
      }
    }

    return sections;
  }, [sortedRecords, sortedFolders, folderNameById, t]);

  const selected = useMemo(
    () => sortedRecords.find((r) => r.id === selectedId) ?? null,
    [sortedRecords, selectedId],
  );

  const processFile = useCallback(async (file: File) => {
    setErrorCode(null);
    setLoading(true);
    setAudioUrl(null);
    setLoadedFileName(null);
    setBackup(null);
    setSelectedId(null);
    try {
      const parsed = await parseBackupZip(file);
      setBackup(parsed);
      setLoadedFileName(file.name);
      const first = [...parsed.records].sort(sortRecords)[0];
      setSelectedId(first?.id ?? null);
      setTab('transcript');
    } catch (e) {
      if (e instanceof BackupZipParseError) {
        setErrorCode(e.code);
      } else {
        setErrorCode('unknown');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) void processFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && (f.type === 'application/zip' || f.name.toLowerCase().endsWith('.zip'))) {
      void processFile(f);
    } else {
      setErrorCode('not_zip');
    }
  };

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    if (!backup || !selected?.audioPath) {
      setAudioUrl(null);
      return () => {
        cancelled = true;
      };
    }

    setAudioUrl(null);

    void (async () => {
      const bytes = await getAudioBytesFromBackup(backup, selected.audioPath!);
      if (cancelled) return;
      if (!bytes?.length) {
        setAudioUrl(null);
        return;
      }
      const blob = new Blob([bytes], { type: guessAudioMime(selected.audioPath!) });
      const url = URL.createObjectURL(blob);
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      createdUrl = url;
      setAudioUrl(url);
    })();

    return () => {
      cancelled = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [backup, selected?.audioPath, selected?.id]);

  const errorTextMap = useMemo(
    () => ({
      too_large: t('errors.too_large'),
      not_zip: t('errors.not_zip'),
      unzip_failed: t('errors.unzip_failed'),
      no_metadata: t('errors.no_metadata'),
      invalid_json: t('errors.invalid_json'),
      invalid_schema: t('errors.invalid_schema'),
      unsupported_version: t('errors.unsupported_version'),
      unknown: t('errors.unknown'),
    }),
    [t],
  );

  const errorMessage = errorCode
    ? (errorTextMap[errorCode as keyof typeof errorTextMap] ?? t('errors.unknown'))
    : null;

  const maxMb = Math.round(MAX_BACKUP_ZIP_BYTES / (1024 * 1024));

  const dropHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      if (e.currentTarget === e.target) setDragOver(false);
    },
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: onDrop,
  };

  return (
    <div className={backup ? 'space-y-4' : 'space-y-6'}>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        className="sr-only"
        aria-label={t('fileInputAria')}
        onChange={onInputChange}
      />

      {!backup ? (
        <>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            {...dropHandlers}
            onClick={() => inputRef.current?.click()}
            className={[
              'group relative cursor-pointer rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-colors',
              dragOver
                ? 'border-blue-500 bg-blue-500/10 dark:border-blue-400 dark:bg-blue-500/15'
                : 'border-black/15 bg-white/50 hover:border-blue-400/60 hover:bg-white/80 dark:border-white/15 dark:bg-white/[0.04] dark:hover:border-blue-400/40 dark:hover:bg-white/[0.07]',
            ].join(' ')}
          >
            <div className="mx-auto flex max-w-md flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
                {loading ? (
                  <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                ) : (
                  <Upload className="h-8 w-8" aria-hidden />
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t('dropTitle')}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {t('dropHint', { maxMb })}
                </p>
              </div>
              <span className="rounded-xl bg-black/[0.06] px-4 py-2 text-sm font-medium text-slate-800 dark:bg-white/10 dark:text-slate-100">
                {t('chooseFile')}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] px-4 py-3 text-sm leading-relaxed text-slate-700 dark:border-blue-400/25 dark:bg-blue-500/10 dark:text-slate-200">
            {t('privacyNote')}
          </div>
        </>
      ) : (
        <div
          {...dropHandlers}
          className={[
            'rounded-2xl border px-4 py-3 transition-colors sm:px-5',
            dragOver
              ? 'border-blue-500 bg-blue-500/10 dark:border-blue-400 dark:bg-blue-500/12'
              : 'border-black/10 bg-white/80 dark:border-white/12 dark:bg-white/[0.06]',
          ].join(' ')}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <Archive className="h-5 w-5" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {loadedFileName ?? 'backup.zip'}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400">
                  {t('dropReplaceHint')}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => inputRef.current?.click()}
              aria-label={t('replaceBackupAria')}
              className="shrink-0 self-start rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-white/12 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15 sm:self-center"
            >
              {t('replaceBackup')}
            </button>
          </div>
          <p className="mt-3 border-t border-black/6 pt-3 text-xs leading-relaxed text-slate-500 dark:border-white/10 dark:text-slate-400">
            {t('privacyNoteCompact')}
          </p>
        </div>
      )}

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-100"
        >
          {errorMessage}
        </div>
      ) : null}

      {backup ? (
        <div className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 shadow-[0_10px_40px_rgba(15,23,42,0.08)] dark:border-white/12 dark:bg-white/[0.06] dark:shadow-[0_14px_48px_rgba(0,0,0,0.35)]">
          <div className="border-b border-black/8 px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400 sm:px-6">
            {t('exportedLabel')}{' '}
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {formatExportedAt(backup.exportedAt)}
            </span>
            <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
            {t('recordCount', { count: backup.records.length })}
          </div>

          <div className="flex min-h-[min(520px,70vh)] flex-col md:flex-row">
            {/* Sidebar list */}
            <aside
              className={[
                'max-h-[55vh] shrink-0 overflow-y-auto border-black/8 md:max-h-none md:w-[min(100%,380px)] md:border-r dark:border-white/10',
                isNarrow && selectedId ? 'hidden md:block' : 'block',
              ].join(' ')}
            >
              {groupedSections.map((section) => (
                <div
                  key={section.folderId ?? 'root'}
                  className="border-b border-black/6 last:border-0 dark:border-white/8"
                >
                  <div className="sticky top-0 z-10 flex items-center gap-2 bg-slate-100/95 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur-sm dark:bg-slate-900/90 dark:text-slate-400">
                    <Folder className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {section.label}
                  </div>
                  <ul className="py-1">
                    {section.items.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(r.id);
                            setTab('transcript');
                          }}
                          className={[
                            'flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm transition-colors',
                            r.id === selectedId
                              ? 'bg-blue-500/12 text-slate-900 dark:bg-blue-500/20 dark:text-white'
                              : 'text-slate-700 hover:bg-black/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.06]',
                          ].join(' ')}
                        >
                          <span className="line-clamp-2 font-medium leading-snug">
                            {r.title || t('untitled')}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {r.duration} · {formatExportedAt(r.createdAt)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </aside>

            {/* Detail */}
            <div
              className={[
                'flex min-h-[min(480px,65vh)] min-w-0 flex-1 flex-col',
                isNarrow && !selectedId ? 'hidden md:flex' : 'flex',
              ].join(' ')}
            >
              {selected ? (
                <>
                  <div className="flex items-start gap-3 border-b border-black/8 px-4 py-4 dark:border-white/10 sm:px-6">
                    {isNarrow ? (
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white text-slate-800 dark:border-white/12 dark:bg-white/10 dark:text-white md:hidden"
                        aria-label={t('backToList')}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                        {selected.title || t('untitled')}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {selected.duration} · {formatExportedAt(selected.createdAt)}
                      </p>
                      {selected.tags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {selected.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-black/[0.06] px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-slate-200"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {selected.audioPath ? (
                    <div className="border-b border-black/8 px-4 py-4 dark:border-white/10 sm:px-6">
                      {audioUrl ? (
                        <audio
                          key={selected.id}
                          controls
                          className="h-10 w-full max-w-xl"
                          src={audioUrl}
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                          <FileAudio className="h-4 w-4 shrink-0" aria-hidden />
                          {t('audioMissing')}
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="border-b border-black/8 px-4 dark:border-white/10 sm:px-6">
                    <div className="flex gap-1 overflow-x-auto py-2">
                      {(
                        [
                          ['transcript', t('tabTranscript')],
                          ['summary', t('tabSummary')],
                          ['tasks', t('tabTasks')],
                          ...(selected.translatedTranscript
                            ? ([['translation', t('tabTranslation')]] as const)
                            : []),
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setTab(id as TabId)}
                          className={[
                            'shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                            tab === id
                              ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-500'
                              : 'text-slate-600 hover:bg-black/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.08]',
                          ].join(' ')}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                    {tab === 'transcript' ? (
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                        {selected.transcript || t('emptyTranscript')}
                      </pre>
                    ) : null}
                    {tab === 'summary' ? (
                      <div className="prose prose-slate max-w-none text-sm dark:prose-invert">
                        {selected.summary ? (
                          <p className="whitespace-pre-wrap leading-relaxed">{selected.summary}</p>
                        ) : (
                          <p className="text-slate-500 dark:text-slate-400">{t('emptySummary')}</p>
                        )}
                      </div>
                    ) : null}
                    {tab === 'tasks' ? (
                      selected.tasks.length > 0 ? (
                        <ul className="space-y-2">
                          {selected.tasks.map((task) => (
                            <li
                              key={task.id}
                              className="flex gap-3 rounded-xl border border-black/8 bg-black/[0.02] px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]"
                            >
                              <span
                                className={[
                                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs',
                                  task.isDone
                                    ? 'border-blue-500 bg-blue-500 text-white'
                                    : 'border-slate-300 dark:border-slate-600',
                                ].join(' ')}
                                aria-hidden
                              >
                                {task.isDone ? '✓' : ''}
                              </span>
                              <span
                                className={
                                  task.isDone
                                    ? 'text-slate-500 line-through dark:text-slate-400'
                                    : 'text-slate-800 dark:text-slate-100'
                                }
                              >
                                {task.text}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-500 dark:text-slate-400">{t('emptyTasks')}</p>
                      )
                    ) : null}
                    {tab === 'translation' ? (
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                        {selected.translatedTranscript || t('emptyTranslation')}
                      </pre>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                  <Archive className="h-10 w-10 opacity-40" aria-hidden />
                  <p className="text-sm">{t('selectPrompt')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
