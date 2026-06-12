import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/shared/config';
import { ProgressStatusCard, RotatingTipText } from '@/shared/ui';

import {
  NOTE_DOCUMENT_SAVING_TIP_INTERVAL_MS,
  NOTE_DOCUMENT_SAVING_TIP_KEYS,
  pickRandomNoteDocumentSavingTipIndex,
} from '../lib/noteDocumentSavingTips';

export function NoteDocumentSavingOverlay() {
  const { t } = useTranslation();
  const color = useColors();
  const [tipIndex, setTipIndex] = useState(() => pickRandomNoteDocumentSavingTipIndex());

  useEffect(() => {
    if (NOTE_DOCUMENT_SAVING_TIP_KEYS.length <= 1) return;

    const intervalId = setInterval(() => {
      setTipIndex((current) => (current + 1) % NOTE_DOCUMENT_SAVING_TIP_KEYS.length);
    }, NOTE_DOCUMENT_SAVING_TIP_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  const tipKey = NOTE_DOCUMENT_SAVING_TIP_KEYS[tipIndex];

  return (
    <View
      pointerEvents="auto"
      style={[StyleSheet.absoluteFillObject, { backgroundColor: color.background.secondary }]}
      accessibilityRole="progressbar"
      accessibilityLabel={t('recordingDetail.document.saving')}
    >
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <ProgressStatusCard
          title={t('recordingDetail.document.saving')}
          subtitle={
            <RotatingTipText
              text={t(tipKey)}
              color={color.text.secondary}
              className="text-center text-[14px] leading-5"
            />
          }
        />
      </View>
    </View>
  );
}
