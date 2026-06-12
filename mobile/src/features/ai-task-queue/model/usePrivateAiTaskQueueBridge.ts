import { useEffect } from 'react';

import { useAiProcessing } from '@/features/ai-processing';

import { registerPrivateAiTaskProcessor } from '../lib/privateAiTaskProcessBridge';

export function usePrivateAiTaskQueueBridge(): void {
  const { processRecord } = useAiProcessing();

  useEffect(() => {
    registerPrivateAiTaskProcessor(processRecord);
    return () => {
      registerPrivateAiTaskProcessor(null);
    };
  }, [processRecord]);
}
