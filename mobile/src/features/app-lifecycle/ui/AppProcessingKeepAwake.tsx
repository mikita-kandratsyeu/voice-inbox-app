import React from 'react';
import KeepAwake from 'react-native-keep-awake';

import { useRecordStore } from '@/entities/record';

export const AppProcessingKeepAwake = () => {
  const hasActiveProcessing = useRecordStore((s) =>
    s.records.some(
      (r) =>
        r.aiStatus === 'loading_model' ||
        r.aiStatus === 'processing' ||
        r.privateAiBatchPhase === 'loading_model' ||
        r.privateAiBatchPhase === 'processing',
    ),
  );

  return hasActiveProcessing ? <KeepAwake /> : null;
};
