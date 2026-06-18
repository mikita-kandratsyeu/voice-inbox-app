import { useEffect, useRef } from 'react';
import { transferUserInfo, watchEvents } from 'react-native-watch-connectivity';

import { useRecordStore } from '@/entities/record';
import { diagWarn } from '@/shared/lib/appLogger';
import { NitroFS } from '@/shared/lib/fs';

import { importWatchRecording } from '../lib/importWatchRecording';
import type { OpenNoteCommand, ToggleTaskCommand } from '../lib/watchPayload';
import { RecordingMetadataSchema, WatchCommandSchema } from '../lib/watchPayload';

export function useWatchInbound() {
  const subsRef = useRef<Array<{ remove: () => void }>>([]);
  const processedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // File transfer handler
    const fileSub = watchEvents.on('file', async (event) => {
      try {
        const metadata = RecordingMetadataSchema.parse(event.metadata);

        // Idempotency check
        if (processedIdsRef.current.has(metadata.watchRecordingId)) {
          console.log('[WatchInbound] Skipping duplicate:', metadata.watchRecordingId);
          return;
        }

        const result = await importWatchRecording(event.uri, metadata);

        // Send sync result back to Watch
        const syncResult = {
          type: 'syncResult',
          watchRecordingId: metadata.watchRecordingId,
          status: result.success ? 'success' : 'error',
          recordId: result.recordId,
        };

        transferUserInfo(syncResult);

        if (result.success && result.recordId) {
          // TODO: Add record to store and schedule transcription
          // This requires proper integration with useRecordStore and transcription hooks

          // Mark as processed
          processedIdsRef.current.add(metadata.watchRecordingId);

          // Cleanup old processed IDs (7 days TTL)
          if (processedIdsRef.current.size > 100) {
            const arr = Array.from(processedIdsRef.current);
            processedIdsRef.current = new Set(arr.slice(-50));
          }
        }

        // Clean up temp file if not in recordings dir
        try {
          const normalizedPath = event.uri.startsWith('file://') ? event.uri.slice(7) : event.uri;
          if (!normalizedPath.includes('/recordings/')) {
            await NitroFS.unlink(normalizedPath);
          }
        } catch (err) {
          diagWarn('[WatchInbound] Failed to cleanup temp file:', err);
        }
      } catch (error) {
        console.error('[WatchInbound] File handler error:', error);
      }
    });

    // User info handler (commands from Watch)
    const userInfoSub = watchEvents.on('user-info', async (info) => {
      try {
        const command = WatchCommandSchema.parse(info);

        if (command.type === 'toggleTask') {
          handleToggleTask(command);
        } else if (command.type === 'openNote') {
          handleOpenNote(command);
        }
      } catch (error) {
        console.error('[WatchInbound] User info handler error:', error);
      }
    });

    subsRef.current = [fileSub, userInfoSub];

    return () => {
      subsRef.current.forEach((sub) => sub.remove());
      subsRef.current = [];
    };
  }, []);
}

function handleToggleTask(command: ToggleTaskCommand) {
  const store = useRecordStore.getState();
  store.toggleTask(command.recordId, command.taskId);
}

function handleOpenNote(_command: OpenNoteCommand) {
  // TODO: Implement deep link navigation via Linking.openURL or navigationRef
}
