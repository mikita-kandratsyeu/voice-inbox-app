import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/shared/config';

import { Button } from './Button';

type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
  titleAlign?: 'left' | 'center';
};

export const ScreenHeader = ({
  title,
  onBack,
  rightSlot,
  titleAlign = 'center',
}: ScreenHeaderProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const color = useColors();

  return (
    <View
      className="flex-row items-center justify-between px-4 pb-3"
      style={{
        backgroundColor: color.background.primary,
        borderBottomWidth: 1,
        borderBottomColor: color.border.default,
        paddingTop: insets.top + 12,
      }}
    >
      <View className="min-w-[44px]">
        {onBack ? (
          <Button
            iconOnly
            variant="icon"
            size="md"
            icon={<ChevronLeft size={22} color={color.text.primary} strokeWidth={2.2} />}
            color={color}
            onPress={onBack}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={t('common.goBack')}
          />
        ) : null}
      </View>
      <Text
        className={`flex-1 text-[18px] font-semibold ${titleAlign === 'center' ? 'text-center' : 'text-left'}`}
        style={[
          { color: color.text.primary },
          titleAlign === 'left' ? { paddingLeft: onBack ? 8 : 0 } : null,
        ]}
      >
        {title}
      </Text>
      <View className="min-w-[44px] items-end">{rightSlot ?? null}</View>
    </View>
  );
};
