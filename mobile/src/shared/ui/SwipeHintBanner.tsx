import { Info } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { getColors, useAppTheme } from '@/shared/config';

type SwipeHintBannerProps = {
  onDismiss: () => void;
};

export const SwipeHintBanner = ({ onDismiss }: SwipeHintBannerProps) => {
  const { t } = useTranslation();
  const color = getColors(useAppTheme());

  return (
    <View
      className="mx-4 mb-2 mt-1 flex-row items-center rounded-xl px-4 py-3"
      style={{ backgroundColor: color.accent.primary + '18' }}
    >
      <Info size={18} color={color.accent.primary} strokeWidth={2} style={{ marginRight: 10 }} />
      <Text className="flex-1 text-sm" style={{ color: color.text.primary }} numberOfLines={2}>
        {t('inbox.swipeHint')}
      </Text>
      <Pressable
        onPress={onDismiss}
        hitSlop={12}
        className="rounded-lg px-3 py-1.5"
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
          backgroundColor: color.accent.primary + '30',
        })}
      >
        <Text className="text-sm font-semibold" style={{ color: color.accent.primary }}>
          {t('common.gotIt')}
        </Text>
      </Pressable>
    </View>
  );
};
