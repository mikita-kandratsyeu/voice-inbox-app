import { AlertCircle, RefreshCw } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';
import { Button } from '@/shared/ui';

type TranscriptErrorProps = {
  color: Colors;
  onRetry: () => void;
};

export const TranscriptError = ({ color, onRetry }: TranscriptErrorProps) => {
  const { t } = useTranslation();
  const err = color.status.error.text;
  const errBg = color.status.error.bg;

  return (
    <View
      className="m-4 overflow-hidden rounded-2xl"
      style={{
        backgroundColor: errBg,
        borderWidth: 1,
        borderColor: withAlphaHex(err, 0.22),
      }}
    >
      <View className="flex-row items-start gap-3 p-4">
        <View
          className="mt-0.5 rounded-full p-1.5"
          style={{ backgroundColor: withAlphaHex(err, 0.14) }}
        >
          <AlertCircle size={18} color={err} strokeWidth={2} />
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-sm font-bold" style={{ color: err }}>
            {t('recordingDetail.transcriptProcessErrorTitle')}
          </Text>
          <Text className="text-xs leading-5" style={{ color: color.text.secondary }}>
            {t('recordingDetail.transcriptProcessErrorDesc')}
          </Text>
        </View>
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: withAlphaHex(err, 0.18) }}>
        <Button
          variant="danger"
          color={color}
          icon={<RefreshCw size={14} color={err} strokeWidth={2.5} />}
          label={t('recordingDetail.summaryRetry')}
          onPress={onRetry}
          activeOpacity={0.7}
          containerStyle={{ paddingVertical: 12 }}
          accessibilityLabel={t('recordingDetail.summaryRetry')}
        />
      </View>
    </View>
  );
};
