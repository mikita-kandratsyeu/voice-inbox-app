import type { FlashListRef } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import { Folder, MessageCircleQuestion, Search, X } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import {
  getFloatingTabBarScrollPaddingBottom,
  getInboxBatchModeScrollPaddingBottom,
} from '@/app/navigation/config';
import type { VoiceRecord } from '@/entities/record';
import type { BatchSelectState } from '@/features/batch-select';
import type { InboxCardLayout } from '@/features/inbox-card-layout';
import type {
  InboxFilterStatus,
  InboxMenuFilterStatus,
  InboxSortOption,
} from '@/features/inbox-filters';
import { INBOX_FILTER_BAR_FALLBACK_HEIGHT, InboxFilterBar } from '@/features/inbox-filters';
import { MobileAdminBanner } from '@/features/mobile-admin-banner';
import type { Colors } from '@/shared/config';
import { iosHitSlopForVisualSize } from '@/shared/lib/iosTouchTarget';
import type { MobileBanner } from '@/shared/lib/mobile-banner';
import {
  EmptyState,
  FLOATING_FROSTED_INPUT_ICON_SIZE,
  FLOATING_FROSTED_INPUT_ICON_STROKE,
  FloatingFrostedChromeDivider,
  FloatingFrostedChromeSection,
  FloatingFrostedInputChrome,
  FloatingFrostedStickyView,
  getFloatingFrostedInputContainerStyle,
  getFloatingFrostedInputFieldRowStyle,
  getFloatingFrostedInputRowStyle,
  getInputFieldInputStyle,
  HeaderIconButton,
  SwipeHintBanner,
} from '@/shared/ui';

import type { FlattenedItem } from '../lib/inboxScreenTypes';
import { EmptySearchState } from './EmptySearchState';
import { InboxSkeleton } from './InboxSkeleton';

const INBOX_ASK_SEARCH_MIN_QUERY = 3;

type StickySearchBarProps = {
  query: string;
  onChangeQuery: (text: string) => void;
  color: Colors;
  focusSignal: number;
  onClose: () => void;
  onFocus: () => void;
  onBlur: () => void;
  focused: boolean;
  onAskAboutSearch?: (query: string) => void;
};

function StickySearchBar({
  query,
  onChangeQuery,
  color,
  focusSignal,
  onClose,
  onFocus,
  onBlur,
  focused,
  onAskAboutSearch,
}: StickySearchBarProps) {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (focusSignal <= 0) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());

    return () => cancelAnimationFrame(id);
  }, [focusSignal]);

  const handleClear = () => {
    onChangeQuery('');
    inputRef.current?.focus();
  };

  const closeButton = (
    <HeaderIconButton
      iconOnly
      variant="icon"
      size="md"
      icon={<X size={22} color={color.text.secondary} strokeWidth={2.2} />}
      color={color}
      onPress={() => {
        onChangeQuery('');
        onClose();
      }}
      accessibilityLabel={t('search.a11yHide')}
    />
  );

  const showAskChip = onAskAboutSearch != null && query.trim().length >= INBOX_ASK_SEARCH_MIN_QUERY;

  return (
    <View className="gap-2">
      <FloatingFrostedInputChrome color={color}>
        <View
          style={{
            ...getFloatingFrostedInputContainerStyle(),
            ...getFloatingFrostedInputRowStyle(),
          }}
        >
          <View style={getFloatingFrostedInputFieldRowStyle()}>
            <Search
              size={FLOATING_FROSTED_INPUT_ICON_SIZE}
              color={focused || query ? color.accent.primary : color.icon.muted}
              strokeWidth={FLOATING_FROSTED_INPUT_ICON_STROKE}
            />
            <TextInput
              ref={inputRef}
              style={[getInputFieldInputStyle(color), { flex: 1 }]}
              placeholder={t('search.placeholder')}
              placeholderTextColor={color.text.secondary}
              value={query}
              onChangeText={onChangeQuery}
              onFocus={onFocus}
              onBlur={onBlur}
              returnKeyType="search"
              clearButtonMode="never"
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={handleClear}
                hitSlop={iosHitSlopForVisualSize(16, 16)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('common.clear')}
              >
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: color.icon.muted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={10} color={color.background.primary} strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            )}
          </View>
          <FloatingFrostedChromeDivider color={color} />
          <FloatingFrostedChromeSection>{closeButton}</FloatingFrostedChromeSection>
        </View>
      </FloatingFrostedInputChrome>
      {showAskChip ? (
        <TouchableOpacity
          onPress={() => onAskAboutSearch?.(query.trim())}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={t('inboxAsk.searchChipA11y', { query: query.trim() })}
          className="flex-row items-center gap-2 self-start rounded-full px-3 py-2"
          style={{
            backgroundColor: color.background.card,
            borderWidth: 1,
            borderColor: color.border.default,
            marginHorizontal: 12,
          }}
        >
          <MessageCircleQuestion size={16} color={color.accent.primary} strokeWidth={2.1} />
          <Text
            className="text-[14px] font-semibold leading-[18px]"
            style={{ color: color.accent.primary }}
            numberOfLines={1}
          >
            {t('inboxAsk.searchChip')}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

type InboxScreenLoadedBodyProps = {
  color: Colors;
  insetsBottom: number;
  isTablet: boolean;
  hidePrimaryFilters?: boolean;
  contentMaxWidth: number | undefined;
  filteredLength: number;
  showInboxSearchBar: boolean;
  query: string;
  onChangeQuery: (q: string) => void;
  searchFocusSignal: number;
  onSearchCleared: () => void;
  batchSelect: BatchSelectState;
  filterStatus: InboxFilterStatus;
  menuFilterStatus: InboxMenuFilterStatus | null;
  sortOption: InboxSortOption;
  onFilterChange: (s: InboxFilterStatus) => void;
  onMenuFilterChange: (s: InboxMenuFilterStatus | null) => void;
  onSortChange: (o: InboxSortOption) => void;
  cardLayout: InboxCardLayout;
  onCardLayoutChange: (layout: InboxCardLayout) => void;
  showSwipeHint: boolean;
  onDismissSwipeHint: () => void;
  isSearching: boolean;
  emptyStatePlacement: 'center' | 'top';
  emptyFilterTitle: string;
  emptyFilterDescription: string;
  emptyFolderHint?: string;
  effectiveActiveFolderId: string | null;
  listRef: React.RefObject<FlashListRef<FlattenedItem> | null>;
  filterStatusKey: string;
  pagedFlattenedData: FlattenedItem[];
  listContentStyle: object;
  listStyle: object;
  onEndReached: () => void;
  renderListItem: (props: { item: FlattenedItem }) => React.ReactElement;
  listExtraData: {
    cardLayout: InboxCardLayout;
    records: VoiceRecord[];
    selectedIds: Set<string>;
    visibleRecordCount: number;
  };
  keyExtractor: (item: FlattenedItem) => string;
  getItemType: (item: FlattenedItem) => string;
  onInboxListScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  showInboxScrollResetSkeleton: boolean;
  onAskAboutSearch?: (query: string) => void;
  adminBanner?: MobileBanner | null;
  onDismissAdminBanner?: () => void;
};

function InboxScreenLoadedBodyInner({
  color,
  insetsBottom,
  isTablet,
  hidePrimaryFilters = false,
  contentMaxWidth,
  filteredLength,
  showInboxSearchBar,
  query,
  onChangeQuery,
  searchFocusSignal,
  onSearchCleared,
  batchSelect,
  filterStatus,
  menuFilterStatus,
  sortOption,
  onFilterChange,
  onMenuFilterChange,
  onSortChange,
  cardLayout,
  onCardLayoutChange,
  showSwipeHint,
  onDismissSwipeHint,
  isSearching,
  emptyStatePlacement,
  emptyFilterTitle,
  emptyFilterDescription,
  emptyFolderHint,
  effectiveActiveFolderId,
  listRef,
  filterStatusKey,
  pagedFlattenedData,
  listContentStyle,
  listStyle,
  onEndReached,
  renderListItem,
  listExtraData,
  keyExtractor,
  getItemType,
  onInboxListScroll,
  showInboxScrollResetSkeleton,
  onAskAboutSearch,
  adminBanner,
  onDismissAdminBanner,
}: InboxScreenLoadedBodyProps) {
  const [filterBarHeight, setFilterBarHeight] = useState(INBOX_FILTER_BAR_FALLBACK_HEIGHT);
  const [bannerHeight, setBannerHeight] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    if (!adminBanner) {
      setBannerHeight(0);
    }
  }, [adminBanner]);

  useEffect(() => {
    if (!showInboxSearchBar) setSearchFocused(false);
  }, [showInboxSearchBar]);

  const handleFilterBarLayout = useCallback((e: LayoutChangeEvent) => {
    setFilterBarHeight(e.nativeEvent.layout.height);
  }, []);

  const handleBannerLayout = useCallback((e: LayoutChangeEvent) => {
    setBannerHeight(e.nativeEvent.layout.height);
  }, []);

  const filterScrollTopPad = batchSelect.isSelectMode ? 0 : filterBarHeight + bannerHeight;

  const mergedListContentStyle = useMemo(() => {
    const base = listContentStyle as { paddingTop?: number };
    const prevTop = typeof base.paddingTop === 'number' ? base.paddingTop : 0;
    return {
      ...listContentStyle,
      paddingTop: prevTop + filterScrollTopPad,
    };
  }, [listContentStyle, filterScrollTopPad]);

  const showSwipeHintForLayout = showSwipeHint && cardLayout !== 'expanded';

  const swipeListHeader = useMemo(() => {
    if (!showSwipeHintForLayout || batchSelect.isSelectMode) {
      return undefined;
    }
    return (
      <View style={{ marginTop: showInboxSearchBar ? 4 : 0, marginBottom: 4 }}>
        <SwipeHintBanner onDismiss={onDismissSwipeHint} />
      </View>
    );
  }, [batchSelect.isSelectMode, onDismissSwipeHint, showInboxSearchBar, showSwipeHintForLayout]);

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <View
        style={{
          flex: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth,
          paddingBottom:
            filteredLength === 0
              ? batchSelect.isSelectMode
                ? getInboxBatchModeScrollPaddingBottom(insetsBottom)
                : getFloatingTabBarScrollPaddingBottom(insetsBottom, isTablet)
              : 0,
        }}
      >
        <View style={{ flex: 1, position: 'relative' }}>
          {!batchSelect.isSelectMode && (
            <View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                zIndex: 20,
                elevation: 10,
              }}
            >
              {adminBanner && onDismissAdminBanner ? (
                <MobileAdminBanner
                  banner={adminBanner}
                  color={color}
                  onDismiss={onDismissAdminBanner}
                  placement="floating"
                  onLayout={handleBannerLayout}
                />
              ) : null}
              <InboxFilterBar
                filterStatus={filterStatus}
                menuFilterStatus={menuFilterStatus}
                sortOption={sortOption}
                onFilterChange={onFilterChange}
                onMenuFilterChange={onMenuFilterChange}
                onSortChange={onSortChange}
                cardLayout={cardLayout}
                onCardLayoutChange={onCardLayoutChange}
                color={color}
                hidePrimaryFilters={hidePrimaryFilters}
                onLayout={handleFilterBarLayout}
              />
            </View>
          )}
          {isSearching && filteredLength === 0 ? (
            <View style={{ flex: 1, paddingTop: filterScrollTopPad }}>
              <EmptySearchState
                query={query}
                color={color}
                verticalPlacement={emptyStatePlacement}
              />
            </View>
          ) : filteredLength === 0 ? (
            <View style={{ flex: 1, paddingTop: filterScrollTopPad }}>
              {showSwipeHintForLayout && !batchSelect.isSelectMode && (
                <View style={{ marginTop: showInboxSearchBar ? 4 : 0 }}>
                  <SwipeHintBanner onDismiss={onDismissSwipeHint} />
                </View>
              )}
              <EmptyState
                title={emptyFilterTitle}
                description={emptyFilterDescription}
                hint={emptyFolderHint}
                verticalPlacement={emptyStatePlacement}
                hintIcon={
                  effectiveActiveFolderId ? (
                    <Folder
                      size={20}
                      color={color.accent.primary}
                      strokeWidth={2}
                      style={{ marginRight: 12 }}
                    />
                  ) : undefined
                }
              />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <FlashList
                ref={listRef}
                key={String(filterStatusKey)}
                data={pagedFlattenedData}
                renderItem={renderListItem}
                keyExtractor={keyExtractor}
                getItemType={getItemType}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.35}
                onScroll={onInboxListScroll}
                scrollEventThrottle={16}
                contentContainerStyle={mergedListContentStyle}
                style={[listStyle, { flex: 1 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                extraData={listExtraData}
                ListHeaderComponent={swipeListHeader}
                maintainVisibleContentPosition={{ disabled: true }}
              />
              {showInboxScrollResetSkeleton && (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    paddingTop: filterScrollTopPad,
                    backgroundColor: color.background.secondary,
                    zIndex: 12,
                  }}
                >
                  <InboxSkeleton color={color} />
                </View>
              )}
            </View>
          )}
        </View>
      </View>
      {showInboxSearchBar && (
        <FloatingFrostedStickyView safeAreaBottom={insetsBottom}>
          <StickySearchBar
            query={query}
            onChangeQuery={onChangeQuery}
            color={color}
            focusSignal={searchFocusSignal}
            onClose={onSearchCleared}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            focused={searchFocused}
            onAskAboutSearch={onAskAboutSearch}
          />
        </FloatingFrostedStickyView>
      )}
    </View>
  );
}

export const InboxScreenLoadedBody = memo(InboxScreenLoadedBodyInner);
