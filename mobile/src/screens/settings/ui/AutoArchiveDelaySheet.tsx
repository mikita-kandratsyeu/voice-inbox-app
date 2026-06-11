import { Check } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import type { AutoArchiveAfterDays } from '@/entities/settings';
import { useColors } from '@/shared/config';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  SheetFooterButtons,
  SheetHeader,
} from '@/shared/ui';

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

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <AppBottomSheetContent useTabletPadding>
        <SheetHeader
          title={t('settings.autoArchiveDelayPickerTitle')}
          subtitle={t('settings.autoArchiveDelayPickerMessage')}
          color={c}
          marginBottom={16}
        />
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
        <SheetFooterButtons
          className="mt-3 w-full"
          color={c}
          primaryLabel={t('common.cancel')}
          onPrimaryPress={onClose}
          singleVariant="secondary"
        />
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
