import { MenuView } from '@react-native-menu/menu';
import {
  Archive,
  ArrowDownUp,
  Filter,
  Inbox,
  LayoutTemplate,
  List,
  Pin,
} from 'lucide-react-native';
import React, { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent, TouchableOpacity, View, type ViewStyle } from 'react-native';

import type { InboxCardLayout } from '@/features/inbox-card-layout';
import type {
  InboxFilterStatus,
  InboxMenuFilterStatus,
  InboxSortOption,
  PrimaryFilterStatus,
} from '@/features/inbox-filters';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { IOS_MIN_TOUCH_TARGET } from '@/shared/lib/iosTouchTarget';
import { FrostedChromeSurface } from '@/shared/ui';

const PRIMARY_FILTERS: PrimaryFilterStatus[] = ['all', 'pinned', 'archived'];

const FILTER_CHROME_RADIUS = 12;
export const INBOX_FILTER_CHROME_RADIUS = FILTER_CHROME_RADIUS;
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
    <FrostedChromeSurface color={color} borderRadius={FILTER_CHROME_RADIUS} style={style}>
      {children}
    </FrostedChromeSurface>
  );
}

const MENU_FILTERS: InboxMenuFilterStatus[] = [
  'unread',
  'withoutTranscript',
  'withoutSummary',
  'withoutTasks',
  'withTasks',
  'withPublicLink',
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

const FILTER_ICONS: Record<PrimaryFilterStatus, typeof Inbox> = {
  all: Inbox,
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
  cardLayout: InboxCardLayout;
  onCardLayoutChange: (layout: InboxCardLayout) => void;
  color: Colors;
  onLayout?: (event: LayoutChangeEvent) => void;
  /** Tablet sidebar already exposes All / Pinned / Archive. */
  hidePrimaryFilters?: boolean;
};

export const InboxFilterBar = memo(function InboxFilterBar({
  filterStatus,
  menuFilterStatus,
  sortOption,
  onFilterChange,
  onMenuFilterChange,
  onSortChange,
  cardLayout,
  onCardLayoutChange,
  color,
  onLayout,
  hidePrimaryFilters = false,
}: InboxFilterBarProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const isDark = theme === 'dark';
  const hasMenuFilterActive = menuFilterStatus != null;

  const buttonStyle = useMemo(
    () => ({
      minHeight: IOS_MIN_TOUCH_TARGET,
      minWidth: IOS_MIN_TOUCH_TARGET,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    }),
    [],
  );

  const menuActions = useMemo(
    () =>
      MENU_FILTERS.map((opt) => ({
        id: opt,
        title: t(`inbox.filters.${opt}`),
        titleColor: color.text.primary,
        state: menuFilterStatus === opt ? ('on' as const) : ('off' as const),
      })),
    [menuFilterStatus, t, color.text.primary],
  );

  const sortActions = useMemo(
    () =>
      SORT_OPTIONS.map((opt) => ({
        id: opt,
        title: t(`inbox.sort.${opt}`),
        titleColor: color.text.primary,
        state: sortOption === opt ? ('on' as const) : ('off' as const),
      })),
    [sortOption, t, color.text.primary],
  );

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
        <View className="flex-row" style={{ padding: 4, gap: 4 }}>
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
            actions={menuActions}
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
            actions={sortActions}
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
      <FrostedFilterSurface color={color}>
        <View style={{ padding: 4 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: cardLayout === 'expanded' }}
            activeOpacity={0.7}
            onPress={() => {
              hapticSelection();
              onCardLayoutChange(cardLayout === 'compact' ? 'expanded' : 'compact');
            }}
            style={[
              buttonStyle,
              {
                paddingHorizontal: 8,
                backgroundColor: cardLayout === 'expanded' ? color.accent.primary : 'transparent',
              },
            ]}
            accessibilityLabel={
              cardLayout === 'expanded'
                ? t('inbox.cardLayout.expandedA11y')
                : t('inbox.cardLayout.compactA11y')
            }
          >
            {cardLayout === 'expanded' ? (
              <LayoutTemplate
                size={18}
                color={cardLayout === 'expanded' ? color.icon.onAccent : color.text.secondary}
                strokeWidth={2}
              />
            ) : (
              <List size={18} color={color.text.secondary} strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>
      </FrostedFilterSurface>
    </View>
  );
});
