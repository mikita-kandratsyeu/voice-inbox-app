import { MenuView } from '@react-native-menu/menu';
import { ArrowDownUp, Filter, LayoutList, Pin } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import type { InboxFilterStatus, InboxSortOption } from '@/features/inbox-filters';
import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

const PRIMARY_FILTERS: InboxFilterStatus[] = ['all', 'pinned'];

const CLASSIFICATION_FILTERS: InboxFilterStatus[] = [
  'personal',
  'work',
  'meeting',
  'idea',
  'other',
];

const MENU_FILTERS: InboxFilterStatus[] = [
  'withoutTranscript',
  'withoutSummary',
  ...CLASSIFICATION_FILTERS,
];

const SORT_OPTIONS: InboxSortOption[] = [
  'dateDesc',
  'dateAsc',
  'durationDesc',
  'durationAsc',
  'titleAsc',
];

const FILTER_ICONS = {
  all: LayoutList,
  pinned: Pin,
} as const;

type InboxFilterBarProps = {
  filterStatus: InboxFilterStatus;
  sortOption: InboxSortOption;
  onFilterChange: (status: InboxFilterStatus) => void;
  onSortChange: (option: InboxSortOption) => void;
  color: Colors;
};

export const InboxFilterBar = ({
  filterStatus,
  sortOption,
  onFilterChange,
  onSortChange,
  color,
}: InboxFilterBarProps) => {
  const { t } = useTranslation();
  const hasMenuFilterActive = MENU_FILTERS.includes(filterStatus);

  return (
    <View className="mb-3 flex-row items-stretch gap-3 px-4">
      <View
        className="flex-1 flex-row overflow-hidden rounded-xl"
        style={{
          backgroundColor: color.background.tertiary,
          padding: 4,
        }}
      >
        {PRIMARY_FILTERS.map((status) => {
          const isActive = filterStatus === status;
          const Icon = FILTER_ICONS[status as keyof typeof FILTER_ICONS];
          return (
            <TouchableOpacity
              key={status}
              onPress={() => {
                hapticSelection();
                onFilterChange(status);
              }}
              activeOpacity={0.7}
              className="flex-1 flex-row items-center justify-center gap-1 py-3"
              style={{
                backgroundColor: isActive ? color.accent.primary : 'transparent',
                borderRadius: 8,
              }}
            >
              <Icon
                size={14}
                strokeWidth={2}
                color={isActive ? color.icon.onAccent : color.text.secondary}
              />
              <Text
                className="text-[12px] font-medium"
                style={{
                  color: isActive ? color.icon.onAccent : color.text.primary,
                }}
                numberOfLines={1}
              >
                {t(`inbox.filters.${status}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <MenuView
        onPressAction={({ nativeEvent }) => {
          hapticSelection();
          const opt = nativeEvent.event as InboxFilterStatus;
          if (MENU_FILTERS.includes(opt)) {
            onFilterChange(opt);
          }
        }}
        actions={MENU_FILTERS.map((opt) => ({
          id: opt,
          title: t(`inbox.filters.${opt}`),
          state: filterStatus === opt ? 'on' : 'off',
        }))}
      >
        <TouchableOpacity
          onPress={() => hapticSelection()}
          activeOpacity={0.7}
          className="flex-row items-center justify-center rounded-xl px-3"
          style={{
            backgroundColor: hasMenuFilterActive ? color.accent.primary : color.background.tertiary,
            paddingVertical: 12,
            minWidth: 44,
          }}
          accessibilityLabel={t('inbox.filters.moreFilters')}
        >
          <Filter
            size={16}
            color={hasMenuFilterActive ? color.icon.onAccent : color.text.secondary}
            strokeWidth={2}
          />
        </TouchableOpacity>
      </MenuView>
      <MenuView
        onPressAction={({ nativeEvent }) => {
          hapticSelection();
          const opt = nativeEvent.event as InboxSortOption;
          if (SORT_OPTIONS.includes(opt)) {
            onSortChange(opt);
          }
        }}
        actions={SORT_OPTIONS.map((opt) => ({
          id: opt,
          title: t(`inbox.sort.${opt}`),
          state: sortOption === opt ? 'on' : 'off',
        }))}
      >
        <TouchableOpacity
          onPress={() => hapticSelection()}
          activeOpacity={0.7}
          className="flex-row items-center justify-center rounded-xl px-3"
          style={{
            backgroundColor: color.background.tertiary,
            paddingVertical: 12,
            minWidth: 44,
          }}
          accessibilityLabel={t(`inbox.sort.${sortOption}`)}
        >
          <ArrowDownUp size={16} color={color.text.secondary} strokeWidth={2} />
        </TouchableOpacity>
      </MenuView>
    </View>
  );
};
