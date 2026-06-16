import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InteractionManager } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { stripLinkedNotesSectionFromSourceEditor } from '@/features/note-links/lib/appendLinkedNotesSectionForReading';
import type { WikiLinkResolvableRecord } from '@/features/note-links/lib/resolveWikiLinkTarget';
import { resolveShareExportContext } from '@/features/share-record/lib/shareExportContext';

import { buildNoteDocumentMarkdown } from '../lib/buildNoteDocumentMarkdown';
import {
  buildNoteDocumentCacheKey,
  getCachedNoteDocumentMarkdown,
  setCachedNoteDocumentMarkdown,
} from '../lib/noteDocumentMarkdownCache';
import { parseNoteDocumentAsync } from '../lib/parseNoteDocumentAsync';
import { parseTasksFromNoteDocumentMarkdown } from '../lib/parseNoteDocumentMarkdown';
import { patchTaskDoneInNoteDocumentMarkdown } from '../lib/patchTaskDoneInNoteDocumentMarkdown';

export type NoteDocumentMode = 'reading' | 'source';

export type SaveNoteDocumentOptions = {
  syncLinkedNotes?: boolean;
  wikiLinkRecords?: readonly WikiLinkResolvableRecord[];
};

type UseNoteDocumentOptions = {
  recordId: string;
  fallbackRecord: VoiceRecord;
  initialMode?: NoteDocumentMode;
};

export function useNoteDocument({
  recordId,
  fallbackRecord,
  initialMode = 'reading',
}: UseNoteDocumentOptions) {
  const { i18n } = useTranslation();
  const liveRecord = useRecordStore(
    useShallow((s) => s.records.find((r) => r.id === recordId) ?? fallbackRecord),
  );
  const renameRecord = useRecordStore((s) => s.renameRecord);
  const updateTranscript = useRecordStore((s) => s.updateTranscript);
  const updateSummary = useRecordStore((s) => s.updateSummary);
  const updateTasks = useRecordStore((s) => s.updateTasks);
  const updateTags = useRecordStore((s) => s.updateTags);
  const updateAiExtras = useRecordStore((s) => s.updateAiExtras);
  const updateTranslation = useRecordStore((s) => s.updateTranslation);
  const setLinkedRecordIds = useRecordStore((s) => s.setLinkedRecordIds);

  const [savedMarkdown, setSavedMarkdown] = useState('');
  const [documentMarkdown, setDocumentMarkdown] = useState('');
  const [isPreparing, setIsPreparing] = useState(true);
  const [mode, setMode] = useState<NoteDocumentMode>(initialMode);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorDirty, setIsEditorDirty] = useState(false);
  const savedMarkdownRef = useRef(savedMarkdown);
  const liveRecordRef = useRef(liveRecord);
  const suppressLiveRecordSyncRef = useRef(false);

  useEffect(() => {
    savedMarkdownRef.current = savedMarkdown;
  }, [savedMarkdown]);

  useEffect(() => {
    liveRecordRef.current = liveRecord;
  }, [liveRecord]);

  useEffect(() => {
    let cancelled = false;
    const ctx = resolveShareExportContext();
    const cacheKey = buildNoteDocumentCacheKey(liveRecordRef.current, i18n.language, ctx);

    const applyBuilt = (built: string) => {
      if (cancelled) return;
      setCachedNoteDocumentMarkdown(cacheKey, built);
      setSavedMarkdown(built);
      setDocumentMarkdown(built);
      setIsPreparing(false);
    };

    const cached = getCachedNoteDocumentMarkdown(cacheKey);
    if (cached) {
      applyBuilt(cached);
      return () => {
        cancelled = true;
      };
    }

    setIsPreparing(true);

    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        const built = buildNoteDocumentMarkdown(liveRecordRef.current, ctx);
        applyBuilt(built);
      });
    });

    return () => {
      cancelled = true;
      interactionHandle.cancel();
    };
  }, [recordId, i18n.language]);

  useEffect(() => {
    if (isPreparing || isSaving || mode === 'source') return;
    if (suppressLiveRecordSyncRef.current) {
      suppressLiveRecordSyncRef.current = false;
      return;
    }

    let cancelled = false;
    const ctx = resolveShareExportContext();
    const cacheKey = buildNoteDocumentCacheKey(liveRecord, i18n.language, ctx);

    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      const built = buildNoteDocumentMarkdown(liveRecord, ctx);
      setCachedNoteDocumentMarkdown(cacheKey, built);
      setSavedMarkdown(built);
      setDocumentMarkdown((current) => (current === savedMarkdownRef.current ? built : current));
    });

    return () => {
      cancelled = true;
      interactionHandle.cancel();
    };
  }, [i18n.language, isPreparing, isSaving, liveRecord, mode]);

  const hasUnsavedChanges = documentMarkdown !== savedMarkdown || isEditorDirty;

  const markEditorDirty = useCallback(() => {
    setIsEditorDirty(true);
  }, []);

  const clearEditorDirty = useCallback(() => {
    setIsEditorDirty(false);
  }, []);

  const readingTasks = useMemo(() => {
    if (mode !== 'reading') return [];
    return parseTasksFromNoteDocumentMarkdown(documentMarkdown, liveRecord);
  }, [documentMarkdown, liveRecord, mode]);

  const toggleTaskInReading = useCallback(
    (taskId: string) => {
      const task = readingTasks.find((item) => item.id === taskId);
      if (!task) return;

      setDocumentMarkdown((current) =>
        patchTaskDoneInNoteDocumentMarkdown(current, task, !task.isDone),
      );
    },
    [readingTasks],
  );

  const reset = useCallback(() => {
    setDocumentMarkdown(savedMarkdown);
    setIsEditorDirty(false);
  }, [savedMarkdown]);

  const save = useCallback(
    async (
      markdownToSave?: string,
      options?: SaveNoteDocumentOptions,
    ): Promise<'ok' | 'parse_error'> => {
      const markdown = markdownToSave ?? documentMarkdown;

      setIsSaving(true);

      try {
        const parsed = await parseNoteDocumentAsync(markdown, liveRecord, {
          syncLinkedNotes: options?.syncLinkedNotes,
          wikiLinkRecords: options?.wikiLinkRecords,
        });

        if (!parsed.ok) {
          setIsSaving(false);
          return 'parse_error';
        }
        const { patch } = parsed;
        const updates: Promise<void>[] = [];

        if (patch.title !== undefined && patch.title !== liveRecord.title) {
          updates.push(renameRecord(recordId, patch.title));
        }
        if (patch.summary !== undefined) {
          updates.push(updateSummary(recordId, patch.summary));
        }
        if (patch.transcript !== undefined && patch.transcriptSegments !== undefined) {
          updates.push(updateTranscript(recordId, patch.transcript, patch.transcriptSegments));
        }
        if (patch.tasks !== undefined) {
          updates.push(updateTasks(recordId, patch.tasks));
        }
        if (patch.tags !== undefined) {
          updates.push(updateTags(recordId, patch.tags));
        }
        if (patch.linkedRecordIds !== undefined) {
          updates.push(setLinkedRecordIds(recordId, patch.linkedRecordIds));
        }

        const aiExtras: Parameters<typeof updateAiExtras>[1] = {};
        if (patch.nextSteps !== undefined) {
          aiExtras.nextSteps = patch.nextSteps;
        }
        if (patch.keyPhrases !== undefined) {
          aiExtras.keyPhrases = patch.keyPhrases;
        }
        if (patch.meetingDialogue !== undefined) {
          aiExtras.meetingDialogue = patch.meetingDialogue;
        }
        if (Object.keys(aiExtras).length > 0) {
          updates.push(updateAiExtras(recordId, aiExtras));
        }

        if (patch.translatedTranscript !== undefined) {
          const trimmed = patch.translatedTranscript?.trim() ?? '';
          updates.push(
            updateTranslation(
              recordId,
              trimmed.length > 0 ? trimmed : null,
              trimmed.length > 0 ? (liveRecord.translationLanguage ?? null) : null,
            ),
          );
        }

        await Promise.all(updates);
        const persistedMarkdown = options?.syncLinkedNotes
          ? stripLinkedNotesSectionFromSourceEditor(markdown)
          : markdown;
        setDocumentMarkdown(persistedMarkdown);
        setSavedMarkdown(persistedMarkdown);
        savedMarkdownRef.current = persistedMarkdown;
        setIsEditorDirty(false);
        setCachedNoteDocumentMarkdown(
          buildNoteDocumentCacheKey(liveRecord, i18n.language, resolveShareExportContext()),
          persistedMarkdown,
        );
        suppressLiveRecordSyncRef.current = true;
        return 'ok';
      } catch (error) {
        setIsSaving(false);
        throw error;
      }
    },
    [
      documentMarkdown,
      i18n.language,
      liveRecord,
      recordId,
      renameRecord,
      setLinkedRecordIds,
      updateAiExtras,
      updateSummary,
      updateTags,
      updateTasks,
      updateTranscript,
      updateTranslation,
    ],
  );

  return {
    liveRecord,
    documentMarkdown,
    setDocumentMarkdown,
    readingMarkdown: savedMarkdown,
    mode,
    setMode,
    hasUnsavedChanges,
    save,
    reset,
    isSaving,
    isPreparing,
    readingTasks,
    toggleTaskInReading,
    markEditorDirty,
    clearEditorDirty,
    finishSaving: () => setIsSaving(false),
  };
}
