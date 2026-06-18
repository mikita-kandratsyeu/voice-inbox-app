import dayjs from 'dayjs';

import type { VoiceRecord } from '@/entities/record';
import { generateRecordId } from '@/screens/record/lib/generateRecordId';
import { getAutoTitleForDate } from '@/screens/record/lib/getAutoTitle';
import { diagWarn } from '@/shared/lib/appLogger';
import { getAudioDurationMs } from '@/shared/lib/audio';
import { ensureRecordingsDir, persistRecordingToDocuments } from '@/shared/lib/recordings';

import type { RecordingMetadata } from './watchPayload';

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export interface ImportWatchRecordingResult {
  success: boolean;
  recordId?: string;
  error?: string;
}

export async function importWatchRecording(
  fileUri: string,
  metadata: RecordingMetadata,
): Promise<ImportWatchRecordingResult> {
  try {
    await ensureRecordingsDir();

    const recordId = generateRecordId();
    const normalizedPath = fileUri.startsWith('file://') ? fileUri.slice(7) : fileUri;

    // Persist file to recordings directory
    const audioPath = await persistRecordingToDocuments(normalizedPath, recordId);

    // Get duration (fallback to metadata if file read fails)
    let durationMs = Math.round(metadata.durationSeconds * 1000);
    try {
      const fileDuration = await getAudioDurationMs(audioPath);
      if (fileDuration !== null) {
        durationMs = fileDuration;
      }
    } catch (err) {
      diagWarn('[importWatchRecording] getAudioDurationMs failed, using metadata:', err);
    }

    // Build record
    const now = new Date().toISOString();
    const createdAt = metadata.createdAt || now;

    const record: VoiceRecord = {
      id: recordId,
      title: getAutoTitleForDate(createdAt),
      audioPath,
      transcript: '',
      duration: formatDuration(durationMs),
      durationMs,
      createdAt,
      status: 'unread' as const,
      aiStatus: 'idle',
      summary: undefined,
      tasks: undefined,
      folderId: undefined,
      isPinned: false,
    };

    return {
      success: true,
      recordId: record.id,
    };
  } catch (error) {
    console.error('[importWatchRecording] Import failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
