import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Text, View } from 'react-native';

import { useColors } from '@/shared/config';

import type { ImportAudioPhase } from '../model/types';

type ImportAudioProgressOverlayProps = {
  visible: boolean;
  phase: ImportAudioPhase | null;
};

export const ImportAudioProgressOverlay = ({ visible, phase }: ImportAudioProgressOverlayProps) => {
  const { t } = useTranslation();
  const color = useColors();

  const messageKey =
    phase === 'copying'
      ? 'importAudio.phaseCopying'
      : phase === 'converting'
        ? 'importAudio.phaseConverting'
        : phase === 'analyzing'
          ? 'importAudio.phaseAnalyzing'
          : phase === 'parsing_subtitles'
            ? 'importAudio.phaseParsingSubtitles'
            : 'importAudio.phasePreparing';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      >
        <View
          className="w-full max-w-sm rounded-2xl px-6 py-8"
          style={{ backgroundColor: color.background.card }}
        >
          <ActivityIndicator size="large" color={color.accent.primary} />
          <Text
            className="mt-5 text-center text-[16px] font-semibold leading-6"
            style={{ color: color.text.primary }}
          >
            {t('importAudio.preparingTitle')}
          </Text>
          <Text
            className="mt-2 text-center text-[14px] leading-5"
            style={{ color: color.text.secondary }}
          >
            {t(messageKey)}
          </Text>
        </View>
      </View>
    </Modal>
  );
};
