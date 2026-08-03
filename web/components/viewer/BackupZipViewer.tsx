'use client';

import {
  Archive,
  AlertCircle,
  Bookmark,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileAudio,
  Flag,
  Folder,
  GitBranch,
  Languages,
  Layers,
  Link2,
  Loader2,
  MessagesSquare,
  PanelLeftClose,
  PanelRightOpen,
  Search,
  Shield,
  Upload,
  X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  BackupZipParseError,
  detectBackupZipEncryption,
  getAudioBytesFromBackup,
  isBackupFilenamePasswordProtected,
  MAX_BACKUP_ZIP_BYTES,
  parseBackupZip,
  type BackupZipParseProgress,
  type ParsedBackup,
  type ParsedRecord,
} from '@/lib/backup-export';
import { BackupZipLoadProgress } from './BackupZipLoadProgress';
import { BackupZipPasswordPrompt } from './BackupZipPasswordPrompt';
import {
  buildNoteDownloadBasename,
  copyTextToClipboard,
  formatViewerTaskDeadlineMeta,
  looksLikeMarkdown,
  triggerTextFileDownload,
} from '@/lib/viewer-note-helpers';
import {
  readSidebarCollapsed,
  readSidebarWidthPct,
  viewerSidebarWidthBounds,
  writeSidebarCollapsed,
  writeSidebarWidthPct,
} from '@/lib/viewer-preferences';

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

function recordMatchesQuery(r: ParsedRecord, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const markLabels = (r.recordingMarks ?? []).map((m) => m.label);
  const hay = [
    r.title,
    r.transcript,
    r.summary ?? '',
    r.meetingDialogue ?? '',
    ...(r.tags ?? []),
    ...(r.keyPhrases ?? []),
    ...(r.nextSteps ?? []),
    ...markLabels,
    ...(r.tasks?.flatMap((task) => [task.text, task.deadline ?? '', task.deadlineTime ?? '']) ??
      []),
  ]
    .join('\n')
    .toLowerCase();
  return hay.includes(s);
}

/** Format offset from recording start for bookmark display. */
function formatRecordingMarkTime(offsetMs: number): string {
  const totalSec = Math.floor(Math.max(0, offsetMs) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const VIEWER_CLASSIFICATION_LABEL: Record<
  'personal' | 'work' | 'meeting' | 'idea' | 'other',
  | 'classificationPersonal'
  | 'classificationWork'
  | 'classificationMeeting'
  | 'classificationIdea'
  | 'classificationOther'
> = {
  personal: 'classificationPersonal',
  work: 'classificationWork',
  meeting: 'classificationMeeting',
  idea: 'classificationIdea',
  other: 'classificationOther',
};

const MEETING_TEMPLATE_LABEL_KEY = {
  general: 'templateGeneral',
  standup: 'templateStandup',
  sales_call: 'templateSalesCall',
  one_on_one: 'templateOneOnOne',
  interview: 'templateInterview',
  product_meeting: 'templateProductMeeting',
  lecture: 'templateLecture',
} as const;

function meetingSummaryTemplateKey(
  template: string | null | undefined,
): (typeof MEETING_TEMPLATE_LABEL_KEY)[keyof typeof MEETING_TEMPLATE_LABEL_KEY] | null {
  if (template && template in MEETING_TEMPLATE_LABEL_KEY) {
    return MEETING_TEMPLATE_LABEL_KEY[template as keyof typeof MEETING_TEMPLATE_LABEL_KEY];
  }
  return null;
}

function viewerClassificationLabelKey(
  c: string | null | undefined,
):
  | 'classificationPersonal'
  | 'classificationWork'
  | 'classificationMeeting'
  | 'classificationIdea'
  | 'classificationOther'
  | null {
  if (c === 'personal' || c === 'work' || c === 'meeting' || c === 'idea' || c === 'other') {
    return VIEWER_CLASSIFICATION_LABEL[c];
  }
  return null;
}

const NOTE_BAR_BTN =
  'inline-flex min-h-[36px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-45 dark:border-white/12 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15';

const NOTE_COPY_BTN = `${NOTE_BAR_BTN} relative min-w-[10.5rem] overflow-hidden transition-[border-color,box-shadow] duration-200`;

type TabId = 'transcript' | 'summary' | 'tasks' | 'translation' | 'speakers' | 'marks' | 'segments';

type CopyFeedbackField =
  | 'transcript'
  | 'summary'
  | 'translation'
  | 'speakers'
  | 'marks'
  | 'segments';

type CopyFeedbackState = { field: CopyFeedbackField; result: 'ok' | 'err' };

function CopyNoteTextButton(props: {
  field: CopyFeedbackField;
  copyFeedback: CopyFeedbackState | null;
  disabled: boolean;
  label: string;
  copiedLabel: string;
  failedLabel: string;
  onCopy: () => void;
}): React.ReactElement {
  const active = props.copyFeedback?.field === props.field;
  const ok = active && props.copyFeedback?.result === 'ok';
  const err = active && props.copyFeedback?.result === 'err';
  return (
    <button
      type="button"
      className={[
        NOTE_COPY_BTN,
        ok
          ? 'border-emerald-400/55 shadow-[0_0_0_1px_rgba(16,185,129,0.18)] dark:border-emerald-500/40'
          : '',
        err
          ? 'border-red-400/55 shadow-[0_0_0_1px_rgba(248,113,113,0.2)] dark:border-red-500/35'
          : '',
      ].join(' ')}
      disabled={props.disabled}
      onClick={props.onCopy}
      aria-live="polite"
    >
      <span
        className={[
          'flex items-center justify-center gap-1.5 transition-opacity duration-200 ease-out',
          ok || err ? 'pointer-events-none opacity-0' : 'opacity-100',
        ].join(' ')}
      >
        <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {props.label}
      </span>
      <span
        className={[
          'absolute inset-0 flex items-center justify-center gap-1.5 transition-opacity duration-200 ease-out',
          ok ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        aria-hidden={!ok}
      >
        <Check
          className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
        <span className="font-medium text-emerald-800 dark:text-emerald-200">
          {props.copiedLabel}
        </span>
      </span>
      <span
        className={[
          'absolute inset-0 flex items-center justify-center gap-1.5 transition-opacity duration-200 ease-out',
          err ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        aria-hidden={!err}
      >
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
        <span className="font-medium text-red-800 dark:text-red-200">{props.failedLabel}</span>
      </span>
    </button>
  );
}

function viewerSectionKey(folderId: string | null): string {
  return folderId === null ? '__unfoldered__' : folderId;
}

export function BackupZipViewer(): React.ReactElement {
  const t = useTranslations('viewerPage');
  const locale = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);

  const [isNarrow, setNarrow] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<BackupZipParseProgress | null>(null);
  const [backup, setBackup] = useState<ParsedBackup | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('transcript');
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedbackState | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [passwordPromptFile, setPasswordPromptFile] = useState<File | null>(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [passwordFieldError, setPasswordFieldError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readSidebarCollapsed());
  const [sidebarWidthPct, setSidebarWidthPct] = useState(() => readSidebarWidthPct());
  const [collapsedSectionKeys, setCollapsedSectionKeys] = useState<Set<string>>(() => new Set());

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

  const filteredSortedRecords = useMemo(() => {
    return sortedRecords.filter((r) => recordMatchesQuery(r, searchQuery));
  }, [sortedRecords, searchQuery]);

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

    for (const r of filteredSortedRecords) {
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
  }, [filteredSortedRecords, sortedFolders, folderNameById, t]);

  const desktopSidebarWidthStyle = useMemo(() => {
    if (isNarrow) return undefined;
    if (sidebarCollapsed) {
      return { width: '4rem', minWidth: '4rem', maxWidth: '4rem' } as const;
    }
    return {
      width: `${sidebarWidthPct}%`,
      minWidth: 220,
      maxWidth: 520,
    } as const;
  }, [isNarrow, sidebarCollapsed, sidebarWidthPct]);

  const flatSelectableIds = useMemo(
    () => groupedSections.flatMap((s) => s.items.map((i) => i.id)),
    [groupedSections],
  );

  useEffect(() => {
    if (!backup) return;
    if (filteredSortedRecords.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedId && !filteredSortedRecords.some((r) => r.id === selectedId)) {
      setSelectedId(filteredSortedRecords[0]?.id ?? null);
    }
  }, [backup, filteredSortedRecords, selectedId]);

  const selected = useMemo(
    () => filteredSortedRecords.find((r) => r.id === selectedId) ?? null,
    [filteredSortedRecords, selectedId],
  );

  useEffect(() => {
    if (!copyFeedback) return;
    const t = setTimeout(() => setCopyFeedback(null), 2200);
    return () => clearTimeout(t);
  }, [copyFeedback]);

  useEffect(() => {
    setCopyFeedback(null);
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) return;
    if (tab === 'speakers' && !selected.meetingDialogue?.trim()) {
      setTab('transcript');
      return;
    }
    if (tab === 'marks' && !(selected.recordingMarks && selected.recordingMarks.length > 0)) {
      setTab('transcript');
      return;
    }
    if (
      tab === 'segments' &&
      !(selected.transcriptSegments && selected.transcriptSegments.length > 0)
    ) {
      setTab('transcript');
    }
  }, [selected, tab]);

  const flashCopyResult = useCallback((field: CopyFeedbackField, ok: boolean) => {
    setCopyFeedback({ field, result: ok ? 'ok' : 'err' });
  }, []);

  const handleCopyText = useCallback(
    async (text: string, field: CopyFeedbackField) => {
      const ok = await copyTextToClipboard(text);
      flashCopyResult(field, ok);
    },
    [flashCopyResult],
  );

  const showPasswordPromptForFile = useCallback((file: File) => {
    setPasswordPromptFile(file);
    setLoadedFileName(file.name);
    setBackupPassword('');
    setPasswordFieldError(null);
    setErrorCode(null);
    setBackup(null);
    setSelectedId(null);
    setAudioUrl(null);
    setSearchQuery('');
  }, []);

  const processFile = useCallback(
    async (file: File, password?: string) => {
      setErrorCode(null);
      setPasswordFieldError(null);
      setAudioUrl(null);
      setSearchQuery('');
      setBackup(null);
      setSelectedId(null);

      const trimmedPassword = password?.trim();
      if (!trimmedPassword) {
        if (isBackupFilenamePasswordProtected(file.name)) {
          showPasswordPromptForFile(file);
          return;
        }
        setLoading(true);
        setLoadProgress('reading_archive');
        try {
          if (await detectBackupZipEncryption(file)) {
            showPasswordPromptForFile(file);
            return;
          }
        } finally {
          setLoading(false);
          setLoadProgress(null);
        }
      }

      setLoading(true);
      setLoadProgress(trimmedPassword ? 'verifying_password' : 'reading_archive');
      try {
        const parsed = await parseBackupZip(file, {
          password: trimmedPassword,
          onProgress: (stage) => setLoadProgress(stage),
        });
        setPasswordPromptFile(null);
        setBackupPassword('');
        setBackup(parsed);
        setCollapsedSectionKeys(new Set());
        setLoadedFileName(file.name);
        const first = [...parsed.records].sort(sortRecords)[0];
        setSelectedId(first?.id ?? null);
        setTab('transcript');
      } catch (e) {
        if (e instanceof BackupZipParseError) {
          if (e.code === 'password_required' || e.code === 'wrong_password') {
            showPasswordPromptForFile(file);
            if (e.code === 'wrong_password') {
              setPasswordFieldError(t('errors.wrong_password'));
            }
            return;
          }
          setPasswordPromptFile(null);
          setBackupPassword('');
          setErrorCode(e.code);
        } else {
          setPasswordPromptFile(null);
          setErrorCode('unknown');
        }
      } finally {
        setLoading(false);
        setLoadProgress(null);
      }
    },
    [showPasswordPromptForFile, t],
  );

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
      const blob = new Blob([new Uint8Array(bytes)], { type: guessAudioMime(selected.audioPath!) });
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

  useEffect(() => {
    if (!backup || flatSelectableIds.length === 0) return;

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') {
        const i = flatSelectableIds.indexOf(selectedId ?? '');
        const next = i < 0 ? 0 : Math.min(flatSelectableIds.length - 1, i + 1);
        if (flatSelectableIds[next] && flatSelectableIds[next] !== selectedId) {
          e.preventDefault();
          setSelectedId(flatSelectableIds[next]!);
          setTab('transcript');
        }
      } else if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') {
        const i = flatSelectableIds.indexOf(selectedId ?? '');
        if (i <= 0) return;
        e.preventDefault();
        setSelectedId(flatSelectableIds[i - 1]!);
        setTab('transcript');
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [backup, flatSelectableIds, selectedId]);

  const beginResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startPct = sidebarWidthPct;
    const onMove = (ev: MouseEvent) => {
      const lay = layoutRef.current;
      if (!lay) return;
      const w = lay.getBoundingClientRect().width;
      if (w < 1) return;
      const dx = ev.clientX - startX;
      const next = Math.round(startPct + (dx / w) * 100);
      const { min, max } = viewerSidebarWidthBounds;
      setSidebarWidthPct(Math.min(max, Math.max(min, next)));
    };
    const onUp = () => {
      setSidebarWidthPct((pct) => {
        writeSidebarWidthPct(pct);
        return pct;
      });
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((c) => {
      const next = !c;
      writeSidebarCollapsed(next);
      return next;
    });
  };

  const toggleViewerSectionCollapsed = useCallback((sectionKey: string) => {
    setCollapsedSectionKeys((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else next.add(sectionKey);
      return next;
    });
  }, []);

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

  const tryAnotherFile = () => {
    setErrorCode(null);
    setPasswordPromptFile(null);
    setBackupPassword('');
    setPasswordFieldError(null);
    setLoadedFileName(null);
    setLoadProgress(null);
    inputRef.current?.click();
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordPromptFile) return;
    const trimmed = backupPassword.trim();
    if (!trimmed) {
      setPasswordFieldError(t('passwordPrompt.required'));
      return;
    }
    void processFile(passwordPromptFile, trimmed);
  };

  return (
    <div className={backup ? 'space-y-4' : 'space-y-5'}>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        className="sr-only"
        aria-label={t('fileInputAria')}
        onChange={onInputChange}
      />

      {!backup && passwordPromptFile ? (
        <BackupZipPasswordPrompt
          loadedFileName={loadedFileName}
          backupPassword={backupPassword}
          passwordFieldError={passwordFieldError}
          loading={loading}
          loadProgress={loadProgress}
          onPasswordChange={(value) => {
            setBackupPassword(value);
            if (passwordFieldError) setPasswordFieldError(null);
          }}
          onSubmit={handlePasswordSubmit}
          onTryAnotherFile={tryAnotherFile}
          t={t}
        />
      ) : null}

      {!backup && !passwordPromptFile ? (
        <div
          {...dropHandlers}
          className={[
            'rounded-3xl border-2 border-dashed px-4 py-10 transition-colors sm:px-8 sm:py-12',
            dragOver
              ? 'border-blue-500 bg-blue-500/10 dark:border-blue-400 dark:bg-blue-500/15'
              : 'border-black/15 bg-white/60 dark:border-white/14 dark:bg-white/[0.05]',
          ].join(' ')}
        >
          <div className="mx-auto flex max-w-lg flex-col items-center gap-5 text-center">
            <button
              type="button"
              disabled={loading}
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="inline-flex min-h-[52px] min-w-[min(100%,280px)] items-center justify-center gap-2 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-[transform,box-shadow] hover:shadow-xl hover:shadow-blue-600/30 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-6 w-6 shrink-0" aria-hidden />
              )}
              {t('chooseArchivePrimary')}
            </button>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('dragZipHint', { maxMb })}
            </p>
            {loading && loadProgress ? (
              <BackupZipLoadProgress stage={loadProgress} verifyingPassword={false} t={t} />
            ) : null}
            <div className="flex max-w-md items-start justify-center gap-2 text-left text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              <Shield
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
              <span>{t('privacyInline')}</span>
            </div>
            <details className="group w-full max-w-md rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-left text-sm dark:border-white/12 dark:bg-white/[0.04]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-slate-800 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">{t('howToExportTitle')}</span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-90 dark:text-slate-500"
                  aria-hidden
                />
              </summary>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-600 dark:text-slate-400">
                <li>{t('howToExportStep1')}</li>
                <li>{t('howToExportStep2')}</li>
                <li>{t('howToExportStep3')}</li>
              </ol>
            </details>
          </div>
        </div>
      ) : null}

      {backup ? (
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
          <p className="mt-3 flex items-start gap-2 border-t border-black/6 pt-3 text-xs leading-relaxed text-slate-500 dark:border-white/10 dark:text-slate-400">
            <Shield
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600/90 dark:text-emerald-400/90"
              aria-hidden
            />
            {t('privacyNoteCompact')}
          </p>
        </div>
      ) : null}

      {errorMessage && !passwordPromptFile ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-4 text-sm text-red-900 dark:text-red-100"
        >
          <p className="leading-relaxed">{errorMessage}</p>
          <button
            type="button"
            onClick={tryAnotherFile}
            className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-red-950/10 px-4 py-2 text-sm font-semibold text-red-950 hover:bg-red-950/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            {t('tryOtherFile')}
          </button>
        </div>
      ) : null}

      {backup ? (
        <div className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 shadow-[0_10px_40px_rgba(15,23,42,0.08)] dark:border-white/12 dark:bg-white/[0.06] dark:shadow-[0_14px_48px_rgba(0,0,0,0.35)]">
          <div className="space-y-2 border-b border-black/8 px-4 py-3 dark:border-white/10 sm:px-6">
            <div className="flex flex-col gap-2 text-xs text-slate-500 dark:text-slate-400 md:flex-row md:flex-wrap md:items-baseline md:justify-between md:gap-x-4 md:gap-y-1">
              <div>
                <span className="text-slate-500 dark:text-slate-400">{t('exportedLabel')} </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {formatExportedAt(backup.exportedAt)}
                </span>
                <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
                {t('recordCount', { count: backup.records.length })}
              </div>
              <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4">
                <span className="shrink-0">
                  {t('backupInfoFormat', { version: backup.backupFormatVersion })}
                </span>
                {backup.graphLayouts && backup.graphLayouts.length > 0 ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-slate-500 dark:text-slate-400">
                    <GitBranch className="h-3 w-3 shrink-0" aria-hidden />
                    {t('graphLayoutsCount', { count: backup.graphLayouts.length })}
                  </span>
                ) : null}
                {loadedFileName ? (
                  <span className="min-w-0 break-all">
                    <span className="text-slate-500 dark:text-slate-400">
                      {t('backupInfoFile')}:{' '}
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {loadedFileName}
                    </span>
                  </span>
                ) : null}
              </div>
            </div>
            {backup.parseWarnings ? (
              <div
                role="status"
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-50"
              >
                {backup.parseWarnings.droppedRecordCount > 0 ? (
                  <p>
                    {t('skippedInvalidNotes', { count: backup.parseWarnings.droppedRecordCount })}
                  </p>
                ) : null}
                {backup.parseWarnings.droppedFolderCount > 0 ? (
                  <p className={backup.parseWarnings.droppedRecordCount > 0 ? 'mt-1' : ''}>
                    {t('skippedInvalidFolders', { count: backup.parseWarnings.droppedFolderCount })}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div ref={layoutRef} className="flex min-h-[min(520px,70vh)] flex-col md:flex-row">
            <aside
              style={desktopSidebarWidthStyle}
              className={[
                'max-h-[55vh] shrink-0 overflow-hidden border-black/8 md:flex md:max-h-none md:min-h-0 md:flex-col md:border-r dark:border-white/10',
                'md:transition-[width,min-width,max-width] md:duration-300 md:ease-out motion-reduce:md:transition-none',
                !isNarrow && sidebarCollapsed ? 'md:bg-slate-50/90 md:dark:bg-slate-950/50' : '',
                isNarrow && selectedId ? 'hidden md:flex' : 'flex',
                isNarrow ? 'w-full flex-col' : '',
              ].join(' ')}
            >
              <div
                className={[
                  'shrink-0 border-b border-black/8 px-3 py-2.5 dark:border-white/10',
                  !isNarrow && sidebarCollapsed
                    ? 'flex flex-col items-center bg-transparent pb-4 pt-4 md:pb-4 md:pt-4'
                    : 'bg-white/95 dark:bg-slate-950/80',
                ].join(' ')}
              >
                {!isNarrow && sidebarCollapsed ? (
                  <button
                    type="button"
                    onClick={toggleSidebarCollapsed}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/10 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/12 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                    aria-label={t('expandList')}
                  >
                    <PanelRightOpen className="h-5 w-5" aria-hidden />
                  </button>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <div className="relative min-w-0 flex-1">
                        <Search
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                          aria-hidden
                        />
                        <input
                          ref={searchInputRef}
                          type="text"
                          inputMode="search"
                          enterKeyHint="search"
                          autoCapitalize="none"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={t('searchPlaceholder')}
                          className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/12 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400"
                          aria-label={t('searchPlaceholder')}
                        />
                        {searchQuery ? (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-black/[0.06] hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label={t('searchClear')}
                          >
                            <X className="h-4 w-4" aria-hidden />
                          </button>
                        ) : null}
                      </div>
                      {!isNarrow ? (
                        <button
                          type="button"
                          onClick={toggleSidebarCollapsed}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white text-slate-700 shadow-sm transition-transform duration-200 ease-out hover:bg-slate-50 active:scale-95 dark:border-white/12 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15 motion-reduce:transition-none motion-reduce:active:scale-100"
                          aria-label={t('collapseList')}
                        >
                          <PanelLeftClose className="h-5 w-5" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                    {!isNarrow ? (
                      <p className="mt-2 hidden text-[11px] leading-snug text-slate-400 md:block dark:text-slate-500">
                        {t('keyboardHint')}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
              <div
                className={[
                  'min-h-0 flex-1 overflow-y-auto',
                  !isNarrow && sidebarCollapsed ? 'hidden' : '',
                ].join(' ')}
                aria-hidden={!isNarrow && sidebarCollapsed}
              >
                {groupedSections.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    {t('noSearchResults')}
                  </div>
                ) : (
                  groupedSections.map((section) => {
                    const sectionKey = viewerSectionKey(section.folderId);
                    const sectionCollapsed = collapsedSectionKeys.has(sectionKey);
                    return (
                      <div
                        key={sectionKey}
                        className="border-b border-black/6 last:border-0 dark:border-white/8"
                      >
                        <button
                          type="button"
                          onClick={() => toggleViewerSectionCollapsed(sectionKey)}
                          className="sticky top-0 z-10 flex w-full items-center gap-2 bg-slate-100/95 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur-sm transition-colors hover:bg-slate-200/80 dark:bg-slate-900/90 dark:text-slate-400 dark:hover:bg-slate-800/90"
                          aria-expanded={!sectionCollapsed}
                          aria-controls={`viewer-folder-${sectionKey}`}
                          id={`viewer-folder-h-${sectionKey}`}
                          aria-label={
                            sectionCollapsed
                              ? t('expandFolderAria', { name: section.label })
                              : t('collapseFolderAria', { name: section.label })
                          }
                        >
                          <ChevronRight
                            className={[
                              'h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500',
                              sectionCollapsed ? '' : 'rotate-90',
                            ].join(' ')}
                            aria-hidden
                          />
                          <Folder className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <span className="min-w-0 flex-1 truncate">{section.label}</span>
                          <span className="shrink-0 tabular-nums text-[10px] font-semibold normal-case text-slate-400 dark:text-slate-500">
                            {section.items.length}
                          </span>
                        </button>
                        <div id={`viewer-folder-${sectionKey}`} hidden={sectionCollapsed}>
                          <ul
                            className="py-1"
                            role="list"
                            aria-labelledby={`viewer-folder-h-${sectionKey}`}
                          >
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
                      </div>
                    );
                  })
                )}
              </div>
            </aside>

            {!isNarrow && !sidebarCollapsed ? (
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                onMouseDown={beginResize}
                className="hidden w-1.5 shrink-0 cursor-col-resize border-x border-transparent bg-black/[0.06] transition-opacity duration-200 ease-out hover:bg-blue-500/30 motion-reduce:transition-none md:block dark:bg-white/10 dark:hover:bg-blue-400/35"
              />
            ) : null}

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
                      {(() => {
                        const classKey = viewerClassificationLabelKey(selected.classification);
                        const templateKey = meetingSummaryTemplateKey(
                          selected.meetingSummaryTemplate,
                        );
                        const hasLinked =
                          selected.linkedRecordIds && selected.linkedRecordIds.length > 0;
                        const hasLang =
                          typeof selected.language === 'string' &&
                          selected.language.trim().length > 0;
                        if (!classKey && !templateKey && !hasLinked && !hasLang) return null;
                        return (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {classKey ? (
                              <span className="inline-flex items-center rounded-full border border-black/10 bg-white/90 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:border-white/12 dark:bg-white/10 dark:text-slate-300">
                                {t(classKey)}
                              </span>
                            ) : null}
                            {templateKey ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200/80 bg-indigo-50/80 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:border-indigo-500/25 dark:bg-indigo-950/40 dark:text-indigo-300">
                                <Layers className="h-3 w-3 shrink-0" aria-hidden />
                                {t('meetingSummaryTemplateLabel')} {t(templateKey)}
                              </span>
                            ) : null}
                            {hasLinked ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-teal-200/80 bg-teal-50/80 px-2.5 py-0.5 text-xs font-medium text-teal-700 dark:border-teal-500/25 dark:bg-teal-950/40 dark:text-teal-300">
                                <Link2 className="h-3 w-3 shrink-0" aria-hidden />
                                {t('linkedRecordsBadge', {
                                  count: selected.linkedRecordIds!.length,
                                })}
                              </span>
                            ) : null}
                            {hasLang ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/80 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:border-white/12 dark:bg-white/10 dark:text-slate-300">
                                <Languages className="h-3 w-3 shrink-0" aria-hidden />
                                {t('languageBadge', { lang: selected.language!.trim() })}
                              </span>
                            ) : null}
                          </div>
                        );
                      })()}
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
                          ['transcript', t('tabTranscript'), null] as const,
                          ['summary', t('tabSummary'), null] as const,
                          ['tasks', t('tabTasks'), null] as const,
                          ...(selected.translatedTranscript?.trim()
                            ? ([['translation', t('tabTranslation'), null]] as const)
                            : []),
                          ...(selected.meetingDialogue?.trim()
                            ? ([['speakers', t('tabSpeakerTurns'), MessagesSquare]] as const)
                            : []),
                          ...(selected.recordingMarks && selected.recordingMarks.length > 0
                            ? ([['marks', t('tabRecordingMarks'), Bookmark]] as const)
                            : []),
                          ...(selected.transcriptSegments && selected.transcriptSegments.length > 0
                            ? ([['segments', t('tabSegments'), Layers]] as const)
                            : []),
                        ] as const
                      ).map(([id, label, Icon]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setTab(id as TabId)}
                          className={[
                            'inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                            tab === id
                              ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-500'
                              : 'text-slate-600 hover:bg-black/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.08]',
                          ].join(' ')}
                        >
                          {Icon ? (
                            <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                          ) : null}
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                    {tab === 'transcript'
                      ? (() => {
                          const body = selected.transcript || '';
                          const has = body.length > 0;
                          const md = looksLikeMarkdown(body);
                          return (
                            <>
                              <div className="mb-4 flex flex-wrap items-center gap-2">
                                <CopyNoteTextButton
                                  field="transcript"
                                  copyFeedback={copyFeedback}
                                  disabled={!has}
                                  label={t('copyTranscript')}
                                  copiedLabel={t('copied')}
                                  failedLabel={t('copyFailed')}
                                  onCopy={() => void handleCopyText(body, 'transcript')}
                                />
                                <button
                                  type="button"
                                  className={NOTE_BAR_BTN}
                                  disabled={!has}
                                  onClick={() =>
                                    triggerTextFileDownload(
                                      body,
                                      `${buildNoteDownloadBasename(selected.title, selected.id)}-transcript.txt`,
                                      'text/plain;charset=utf-8',
                                    )
                                  }
                                >
                                  <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  {t('downloadTxt')}
                                </button>
                                <button
                                  type="button"
                                  className={NOTE_BAR_BTN}
                                  disabled={!has}
                                  onClick={() =>
                                    triggerTextFileDownload(
                                      body,
                                      `${buildNoteDownloadBasename(selected.title, selected.id)}-transcript.md`,
                                      'text/markdown;charset=utf-8',
                                    )
                                  }
                                >
                                  <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  {t('downloadMd')}
                                </button>
                              </div>
                              {has ? (
                                md ? (
                                  <div className="prose prose-slate prose-sm max-w-none dark:prose-invert">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {body}
                                    </ReactMarkdown>
                                  </div>
                                ) : (
                                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                                    {body}
                                  </pre>
                                )
                              ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  {t('emptyTranscript')}
                                </p>
                              )}
                            </>
                          );
                        })()
                      : null}
                    {tab === 'summary'
                      ? (() => {
                          const body = selected.summary ?? '';
                          const has = body.length > 0;
                          const md = looksLikeMarkdown(body);
                          return (
                            <>
                              <div className="mb-4 flex flex-wrap items-center gap-2">
                                <CopyNoteTextButton
                                  field="summary"
                                  copyFeedback={copyFeedback}
                                  disabled={!has}
                                  label={t('copySummary')}
                                  copiedLabel={t('copied')}
                                  failedLabel={t('copyFailed')}
                                  onCopy={() => void handleCopyText(body, 'summary')}
                                />
                                <button
                                  type="button"
                                  className={NOTE_BAR_BTN}
                                  disabled={!has}
                                  onClick={() =>
                                    triggerTextFileDownload(
                                      body,
                                      `${buildNoteDownloadBasename(selected.title, selected.id)}-summary.txt`,
                                      'text/plain;charset=utf-8',
                                    )
                                  }
                                >
                                  <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  {t('downloadTxt')}
                                </button>
                                <button
                                  type="button"
                                  className={NOTE_BAR_BTN}
                                  disabled={!has}
                                  onClick={() =>
                                    triggerTextFileDownload(
                                      body,
                                      `${buildNoteDownloadBasename(selected.title, selected.id)}-summary.md`,
                                      'text/markdown;charset=utf-8',
                                    )
                                  }
                                >
                                  <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  {t('downloadMd')}
                                </button>
                              </div>
                              {has ? (
                                md ? (
                                  <div className="prose prose-slate prose-sm max-w-none dark:prose-invert">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {body}
                                    </ReactMarkdown>
                                  </div>
                                ) : (
                                  <div className="prose prose-slate prose-sm max-w-none dark:prose-invert">
                                    <p className="whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-100">
                                      {body}
                                    </p>
                                  </div>
                                )
                              ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  {t('emptySummary')}
                                </p>
                              )}
                              {selected.keyPhrases.length > 0 ? (
                                <div className="mt-8 border-t border-black/8 pt-6 dark:border-white/10">
                                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    {t('keyPhrasesHeading')}
                                  </h3>
                                  <div className="flex flex-wrap gap-1.5">
                                    {selected.keyPhrases.map((phrase) => (
                                      <span
                                        key={phrase}
                                        className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-900 dark:bg-indigo-400/15 dark:text-indigo-100"
                                      >
                                        {phrase}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                              {selected.nextSteps.length > 0 ? (
                                <div className="mt-8 border-t border-black/8 pt-6 dark:border-white/10">
                                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    {t('nextStepsHeading')}
                                  </h3>
                                  <ul className="list-inside list-disc space-y-1.5 text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                                    {selected.nextSteps.map((step, idx) => (
                                      <li key={`${idx}-${step.slice(0, 32)}`}>{step}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </>
                          );
                        })()
                      : null}
                    {tab === 'tasks' ? (
                      selected.tasks.length > 0 ? (
                        <ul className="space-y-2">
                          {selected.tasks.map((task) => {
                            const deadlineMeta = formatViewerTaskDeadlineMeta(
                              task.deadline,
                              task.deadlineTime,
                              locale,
                            );
                            const showDeadline = deadlineMeta !== null;
                            const deadlineOverdue = Boolean(deadlineMeta?.overdue) && !task.isDone;
                            const priority = task.priority;
                            const priorityClass =
                              priority === 'high'
                                ? 'text-red-700 dark:text-red-300'
                                : priority === 'medium'
                                  ? 'text-amber-800 dark:text-amber-200'
                                  : 'text-slate-600 dark:text-slate-300';
                            const priorityLabel =
                              priority === 'high'
                                ? t('taskPriorityHigh')
                                : priority === 'medium'
                                  ? t('taskPriorityMedium')
                                  : priority === 'low'
                                    ? t('taskPriorityLow')
                                    : null;

                            return (
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
                                <div className="min-w-0 flex-1 space-y-2">
                                  <p
                                    className={
                                      task.isDone
                                        ? 'text-slate-500 line-through dark:text-slate-400'
                                        : 'text-slate-800 dark:text-slate-100'
                                    }
                                  >
                                    {task.text}
                                  </p>
                                  {(showDeadline || priorityLabel) && (
                                    <div className="flex flex-wrap gap-2">
                                      {showDeadline && deadlineMeta ? (
                                        <span
                                          className={[
                                            'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium',
                                            deadlineOverdue
                                              ? 'border-red-300/80 bg-red-50 text-red-800 dark:border-red-500/35 dark:bg-red-950/40 dark:text-red-200'
                                              : 'border-black/10 bg-white/80 text-slate-600 dark:border-white/12 dark:bg-white/10 dark:text-slate-300',
                                          ].join(' ')}
                                        >
                                          <Calendar
                                            className={[
                                              'h-3.5 w-3.5 shrink-0',
                                              deadlineOverdue
                                                ? 'text-red-600 dark:text-red-400'
                                                : 'text-slate-400 dark:text-slate-500',
                                            ].join(' ')}
                                            aria-hidden
                                          />
                                          {deadlineMeta.label}
                                        </span>
                                      ) : null}
                                      {priorityLabel ? (
                                        <span
                                          className={[
                                            'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium',
                                            priority === 'high'
                                              ? 'border-red-200/90 bg-red-50/90 dark:border-red-500/30 dark:bg-red-950/35'
                                              : priority === 'medium'
                                                ? 'border-amber-200/90 bg-amber-50/90 dark:border-amber-500/25 dark:bg-amber-950/30'
                                                : 'border-black/10 bg-white/80 dark:border-white/12 dark:bg-white/10',
                                          ].join(' ')}
                                        >
                                          <Flag
                                            className={['h-3.5 w-3.5 shrink-0', priorityClass].join(
                                              ' ',
                                            )}
                                            aria-hidden
                                          />
                                          <span className={priorityClass}>{priorityLabel}</span>
                                        </span>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-slate-500 dark:text-slate-400">{t('emptyTasks')}</p>
                      )
                    ) : null}
                    {tab === 'translation'
                      ? (() => {
                          const body = selected.translatedTranscript ?? '';
                          const has = body.length > 0;
                          const md = looksLikeMarkdown(body);
                          return (
                            <>
                              <div className="mb-4 flex flex-wrap items-center gap-2">
                                <CopyNoteTextButton
                                  field="translation"
                                  copyFeedback={copyFeedback}
                                  disabled={!has}
                                  label={t('copyTranslation')}
                                  copiedLabel={t('copied')}
                                  failedLabel={t('copyFailed')}
                                  onCopy={() => void handleCopyText(body, 'translation')}
                                />
                                <button
                                  type="button"
                                  className={NOTE_BAR_BTN}
                                  disabled={!has}
                                  onClick={() =>
                                    triggerTextFileDownload(
                                      body,
                                      `${buildNoteDownloadBasename(selected.title, selected.id)}-translation.txt`,
                                      'text/plain;charset=utf-8',
                                    )
                                  }
                                >
                                  <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  {t('downloadTxt')}
                                </button>
                                <button
                                  type="button"
                                  className={NOTE_BAR_BTN}
                                  disabled={!has}
                                  onClick={() =>
                                    triggerTextFileDownload(
                                      body,
                                      `${buildNoteDownloadBasename(selected.title, selected.id)}-translation.md`,
                                      'text/markdown;charset=utf-8',
                                    )
                                  }
                                >
                                  <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  {t('downloadMd')}
                                </button>
                              </div>
                              {has ? (
                                md ? (
                                  <div className="prose prose-slate prose-sm max-w-none dark:prose-invert">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {body}
                                    </ReactMarkdown>
                                  </div>
                                ) : (
                                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                                    {body}
                                  </pre>
                                )
                              ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  {t('emptyTranslation')}
                                </p>
                              )}
                            </>
                          );
                        })()
                      : null}
                    {tab === 'speakers'
                      ? (() => {
                          const body = selected.meetingDialogue?.trim() ?? '';
                          const has = body.length > 0;
                          const md = looksLikeMarkdown(body);
                          return (
                            <>
                              <p className="mb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                                {t('speakerTurnsIntro')}
                              </p>
                              <div className="mb-4 flex flex-wrap items-center gap-2">
                                <CopyNoteTextButton
                                  field="speakers"
                                  copyFeedback={copyFeedback}
                                  disabled={!has}
                                  label={t('copySpeakerTurns')}
                                  copiedLabel={t('copied')}
                                  failedLabel={t('copyFailed')}
                                  onCopy={() => void handleCopyText(body, 'speakers')}
                                />
                                <button
                                  type="button"
                                  className={NOTE_BAR_BTN}
                                  disabled={!has}
                                  onClick={() =>
                                    triggerTextFileDownload(
                                      body,
                                      `${buildNoteDownloadBasename(selected.title, selected.id)}-speaker-turns.txt`,
                                      'text/plain;charset=utf-8',
                                    )
                                  }
                                >
                                  <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  {t('downloadTxt')}
                                </button>
                                <button
                                  type="button"
                                  className={NOTE_BAR_BTN}
                                  disabled={!has}
                                  onClick={() =>
                                    triggerTextFileDownload(
                                      body,
                                      `${buildNoteDownloadBasename(selected.title, selected.id)}-speaker-turns.md`,
                                      'text/markdown;charset=utf-8',
                                    )
                                  }
                                >
                                  <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  {t('downloadMd')}
                                </button>
                              </div>
                              {has ? (
                                md ? (
                                  <div className="prose prose-slate prose-sm max-w-none dark:prose-invert">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {body}
                                    </ReactMarkdown>
                                  </div>
                                ) : (
                                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                                    {body}
                                  </pre>
                                )
                              ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  {t('emptySpeakerTurns')}
                                </p>
                              )}
                            </>
                          );
                        })()
                      : null}
                    {tab === 'marks'
                      ? (() => {
                          const marks = [...(selected.recordingMarks ?? [])].sort(
                            (a, b) => a.offsetMs - b.offsetMs,
                          );
                          const has = marks.length > 0;
                          const marksPlain = marks
                            .map((m) => {
                              const time = formatRecordingMarkTime(m.offsetMs);
                              const label = m.label.trim() ? m.label : t('markUnnamed');
                              return `${time}\t${label}`;
                            })
                            .join('\n');
                          return (
                            <>
                              <p className="mb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                                {t('recordingMarksIntro')}
                              </p>
                              <div className="mb-4 flex flex-wrap items-center gap-2">
                                <CopyNoteTextButton
                                  field="marks"
                                  copyFeedback={copyFeedback}
                                  disabled={!has}
                                  label={t('copyRecordingMarks')}
                                  copiedLabel={t('copied')}
                                  failedLabel={t('copyFailed')}
                                  onCopy={() => void handleCopyText(marksPlain, 'marks')}
                                />
                                <button
                                  type="button"
                                  className={NOTE_BAR_BTN}
                                  disabled={!has}
                                  onClick={() =>
                                    triggerTextFileDownload(
                                      marksPlain,
                                      `${buildNoteDownloadBasename(selected.title, selected.id)}-marks.txt`,
                                      'text/plain;charset=utf-8',
                                    )
                                  }
                                >
                                  <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  {t('downloadTxt')}
                                </button>
                              </div>
                              {has ? (
                                <ul className="space-y-2">
                                  {marks.map((m) => (
                                    <li
                                      key={m.id}
                                      className="flex gap-3 rounded-xl border border-black/8 bg-black/[0.02] px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]"
                                    >
                                      <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                                        {formatRecordingMarkTime(m.offsetMs)}
                                      </span>
                                      <span className="min-w-0 flex-1 text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                                        {m.label.trim() ? (
                                          m.label
                                        ) : (
                                          <span className="italic text-slate-500 dark:text-slate-400">
                                            {t('markUnnamed')}
                                          </span>
                                        )}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  {t('emptyRecordingMarks')}
                                </p>
                              )}
                            </>
                          );
                        })()
                      : null}
                    {tab === 'segments'
                      ? (() => {
                          const segs = selected.transcriptSegments ?? [];
                          const has = segs.length > 0;
                          const segmentsPlain = segs
                            .map((s) => {
                              const time =
                                s.startTime ??
                                (s.startMs != null ? formatRecordingMarkTime(s.startMs) : '');
                              const speaker = s.speakerId ? `[${s.speakerId}] ` : '';
                              return `${time}\t${speaker}${s.text ?? ''}`;
                            })
                            .join('\n');
                          return (
                            <>
                              <p className="mb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                                {t('segmentsIntro')}
                              </p>
                              <div className="mb-4 flex flex-wrap items-center gap-2">
                                <CopyNoteTextButton
                                  field="segments"
                                  copyFeedback={copyFeedback}
                                  disabled={!has}
                                  label={t('copySegments')}
                                  copiedLabel={t('copied')}
                                  failedLabel={t('copyFailed')}
                                  onCopy={() => void handleCopyText(segmentsPlain, 'segments')}
                                />
                                <button
                                  type="button"
                                  className={NOTE_BAR_BTN}
                                  disabled={!has}
                                  onClick={() =>
                                    triggerTextFileDownload(
                                      segmentsPlain,
                                      `${buildNoteDownloadBasename(selected.title, selected.id)}-segments.txt`,
                                      'text/plain;charset=utf-8',
                                    )
                                  }
                                >
                                  <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  {t('downloadTxt')}
                                </button>
                              </div>
                              {has ? (
                                <ul className="space-y-1.5">
                                  {segs.map((seg, idx) => {
                                    const timeStr =
                                      seg.startTime ??
                                      (seg.startMs != null
                                        ? formatRecordingMarkTime(seg.startMs)
                                        : null);
                                    return (
                                      <li
                                        key={seg.id ?? idx}
                                        className="flex gap-3 rounded-xl border border-black/8 bg-black/[0.02] px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]"
                                      >
                                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                                          {timeStr ? (
                                            <span className="font-mono text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                                              {timeStr}
                                            </span>
                                          ) : null}
                                          {seg.speakerId ? (
                                            <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300">
                                              {seg.speakerId}
                                            </span>
                                          ) : null}
                                        </div>
                                        <span className="min-w-0 flex-1 text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                                          {seg.text?.trim() ? (
                                            seg.text
                                          ) : (
                                            <span className="italic text-slate-400 dark:text-slate-500">
                                              —
                                            </span>
                                          )}
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  {t('emptySegments')}
                                </p>
                              )}
                            </>
                          );
                        })()
                      : null}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                  <Archive className="h-10 w-10 opacity-40" aria-hidden />
                  <p className="text-sm">
                    {searchQuery.trim() ? t('noSearchResults') : t('selectPrompt')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
