import { MenuView } from '@react-native-menu/menu';
import { ChevronDown, Inbox, Pin } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import type { InboxFilterStatus, InboxSortOption } from '@/features/inbox-filters';
import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

const FILTER_OPTIONS: InboxFilterStatus[] = [
  'all',
  'withoutTranscript',
  'read',
  'archived',
  'pinned',
];

const SORT_OPTIONS: InboxSortOption[] = [
  'dateDesc',
  'dateAsc',
  'durationDesc',
  'durationAsc',
  'titleAsc',
];

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

  const getFilterIcon = (status: InboxFilterStatus, iconColor: string) => {
    if (status === 'pinned') return <Pin size={14} strokeWidth={2} color={iconColor} />;
    return <Inbox size={14} strokeWidth={2} color={iconColor} />;
  };

  return (
    <View className="mx-4 mb-3 flex-row items-center gap-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, flexGrow: 0 }}
      >
        {FILTER_OPTIONS.map((status) => {
          const isActive = filterStatus === status;
          return (
            <TouchableOpacity
              key={status}
              onPress={() => {
                hapticSelection();
                onFilterChange(status);
              }}
              activeOpacity={0.7}
              className="flex-row items-center gap-1.5 rounded-full px-3.5 py-2"
              style={{
                backgroundColor: isActive ? color.accent.primary : color.background.tertiary,
              }}
            >
              {getFilterIcon(status, isActive ? '#fff' : color.text.primary)}
              <Text
                className="text-[13px] font-medium"
                style={{
                  color: isActive ? '#fff' : color.text.primary,
                }}
              >
                {t(`inbox.filters.${status}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
        }))}
      >
        <TouchableOpacity
          onPress={() => hapticSelection()}
          activeOpacity={0.7}
          className="flex-row items-center gap-1.5 rounded-full px-3 py-2"
          style={{ backgroundColor: color.background.tertiary }}
        >
          <Text className="text-[13px] font-medium" style={{ color: color.text.primary }}>
            {t(`inbox.sort.${sortOption}`)}
          </Text>
          <ChevronDown size={14} color={color.text.secondary} strokeWidth={2} />
        </TouchableOpacity>
      </MenuView>
    </View>
  );
};
