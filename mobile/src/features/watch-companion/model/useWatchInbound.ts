import { useEffect, useRef } from 'react';
import { transferUserInfo, watchEvents } from 'react-native-watch-connectivity';

import { runNavigationWhenUnlocked } from '@/app/navigation/deferredNavigation';
import { navigationRef } from '@/app/navigation/navigationRef';
import { useRecordStore } from '@/entities/record';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import { diagWarn } from '@/shared/lib/appLogger';
import { NitroFS } from '@/shared/lib/fs';

import { finalizeWatchRecordingImport } from '../lib/finalizeWatchRecordingImport';
import { importWatchRecording } from '../lib/importWatchRecording';
import type { OpenNoteCommand, ToggleTaskCommand } from '../lib/watchPayload';
import { RecordingMetadataSchema, WatchCommandSchema } from '../lib/watchPayload';

export function useWatchInbound() {
  const unsubRef = useRef<Array<() => void>>([]);
  const processedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fileUnsub = watchEvents.on('file', async (event) => {
      try {
        if (!getHasSeenOnboarding()) {
          return;
        }

        const metadata = RecordingMetadataSchema.parse(event.metadata);

        if (processedIdsRef.current.has(metadata.watchRecordingId)) {
          return;
        }

        const result = await importWatchRecording(event.uri, metadata);

        transferUserInfo({
          type: 'syncResult',
          watchRecordingId: metadata.watchRecordingId,
          status: result.success ? 'success' : 'error',
          recordId: result.recordId,
        });

        if (result.success && result.record) {
          await finalizeWatchRecordingImport(result.record);
          processedIdsRef.current.add(metadata.watchRecordingId);

          if (processedIdsRef.current.size > 100) {
            const arr = Array.from(processedIdsRef.current);
            processedIdsRef.current = new Set(arr.slice(-50));
          }
        }

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

    const userInfoUnsub = watchEvents.on('user-info', async (payloads) => {
      for (const info of payloads) {
        try {
          if (info.type === 'syncResult') {
            continue;
          }

          const command = WatchCommandSchema.parse(info);

          if (command.type === 'toggleTask') {
            handleToggleTask(command);
          } else if (command.type === 'openNote') {
            handleOpenNote(command);
          }
        } catch (error) {
          console.error('[WatchInbound] User info handler error:', error);
        }
      }
    });

    unsubRef.current = [fileUnsub, userInfoUnsub];

    return () => {
      unsubRef.current.forEach((unsub) => unsub());
      unsubRef.current = [];
    };
  }, []);
}

function handleToggleTask(command: ToggleTaskCommand) {
  if (!getHasSeenOnboarding()) {
    return;
  }
  const store = useRecordStore.getState();
  void store.toggleTask(command.recordId, command.taskId);
}

function handleOpenNote(command: OpenNoteCommand) {
  if (!getHasSeenOnboarding()) {
    return;
  }

  const record = useRecordStore.getState().records.find((item) => item.id === command.recordId);
  if (!record) {
    return;
  }

  runNavigationWhenUnlocked(() => {
    navigationRef.navigate('RecordingDetail', { record });
  });
}
