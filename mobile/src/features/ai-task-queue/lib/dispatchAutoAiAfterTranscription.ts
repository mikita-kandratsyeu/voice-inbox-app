import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import {
  type AiExecutionMode,
  hydratePrivateRemoteWorkingConfig,
  isPrivateCustomServerMode,
  type PrivateAiProvider,
} from '@/entities/settings';
import {
  shouldApplyAutoAiAfterTranscription,
  shouldApplyPrivateServerAutoAi,
} from '@/features/app-storefront';

import { scheduleDrainPrivateAiTaskQueue } from './privateAiTaskDrainCoordinator';
import { processRecordViaPrivateAiBridge } from './privateAiTaskProcessBridge';
import { enqueuePrivateAiTask } from './privateAiTaskQueueDb';
import { isPrivateRemoteServerReachable } from './privateRemoteReachability';

export async function dispatchAutoAiAfterTranscription(input: {
  record: VoiceRecord;
  autoAiAfterTranscription: boolean;
  isProActive: boolean;
  isConnected: boolean;
  aiExecutionMode: AiExecutionMode;
  privateAiProvider: PrivateAiProvider;
  source?: 'auto_after_transcription' | 'manual_regenerate';
}): Promise<void> {
  const {
    record,
    autoAiAfterTranscription,
    isProActive,
    isConnected,
    aiExecutionMode,
    privateAiProvider,
    source = 'auto_after_transcription',
  } = input;

  if (!record.transcript?.trim()) return;

  const isPrivateServer = isPrivateCustomServerMode(
    aiExecutionMode,
    privateAiProvider,
    isProActive,
  );

  if (isPrivateServer) {
    if (!shouldApplyPrivateServerAutoAi(autoAiAfterTranscription, isProActive)) return;

    hydratePrivateRemoteWorkingConfig();
    const reachable = await isPrivateRemoteServerReachable({ forceRefresh: true });
    if (reachable) {
      const processed = await processRecordViaPrivateAiBridge(record);
      if (processed) return;
    }

    await enqueuePrivateAiTask({
      recordId: record.id,
      taskType: 'summarize',
      source,
    });
    useRecordStore.getState().setSummaryStatus(record.id, 'queued');
    scheduleDrainPrivateAiTaskQueue();
    return;
  }

  if (
    shouldApplyAutoAiAfterTranscription(
      autoAiAfterTranscription,
      isProActive,
      aiExecutionMode,
      privateAiProvider,
    ) &&
    isConnected
  ) {
    await processRecordViaPrivateAiBridge(record);
  }
}
