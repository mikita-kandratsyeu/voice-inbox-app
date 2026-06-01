import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { PrivateCapabilityTier } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { getTranscriptCharLimit } from '@/shared/lib/ai-core/localProvider';

type PrivateTranscriptLimitBannerProps = {
  color: Colors;
  privateCapabilityTier: PrivateCapabilityTier;
  transcriptCharCount: number;
};

export function PrivateTranscriptLimitBanner({
  color,
  privateCapabilityTier,
  transcriptCharCount,
}: PrivateTranscriptLimitBannerProps) {
  const { t } = useTranslation();

  const charLimit = getTranscriptCharLimit(privateCapabilityTier);

  const visible = transcriptCharCount > charLimit;

  const message = useMemo(() => {
    if (!visible) return '';
    if (privateCapabilityTier === 'limited') {
      return t('recordingDetail.privateLimitedTranscriptHint', {
        limit: charLimit.toLocaleString(),
        count: transcriptCharCount.toLocaleString(),
      });
    }
    return t('recordingDetail.privateTranscriptTruncationHint', {
      limit: charLimit.toLocaleString(),
      count: transcriptCharCount.toLocaleString(),
    });
  }, [charLimit, privateCapabilityTier, t, transcriptCharCount, visible]);

  if (!visible) {
    return null;
  }

  return (
    <View
      className="rounded-xl border px-3 py-2.5"
      style={{
        borderColor: color.border.default,
        backgroundColor: color.background.tertiary,
      }}
    >
      <Text className="text-[13px] leading-5" style={{ color: color.text.secondary }}>
        {message}
      </Text>
    </View>
  );
}
