import { useEffect } from 'react';

import { useRecordStore } from '@/entities/record';
import { useAiProcessing } from '@/features/ai-processing';

import { registerPrivateAiTaskProcessor } from '../lib/privateAiTaskProcessBridge';
import { syncPrivateAiQueueRecordStatuses } from '../lib/syncPrivateAiQueueRecordStatuses';

export function usePrivateAiTaskQueueBridge(): void {
  const { processRecord } = useAiProcessing();
  const recordsLoaded = useRecordStore((s) => s.isLoaded);

  useEffect(() => {
    registerPrivateAiTaskProcessor(processRecord);
    return () => {
      registerPrivateAiTaskProcessor(null);
    };
  }, [processRecord]);

  useEffect(() => {
    if (!recordsLoaded) return;
    void syncPrivateAiQueueRecordStatuses();
  }, [recordsLoaded]);
}
