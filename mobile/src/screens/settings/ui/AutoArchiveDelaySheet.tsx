import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Check } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AutoArchiveAfterDays } from '@/entities/settings';
import { useColors } from '@/shared/config';
import { modalKeyboardBehavior } from '@/shared/lib/platform';
import { Button } from '@/shared/ui';

const DELAY_OPTIONS: AutoArchiveAfterDays[] = [1, 7, 14, 30];

type AutoArchiveDelaySheetProps = {
  visible: boolean;
  selectedDays: AutoArchiveAfterDays;
  onSelect: (days: AutoArchiveAfterDays) => void;
  onClose: () => void;
};

export function AutoArchiveDelaySheet({
  visible,
  selectedDays,
  onSelect,
  onClose,
}: AutoArchiveDelaySheetProps) {
  const { t } = useTranslation();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) {
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior="close" opacity={0.45} />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      enableOverDrag={false}
      keyboardBehavior={modalKeyboardBehavior}
      keyboardBlurBehavior="restore"
      enableBlurKeyboardOnGesture
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
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
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: c.text.primary,
            textAlign: 'center',
            paddingTop: 4,
            marginBottom: 8,
          }}
        >
          {t('settings.autoArchiveDelayPickerTitle')}
        </Text>
        <Text
          style={{
            fontSize: 14,
            lineHeight: 20,
            color: c.text.secondary,
            textAlign: 'center',
            marginBottom: 16,
            paddingHorizontal: 4,
          }}
        >
          {t('settings.autoArchiveDelayPickerMessage')}
        </Text>
        <View
          style={{
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: c.border.default,
            backgroundColor: c.background.card,
          }}
        >
          {DELAY_OPTIONS.map((days, index) => {
            const selected = days === selectedDays;
            const label = t('settings.autoArchiveDelayValue', { count: days });
            return (
              <TouchableOpacity
                key={days}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={label}
                onPress={() => onSelect(days)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: index < DELAY_OPTIONS.length - 1 ? 1 : 0,
                  borderBottomColor: c.border.default,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 16, color: c.text.primary, flex: 1 }}>{label}</Text>
                {selected ? <Check size={18} color={c.accent.primary} strokeWidth={2.6} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ marginTop: 12 }}>
          <Button
            label={t('common.cancel')}
            color={c}
            variant="secondary"
            onPress={() => ref.current?.dismiss()}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
