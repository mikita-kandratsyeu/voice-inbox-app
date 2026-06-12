import { useCallback, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { resolveShareExportContext } from '@/features/share-record/lib/shareExportContext';
import { i18n } from '@/shared/lib';

import { buildNoteDocumentMarkdown } from '../lib/buildNoteDocumentMarkdown';
import { parseNoteDocumentMarkdown } from '../lib/parseNoteDocumentMarkdown';

export type NoteDocumentMode = 'reading' | 'source';

type UseNoteDocumentOptions = {
  recordId: string;
  fallbackRecord: VoiceRecord;
};

export function useNoteDocument({ recordId, fallbackRecord }: UseNoteDocumentOptions) {
  const records = useRecordStore((s) => s.records);
  const renameRecord = useRecordStore((s) => s.renameRecord);
  const updateTranscript = useRecordStore((s) => s.updateTranscript);
  const updateSummary = useRecordStore((s) => s.updateSummary);
  const updateTasks = useRecordStore((s) => s.updateTasks);
  const updateTags = useRecordStore((s) => s.updateTags);
  const updateAiExtras = useRecordStore((s) => s.updateAiExtras);
  const updateTranslation = useRecordStore((s) => s.updateTranslation);

  const liveRecord = records.find((r) => r.id === recordId) ?? fallbackRecord;

  const [savedMarkdown, setSavedMarkdown] = useState('');
  const [documentMarkdown, setDocumentMarkdown] = useState('');
  const [isPreparing, setIsPreparing] = useState(true);
  const [mode, setMode] = useState<NoteDocumentMode>('reading');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsPreparing(true);

    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;

      const built = buildNoteDocumentMarkdown(liveRecord, resolveShareExportContext());
      if (cancelled) return;

      setSavedMarkdown(built);
      setDocumentMarkdown(built);
      setIsPreparing(false);
    });

    return () => {
      cancelled = true;
      interactionHandle.cancel();
    };
  }, [liveRecord, i18n.language]);

  const hasUnsavedChanges = documentMarkdown !== savedMarkdown;

  const reset = useCallback(() => {
    setDocumentMarkdown(savedMarkdown);
  }, [savedMarkdown]);

  const save = useCallback(async (): Promise<'ok' | 'parse_error'> => {
    const parsed = parseNoteDocumentMarkdown(documentMarkdown, liveRecord);
    if (!parsed.ok) {
      return 'parse_error';
    }

    setIsSaving(true);
    try {
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
      return 'ok';
    } finally {
      setIsSaving(false);
    }
  }, [
    documentMarkdown,
    liveRecord,
    recordId,
    renameRecord,
    updateAiExtras,
    updateSummary,
    updateTags,
    updateTasks,
    updateTranscript,
    updateTranslation,
  ]);

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
  };
}
