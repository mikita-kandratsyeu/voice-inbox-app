import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';

import { NOTE_DOCUMENT_CONTENT_MAX_WIDTH } from '../lib/noteDocumentLayout';

type NoteDocumentSourceEditorSizeBannerProps = {
  color: Colors;
  horizontalPadding: number;
  isTablet: boolean;
};

export function NoteDocumentSourceEditorSizeBanner({
  color,
  horizontalPadding,
  isTablet,
}: NoteDocumentSourceEditorSizeBannerProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        width: '100%',
        alignSelf: 'stretch',
        backgroundColor: withAlphaHex(color.status.processing.text, 0.1),
        borderBottomWidth: 1,
        borderBottomColor: color.border.default,
      }}
    >
      <View
        style={{
          width: '100%',
          paddingHorizontal: horizontalPadding,
          paddingVertical: 11,
          ...(isTablet && { alignItems: 'center' as const }),
        }}
      >
        <View
          className="flex-row"
          style={{
            width: '100%',
            maxWidth: isTablet ? NOTE_DOCUMENT_CONTENT_MAX_WIDTH : undefined,
            gap: 12,
          }}
        >
          <View
            style={{
              alignSelf: 'stretch',
              width: 3,
              borderRadius: 2,
              backgroundColor: color.accent.primary,
            }}
          />
          <View className="min-w-0 flex-1" style={{ gap: 2, paddingVertical: 1 }}>
            <Text
              className="text-[13px] font-semibold leading-[18px]"
              style={{ color: color.text.primary }}
            >
              {t('recordingDetail.document.largeDocumentSlowBannerTitle')}
            </Text>
            <Text className="text-[12px] leading-[17px]" style={{ color: color.text.secondary }}>
              {t('recordingDetail.document.largeDocumentSlowBannerMessage')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
