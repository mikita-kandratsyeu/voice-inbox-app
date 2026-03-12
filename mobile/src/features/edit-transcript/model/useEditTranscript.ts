import { useCallback, useState } from 'react';

import type { TranscriptSegment } from '@/entities/record';
import { useRecordStore } from '@/entities/record';

type UseEditTranscriptOptions = {
  recordId: string;
  segments: TranscriptSegment[];
  onSaved?: () => void;
};

export const useEditTranscript = ({ recordId, segments, onSaved }: UseEditTranscriptOptions) => {
  const updateTranscript = useRecordStore((s) => s.updateTranscript);
  const [editedSegments, setEditedSegments] = useState<TranscriptSegment[]>(segments);
  const [isSaving, setIsSaving] = useState(false);

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
