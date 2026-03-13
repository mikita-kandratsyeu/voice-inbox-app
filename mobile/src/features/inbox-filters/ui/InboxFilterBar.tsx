import { MenuView } from '@react-native-menu/menu';
import { Archive, ArrowDownUp, Filter, LayoutList, Pin } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity, View } from 'react-native';

import type { InboxFilterStatus, InboxSortOption } from '@/features/inbox-filters';
import type { Colors } from '@/shared/config';
import { getColors, useAppTheme } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

const PRIMARY_FILTERS: InboxFilterStatus[] = ['all', 'pinned', 'archived'];

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
  archived: Archive,
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
  const theme = useAppTheme();
  const themeColors = getColors(theme);
  const isDark = theme === 'dark';
  const hasMenuFilterActive = MENU_FILTERS.includes(filterStatus);

  const buttonStyle = {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <View className="mb-3 flex-row items-stretch px-4" style={{ gap: 8 }}>
      <View
        className="flex-1 min-w-0 flex-row overflow-hidden rounded-xl"
        style={{
          backgroundColor: color.background.tertiary,
          padding: 4,
          gap: 4,
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
              style={[
                buttonStyle,
                { flex: 1, backgroundColor: isActive ? color.accent.primary : 'transparent' },
              ]}
              accessibilityLabel={t(`inbox.filters.${status}`)}
            >
              <Icon
                size={18}
                strokeWidth={2}
                color={isActive ? color.icon.onAccent : color.text.secondary}
              />
            </TouchableOpacity>
          );
        })}
      </View>
      <View
        className="overflow-hidden rounded-xl"
        style={{
          backgroundColor: color.background.tertiary,
          padding: 4,
        }}
      >
        <MenuView
          key={`filter-menu-${theme}`}
          themeVariant={isDark ? 'dark' : 'light'}
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
            titleColor: themeColors.text.primary,
            state: filterStatus === opt ? 'on' : 'off',
          }))}
        >
          <TouchableOpacity
            onPress={() => hapticSelection()}
            activeOpacity={0.7}
            style={[
              buttonStyle,
              {
                minWidth: 40,
                paddingHorizontal: 8,
                backgroundColor: hasMenuFilterActive ? color.accent.primary : 'transparent',
              },
            ]}
            accessibilityLabel={t('inbox.filters.moreFilters')}
          >
            <Filter
              size={18}
              color={hasMenuFilterActive ? color.icon.onAccent : color.text.secondary}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </MenuView>
      </View>
      <View
        className="overflow-hidden rounded-xl"
        style={{
          backgroundColor: color.background.tertiary,
          padding: 4,
        }}
      >
        <MenuView
          key={`sort-menu-${theme}`}
          themeVariant={isDark ? 'dark' : 'light'}
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
            titleColor: themeColors.text.primary,
            state: sortOption === opt ? 'on' : 'off',
          }))}
        >
          <TouchableOpacity
            onPress={() => hapticSelection()}
            activeOpacity={0.7}
            style={[
              buttonStyle,
              {
                minWidth: 40,
                paddingHorizontal: 8,
                backgroundColor: sortOption !== 'dateDesc' ? color.accent.primary : 'transparent',
              },
            ]}
            accessibilityLabel={t(`inbox.sort.${sortOption}`)}
          >
            <ArrowDownUp
              size={18}
              color={sortOption !== 'dateDesc' ? color.icon.onAccent : color.text.secondary}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </MenuView>
      </View>
    </View>
  );
};
