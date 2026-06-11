import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  CalendarOff,
  Check,
  CheckCircle2,
  ChevronRight,
  Flag,
  type LucideIcon,
} from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { type Colors, useColors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { AppBottomSheetModal, useBottomSheetContentPadding } from '@/shared/ui';

import type { AllTasksQuickFilter } from '../types';

const SECONDARY_FILTERS: AllTasksQuickFilter[] = ['highPriority', 'noDate', 'done'];

function getSecondaryFilterIcon(
  filter: AllTasksQuickFilter,
  color: Colors,
): { Icon: LucideIcon; iconColor: string } {
  switch (filter) {
    case 'highPriority':
      return { Icon: Flag, iconColor: color.accent.delete };
    case 'noDate':
      return { Icon: CalendarOff, iconColor: color.text.secondary };
    case 'done':
      return { Icon: CheckCircle2, iconColor: color.accent.success };
    default:
      return { Icon: Flag, iconColor: color.text.secondary };
  }
}

type FilterPickerRowProps = {
  label: string;
  icon: LucideIcon;
  iconColor: string;
  selected: boolean;
  isLast: boolean;
  onPress: () => void;
};

type AllTasksMoreFiltersSheetProps = {
  visible: boolean;
  activeFilter: AllTasksQuickFilter;
  onClose: () => void;
  onSelect: (filter: AllTasksQuickFilter) => void;
};

export function AllTasksMoreFiltersSheet({
  visible,
  activeFilter,
  onClose,
  onSelect,
}: AllTasksMoreFiltersSheetProps) {
  const { t } = useTranslation();
  const color = useColors();
  const contentPadding = useBottomSheetContentPadding(20);

  const renderRow = ({ label, icon: Icon, iconColor, selected, isLast, onPress }: FilterPickerRowProps) => (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        backgroundColor: pressed ? color.background.tertiary : 'transparent',
        borderBottomColor: color.border.default,
        borderBottomWidth: isLast ? 0 : 1,
        width: '100%',
      })}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 12,
          minHeight: 52,
          paddingHorizontal: 14,
          paddingVertical: 12,
          width: '100%',
        }}
      >
        <View
          style={{
            alignSelf: 'stretch',
            backgroundColor: iconColor,
            borderRadius: 2,
            flexShrink: 0,
            width: 3,
          }}
        />
        <View
          style={{
            alignItems: 'center',
            backgroundColor: color.background.tertiary,
            borderRadius: 10,
            flexShrink: 0,
            height: 36,
            justifyContent: 'center',
            width: 36,
          }}
        >
          <Icon size={18} color={iconColor} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, flexShrink: 1, justifyContent: 'center', minWidth: 0 }}>
          <Text
            style={{
              color: color.text.primary,
              fontSize: 16,
              fontWeight: '600',
              lineHeight: 21,
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
        <View style={{ flexShrink: 0, marginLeft: 2 }}>
          {selected ? (
            <Check size={20} color={iconColor} strokeWidth={2.5} />
          ) : (
            <ChevronRight size={18} color={color.text.muted} strokeWidth={2.2} />
          )}
        </View>
      </View>
    </Pressable>
  );

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          ...contentPadding,
        }}
      >
        <Text
          style={{
            color: color.text.primary,
            fontSize: 17,
            fontWeight: '600',
            marginBottom: 4,
            marginTop: 4,
            textAlign: 'center',
          }}
        >
          {t('allTasks.moreFiltersTitle')}
        </Text>
        <Text
          style={{
            color: color.text.secondary,
            fontSize: 14,
            lineHeight: 20,
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          {t('allTasks.moreFiltersSubtitle')}
        </Text>

        <View
          style={{
            backgroundColor: color.background.card,
            borderColor: color.border.default,
            borderRadius: 12,
            borderWidth: 1,
            overflow: 'hidden',
          }}
        >
          {SECONDARY_FILTERS.map((filter, index) => {
            const isActive = activeFilter === filter;
            const isLast = index === SECONDARY_FILTERS.length - 1;
            const { Icon, iconColor } = getSecondaryFilterIcon(filter, color);

            return (
              <React.Fragment key={filter}>
                {renderRow({
                  label: t(`allTasks.quickFilters.${filter}`),
                  icon: Icon,
                  iconColor,
                  selected: isActive,
                  isLast,
                  onPress: () => {
                    onSelect(filter);
                    onClose();
                  },
                })}
              </React.Fragment>
            );
          })}
        </View>
      </BottomSheetScrollView>
    </AppBottomSheetModal>
  );
}
