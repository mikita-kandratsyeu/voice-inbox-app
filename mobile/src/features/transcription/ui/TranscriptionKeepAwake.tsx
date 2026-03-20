import React from 'react';
import KeepAwake from 'react-native-keep-awake';

import { useRecordStore } from '@/entities/record';

export const TranscriptionKeepAwake = () => {
  const isTranscribing = useRecordStore((s) =>
    s.records.some((r) => r.aiStatus === 'loading_model' || r.aiStatus === 'processing'),
  );

  return isTranscribing ? <KeepAwake /> : null;
};
