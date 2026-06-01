import { MenuView } from '@react-native-menu/menu';
import { Archive, ArrowDownUp, Filter, LayoutList, Pin } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent, TouchableOpacity, View, type ViewStyle } from 'react-native';

import {
  FLOAT_TAB_IOS_SHADOW_OFFSET_Y,
  FLOAT_TAB_IOS_SHADOW_RADIUS,
  floatingTabBarShadowOpacity,
} from '@/app/navigation/config';
import type {
  InboxFilterStatus,
  InboxMenuFilterStatus,
  InboxSortOption,
  PrimaryFilterStatus,
} from '@/features/inbox-filters';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { hapticSelection, selectPlatform } from '@/shared/lib';
import { IOS_MIN_TOUCH_TARGET } from '@/shared/lib/iosTouchTarget';
import { FrostedChromeBackground } from '@/shared/ui';

const PRIMARY_FILTERS: PrimaryFilterStatus[] = ['all', 'pinned', 'archived'];

const FILTER_CHROME_RADIUS = 12;
const FILTER_FLOAT_TOP_PAD = 10;
const FILTER_FLOAT_BOTTOM_PAD = 10;
const FILTER_ROW_INNER_HEIGHT = 4 * 2 + IOS_MIN_TOUCH_TARGET;
export const INBOX_FILTER_BAR_FALLBACK_HEIGHT =
  FILTER_FLOAT_TOP_PAD + FILTER_FLOAT_BOTTOM_PAD + FILTER_ROW_INNER_HEIGHT;

function FrostedFilterSurface({
  children,
  color,
  style,
}: {
  children: React.ReactNode;
  color: Colors;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          borderRadius: FILTER_CHROME_RADIUS,
          backgroundColor: 'transparent',
          ...selectPlatform({
            ios: {
              shadowColor: color.shadow.color,
              shadowOffset: { width: 0, height: FLOAT_TAB_IOS_SHADOW_OFFSET_Y },
              shadowOpacity: floatingTabBarShadowOpacity(color.shadow.opacity),
              shadowRadius: FLOAT_TAB_IOS_SHADOW_RADIUS,
            },
            android: {
              elevation: 8,
            },
            default: {},
          }),
        },
        style,
      ]}
    >
      <View
        style={{
          borderRadius: FILTER_CHROME_RADIUS,
          overflow: 'hidden',
        }}
      >
        <FrostedChromeBackground borderRadius={FILTER_CHROME_RADIUS} />
        {children}
      </View>
    </View>
  );
}

const MENU_FILTERS: InboxMenuFilterStatus[] = [
  'unread',
  'withoutTranscript',
  'withoutSummary',
  'withoutTasks',
  'withTasks',
  'meetingMode',
  'processingError',
];

const SORT_OPTIONS: InboxSortOption[] = [
  'dateDesc',
  'dateAsc',
  'durationDesc',
  'durationAsc',
  'titleAsc',
];

const FILTER_ICONS: Record<PrimaryFilterStatus, typeof LayoutList> = {
  all: LayoutList,
  pinned: Pin,
  archived: Archive,
};

type InboxFilterBarProps = {
  filterStatus: InboxFilterStatus;
  menuFilterStatus: InboxMenuFilterStatus | null;
  sortOption: InboxSortOption;
  onFilterChange: (status: InboxFilterStatus) => void;
  onMenuFilterChange: (status: InboxMenuFilterStatus | null) => void;
  onSortChange: (option: InboxSortOption) => void;
  color: Colors;
  onLayout?: (event: LayoutChangeEvent) => void;
  /** Tablet sidebar already exposes All / Pinned / Archive. */
  hidePrimaryFilters?: boolean;
};

export const InboxFilterBar = ({
  filterStatus,
  menuFilterStatus,
  sortOption,
  onFilterChange,
  onMenuFilterChange,
  onSortChange,
  color,
  onLayout,
  hidePrimaryFilters = false,
}: InboxFilterBarProps) => {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const isDark = theme === 'dark';
  const hasMenuFilterActive = menuFilterStatus != null;

  const buttonStyle = {
    minHeight: IOS_MIN_TOUCH_TARGET,
    minWidth: IOS_MIN_TOUCH_TARGET,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <View
      onLayout={onLayout}
      pointerEvents="box-none"
      className="flex-row items-stretch px-4"
      style={{
        gap: 8,
        paddingTop: FILTER_FLOAT_TOP_PAD,
        paddingBottom: FILTER_FLOAT_BOTTOM_PAD,
      }}
    >
      {!hidePrimaryFilters ? (
        <FrostedFilterSurface color={color} style={{ flex: 1, minWidth: 0 }}>
          <View className="flex-row" style={{ padding: 4, gap: 4 }}>
            {PRIMARY_FILTERS.map((status) => {
              const isActive = filterStatus === status;
              const Icon = FILTER_ICONS[status];
              return (
                <TouchableOpacity
                  key={status}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
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
        </FrostedFilterSurface>
      ) : null}
      <FrostedFilterSurface color={color}>
        <View style={{ padding: 4 }}>
          <MenuView
            key={`filter-menu-${theme}`}
            themeVariant={isDark ? 'dark' : 'light'}
            onPressAction={({ nativeEvent }) => {
              hapticSelection();
              const opt = nativeEvent.event as InboxMenuFilterStatus;
              if (MENU_FILTERS.includes(opt)) {
                onMenuFilterChange(menuFilterStatus === opt ? null : opt);
              }
            }}
            actions={MENU_FILTERS.map((opt) => ({
              id: opt,
              title: t(`inbox.filters.${opt}`),
              titleColor: color.text.primary,
              state: menuFilterStatus === opt ? 'on' : 'off',
            }))}
          >
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.7}
              style={[
                buttonStyle,
                {
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
      </FrostedFilterSurface>
      <FrostedFilterSurface color={color}>
        <View style={{ padding: 4 }}>
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
              titleColor: color.text.primary,
              state: sortOption === opt ? 'on' : 'off',
            }))}
          >
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.7}
              style={[
                buttonStyle,
                {
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
      </FrostedFilterSurface>
    </View>
  );
};
