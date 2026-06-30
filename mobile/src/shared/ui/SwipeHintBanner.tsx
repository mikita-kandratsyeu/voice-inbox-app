import { Info } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

import { useColors } from '@/shared/config';
import { IOS_MIN_TOUCH_TARGET } from '@/shared/lib/iosTouchTarget';

type SwipeHintBannerProps = {
  onDismiss: () => void;
};

export const SwipeHintBanner = ({ onDismiss }: SwipeHintBannerProps) => {
  const { t } = useTranslation();
  const color = useColors();

  return (
    <View
      className="mx-4 my-2.5 flex-row items-center rounded-xl px-4 py-3"
      style={{ backgroundColor: color.accent.primary + '18' }}
    >
      <Info size={18} color={color.accent.primary} strokeWidth={2} style={{ marginRight: 10 }} />
      <Text className="flex-1 text-sm" style={{ color: color.text.primary }} numberOfLines={2}>
        {t('inbox.swipeHint')}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.gotIt')}
        onPress={onDismiss}
        hitSlop={8}
        className="min-w-[44px] items-center justify-center rounded-lg px-3 py-2"
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
          backgroundColor: color.accent.primary + '30',
          minHeight: IOS_MIN_TOUCH_TARGET,
        })}
      >
        <Text className="text-sm font-semibold" style={{ color: color.accent.primary }}>
          {t('common.gotIt')}
        </Text>
      </Pressable>
    </View>
  );
};
