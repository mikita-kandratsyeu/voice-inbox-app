import { useCallback, useEffect, useState } from 'react';

import type { TranscriptSegment } from '@/entities/record';
import { useRecordStore } from '@/entities/record';

type UseEditTranscriptOptions = {
  recordId: string;
  segments: TranscriptSegment[];
  onSaved?: () => void;
};

const buildSegmentsSyncKey = (recordId: string, segments: TranscriptSegment[]) =>
  `${recordId}:${segments.map((s) => `${s.id}\u0001${s.text}\u0001${s.startTime}`).join('\u0002')}`;

export const useEditTranscript = ({ recordId, segments, onSaved }: UseEditTranscriptOptions) => {
  const updateTranscript = useRecordStore((s) => s.updateTranscript);
  const [editedSegments, setEditedSegments] = useState<TranscriptSegment[]>(segments);
  const [isSaving, setIsSaving] = useState(false);

  const segmentsSyncKey = buildSegmentsSyncKey(recordId, segments);

  useEffect(() => {
    setEditedSegments(segments);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `segments` matches this key when the effect runs
  }, [segmentsSyncKey]);

  const updateSegmentText = useCallback((segmentId: string, text: string) => {
    setEditedSegments((prev) => prev.map((s) => (s.id === segmentId ? { ...s, text } : s)));
  }, []);

  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      const transcript = editedSegments.map((s) => s.text.trim()).join(' ');
      await updateTranscript(recordId, transcript, editedSegments);
      onSaved?.();
    } finally {
      setIsSaving(false);
    }
  }, [recordId, editedSegments, updateTranscript, onSaved]);

  const reset = useCallback(() => {
    setEditedSegments(segments);
  }, [segments]);

  const hasChanges = useCallback(() => {
    if (editedSegments.length !== segments.length) return true;
    return editedSegments.some((s, i) => segments[i]?.text !== s.text);
  }, [editedSegments, segments]);

  return {
    editedSegments,
    updateSegmentText,
    save,
    reset,
    hasChanges,
    isSaving,
  };
};
