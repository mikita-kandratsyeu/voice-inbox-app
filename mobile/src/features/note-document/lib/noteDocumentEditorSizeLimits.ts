import type { VoiceRecord } from '@/entities/record';
import { type DeviceMemoryTier, resolveDeviceMemoryTier } from '@/shared/lib/deviceMemoryTier';

/**
 * Dynamic editor size limits based on device performance tier.
 * Optimized for enriched markdown editing responsiveness.
 */
const NOTE_DOCUMENT_EDITOR_LIMITS: Record<DeviceMemoryTier, number> = {
  low: 4_000, // Older devices, conservative limit
  medium: 8_000, // Mid-range devices
  high: 15_000, // Flagship devices from 2022+
  ultra: 20_000, // Latest flagships with 8GB+ RAM
};

/** Rough overhead for section markers, headers, and metadata in exported markdown. */
const NOTE_DOCUMENT_EDITOR_EXPORT_OVERHEAD_CHARS = 900;

/**
 * Returns the comfortable character limit for the current device.
 * Call once and cache the result to avoid repeated device tier lookups.
 */
export function getNoteDocumentEditorCharacterLimit(): number {
  const tier = resolveDeviceMemoryTier();
  return NOTE_DOCUMENT_EDITOR_LIMITS[tier];
}

/**
 * Determines if a warning should be shown before entering source editor mode.
 * Uses device-specific limits for optimal UX.
 */
export function shouldWarnNoteDocumentEditorSize(markdownLength: number): boolean {
  return markdownLength > getNoteDocumentEditorCharacterLimit();
}

export function estimateNoteDocumentCharacterCount(
  record: Pick<
    VoiceRecord,
    | 'title'
    | 'summary'
    | 'transcript'
    | 'translatedTranscript'
    | 'meetingDialogue'
    | 'tags'
    | 'keyPhrases'
    | 'nextSteps'
    | 'tasks'
  >,
): number {
  let total = (record.title?.length ?? 0) + (record.transcript?.length ?? 0);
  total += record.summary?.length ?? 0;
  total += record.translatedTranscript?.length ?? 0;
  total += record.meetingDialogue?.length ?? 0;
  total += record.tags?.join(', ').length ?? 0;
  total += record.keyPhrases?.join(', ').length ?? 0;
  total += record.nextSteps?.join('\n').length ?? 0;
  total += record.tasks?.reduce((sum, task) => sum + task.text.length, 0) ?? 0;
  return total + NOTE_DOCUMENT_EDITOR_EXPORT_OVERHEAD_CHARS;
}
