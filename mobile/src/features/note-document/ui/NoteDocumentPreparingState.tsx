import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useColors } from '@/shared/config';
import { ProgressStatusCard, RotatingTipText } from '@/shared/ui';

import {
  NOTE_DOCUMENT_LOADING_TIP_INTERVAL_MS,
  NOTE_DOCUMENT_LOADING_TIP_KEYS,
  pickRandomNoteDocumentLoadingTipIndex,
} from '../lib/noteDocumentLoadingTips';

export function NoteDocumentPreparingState() {
  const { t } = useTranslation();
  const color = useColors();
  const [tipIndex, setTipIndex] = useState(() => pickRandomNoteDocumentLoadingTipIndex());

  useEffect(() => {
    if (NOTE_DOCUMENT_LOADING_TIP_KEYS.length <= 1) return;

    const intervalId = setInterval(() => {
      setTipIndex((current) => (current + 1) % NOTE_DOCUMENT_LOADING_TIP_KEYS.length);
    }, NOTE_DOCUMENT_LOADING_TIP_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  const tipKey = NOTE_DOCUMENT_LOADING_TIP_KEYS[tipIndex];

  return (
    <View
      pointerEvents="box-none"
      accessibilityRole="progressbar"
      accessibilityLabel={t('recordingDetail.document.loading')}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
      }}
    >
      <ProgressStatusCard
        title={t('recordingDetail.document.loading')}
        subtitle={
          <RotatingTipText
            text={t(tipKey)}
            color={color.text.secondary}
            className="text-center text-[14px] leading-5"
          />
        }
      />
    </View>
  );
}
