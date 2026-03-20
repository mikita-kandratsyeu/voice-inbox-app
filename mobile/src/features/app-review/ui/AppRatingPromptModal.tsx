import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Star } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getColors, useAppTheme } from '@/shared/config';
import { Button } from '@/shared/ui';

import { setNeverAskAppReview } from '../lib/appReviewStorage';
import { requestNativeInAppReview } from '../lib/requestNativeInAppReview';

type AppRatingPromptModalProps = {
  visible: boolean;
  onDismiss: () => void;
};

export const AppRatingPromptModal = ({ visible, onDismiss }: AppRatingPromptModalProps) => {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const c = getColors(theme);
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        pressBehavior="close"
        opacity={0.45}
        accessible
        accessibilityRole="button"
        accessibilityLabel={t('appReview.a11yDismissBackdrop')}
      />
    ),
    [t],
  );

  const handleLater = () => {
    onDismiss();
  };

  const handleNever = () => {
    setNeverAskAppReview();
    onDismiss();
  };

  const handleRate = async () => {
    await requestNativeInAppReview();
    onDismiss();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onDismiss={onDismiss}
      backgroundStyle={{
        backgroundColor: c.background.primary,
        borderTopWidth: 1,
        borderTopColor: c.border.default,
      }}
      handleIndicatorStyle={{
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: c.icon.muted,
      }}
    >
      <BottomSheetView
        style={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 20) + 12,
        }}
      >
        <View className="mb-1 items-center">
          <View
            className="mb-4 h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: c.background.tertiary }}
          >
            <Star size={28} color={c.accent.primary} strokeWidth={1.8} />
          </View>
          <Text className="mb-2 text-center text-xl font-bold" style={{ color: c.text.primary }}>
            {t('appReview.title')}
          </Text>
          <Text
            className="mb-6 text-center text-base leading-6"
            style={{ color: c.text.secondary }}
          >
            {t('appReview.message')}
          </Text>
        </View>

        <Button
          label={t('appReview.rate')}
          onPress={handleRate}
          color={c}
          variant="primary"
          size="lg"
          fullWidth
        />
        <View className="h-3" />
        <Button
          label={t('appReview.later')}
          onPress={handleLater}
          color={c}
          variant="secondary"
          size="lg"
          fullWidth
        />
        <Pressable
          onPress={handleNever}
          className="mt-4 py-2"
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('appReview.never')}
        >
          <Text className="text-center text-sm" style={{ color: c.accent.primary }}>
            {t('appReview.never')}
          </Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
};
