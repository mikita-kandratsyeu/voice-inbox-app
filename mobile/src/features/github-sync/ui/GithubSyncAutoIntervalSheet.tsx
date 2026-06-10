import { BottomSheetView } from '@gorhom/bottom-sheet';
import { Check } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { AppBottomSheetModal, SheetFooterButtons, useBottomSheetContentPadding } from '@/shared/ui';

import {
  GITHUB_SYNC_AUTO_INTERVAL_OPTIONS,
  type GithubSyncAutoIntervalHours,
} from '../lib/githubSyncState';

type Props = {
  visible: boolean;
  color: Colors;
  selectedHours: GithubSyncAutoIntervalHours;
  onSelect: (hours: GithubSyncAutoIntervalHours) => void;
  onClose: () => void;
};

export function GithubSyncAutoIntervalSheet({
  visible,
  color,
  selectedHours,
  onSelect,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const contentPadding = useBottomSheetContentPadding(24);

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <BottomSheetView style={{ paddingHorizontal: 24, paddingTop: 8, ...contentPadding }}>
        <Text
          style={{
            color: color.text.primary,
            fontSize: 17,
            fontWeight: '600',
            marginBottom: 8,
            paddingTop: 4,
            textAlign: 'center',
          }}
        >
          {t('settings.githubSync.autoIntervalTitle')}
        </Text>
        <Text
          style={{
            color: color.text.secondary,
            fontSize: 14,
            lineHeight: 20,
            marginBottom: 16,
            paddingHorizontal: 4,
            textAlign: 'center',
          }}
        >
          {t('settings.githubSync.autoIntervalSubtitle')}
        </Text>
        <View
          style={{
            backgroundColor: color.background.card,
            borderColor: color.border.default,
            borderRadius: 16,
            borderWidth: 1,
            overflow: 'hidden',
          }}
        >
          {GITHUB_SYNC_AUTO_INTERVAL_OPTIONS.map((hours, index) => {
            const selected = hours === selectedHours;
            const label = t(`settings.githubSync.autoInterval.h${hours}`);
            return (
              <TouchableOpacity
                key={hours}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={label}
                onPress={() => onSelect(hours)}
                style={{
                  alignItems: 'center',
                  borderBottomColor: color.border.default,
                  borderBottomWidth:
                    index < GITHUB_SYNC_AUTO_INTERVAL_OPTIONS.length - 1 ? 1 : 0,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  minHeight: 52,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <Text style={{ color: color.text.primary, fontSize: 16 }}>{label}</Text>
                {selected ? <Check size={20} color={color.accent.primary} strokeWidth={2.5} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
        <SheetFooterButtons
          color={color}
          className="mt-4 w-full"
          primaryLabel={t('common.close')}
          onPrimaryPress={onClose}
        />
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}
