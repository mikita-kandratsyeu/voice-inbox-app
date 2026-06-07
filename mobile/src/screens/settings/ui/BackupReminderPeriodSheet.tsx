import { BottomSheetView } from '@gorhom/bottom-sheet';
import { Check } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import type { BackupReminderPeriodDays } from '@/entities/settings';
import { useColors } from '@/shared/config';
import { AppBottomSheetModal, SheetFooterButtons, useBottomSheetContentPadding } from '@/shared/ui';

const PERIOD_OPTIONS: BackupReminderPeriodDays[] = [7, 14, 30];

type BackupReminderPeriodSheetProps = {
  visible: boolean;
  selectedDays: BackupReminderPeriodDays;
  onSelect: (days: BackupReminderPeriodDays) => void;
  onClose: () => void;
};

export function BackupReminderPeriodSheet({
  visible,
  selectedDays,
  onSelect,
  onClose,
}: BackupReminderPeriodSheetProps) {
  const { t } = useTranslation();
  const c = useColors();
  const contentPadding = useBottomSheetContentPadding(24);

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <BottomSheetView
        style={{
          paddingHorizontal: 24,
          paddingTop: 8,
          ...contentPadding,
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
          {t('settings.backupReminderPeriodPickerTitle')}
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
          {t('settings.backupReminderPeriodPickerMessage')}
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
          {PERIOD_OPTIONS.map((days, index) => {
            const selected = days === selectedDays;
            const label = t('settings.backupReminderPeriodValue', { count: days });
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
                  borderBottomWidth: index < PERIOD_OPTIONS.length - 1 ? 1 : 0,
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
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}
