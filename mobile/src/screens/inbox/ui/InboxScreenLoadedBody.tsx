import type { FlashListRef } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import { Folder, Search, X } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

import {
  getFloatingTabBarScrollPaddingBottom,
  getInboxBatchModeScrollPaddingBottom,
} from '@/app/navigation/config';
import type { BatchSelectState } from '@/features/batch-select';
import type {
  InboxFilterStatus,
  InboxMenuFilterStatus,
  InboxSortOption,
} from '@/features/inbox-filters';
import { INBOX_FILTER_BAR_FALLBACK_HEIGHT, InboxFilterBar } from '@/features/inbox-filters';
import type { Colors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
import { iosHitSlopForVisualSize } from '@/shared/lib/iosTouchTarget';
import {
  Button,
  EmptyState,
  FrostedBottomChrome,
  getInputFieldInputStyle,
  SwipeHintBanner,
} from '@/shared/ui';

import type { FlattenedItem } from '../lib/inboxScreenTypes';
import { EmptySearchState } from './EmptySearchState';
import { InboxSkeleton } from './InboxSkeleton';

type StickySearchBarProps = {
  query: string;
  onChangeQuery: (text: string) => void;
  color: Colors;
  focusSignal: number;
  insetsBottom: number;
  onClose: () => void;
  onFocus: () => void;
  onBlur: () => void;
  focused: boolean;
};

function StickySearchBar({
  query,
  onChangeQuery,
  color,
  focusSignal,
  insetsBottom,
  onClose,
  onFocus,
  onBlur,
  focused,
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

  return (
    <FrostedBottomChrome
      color={color}
      insetsBottom={insetsBottom}
      contentStyle={{
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: color.background.tertiary,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: IS_IOS ? 10 : 8,
          borderWidth: 1,
          borderColor: focused ? color.accent.primary : color.border.default,
        }}
      >
        <Search
          size={16}
          color={focused || query ? color.accent.primary : color.icon.muted}
          strokeWidth={2}
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
      <Button
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
    </FrostedBottomChrome>
  );
}

type InboxScreenLoadedBodyProps = {
  color: Colors;
  insetsBottom: number;
  isTablet: boolean;
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
  keyExtractor: (item: FlattenedItem) => string;
  getItemType: (item: FlattenedItem) => FlattenedItem['type'];
  onInboxListScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  showInboxScrollResetSkeleton: boolean;
};

function InboxScreenLoadedBodyInner({
  color,
  insetsBottom,
  isTablet,
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
  keyExtractor,
  getItemType,
  onInboxListScroll,
  showInboxScrollResetSkeleton,
}: InboxScreenLoadedBodyProps) {
  const [filterBarHeight, setFilterBarHeight] = useState(INBOX_FILTER_BAR_FALLBACK_HEIGHT);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    if (!showInboxSearchBar) setSearchFocused(false);
  }, [showInboxSearchBar]);

  const handleFilterBarLayout = useCallback((e: LayoutChangeEvent) => {
    setFilterBarHeight(e.nativeEvent.layout.height);
  }, []);

  const filterScrollTopPad = batchSelect.isSelectMode ? 0 : filterBarHeight;

  const mergedListContentStyle = useMemo(() => {
    const base = listContentStyle as { paddingTop?: number };
    const prevTop = typeof base.paddingTop === 'number' ? base.paddingTop : 0;
    return {
      ...listContentStyle,
      paddingTop: prevTop + filterScrollTopPad,
    };
  }, [listContentStyle, filterScrollTopPad]);

  const swipeListHeader = useMemo(() => {
    if (!showSwipeHint || batchSelect.isSelectMode) {
      return undefined;
    }
    return (
      <View style={{ marginTop: showInboxSearchBar ? 4 : 0, marginBottom: 4 }}>
        <SwipeHintBanner onDismiss={onDismissSwipeHint} />
      </View>
    );
  }, [batchSelect.isSelectMode, onDismissSwipeHint, showInboxSearchBar, showSwipeHint]);

  const stickyClosedOffset = insetsBottom;

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
              <InboxFilterBar
                filterStatus={filterStatus}
                menuFilterStatus={menuFilterStatus}
                sortOption={sortOption}
                onFilterChange={onFilterChange}
                onMenuFilterChange={onMenuFilterChange}
                onSortChange={onSortChange}
                color={color}
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
              {showSwipeHint && !batchSelect.isSelectMode && (
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
                extraData={batchSelect.selectedIds}
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
        <KeyboardStickyView
          offset={{ closed: -stickyClosedOffset, opened: 0 }}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
        >
          <StickySearchBar
            query={query}
            onChangeQuery={onChangeQuery}
            color={color}
            focusSignal={searchFocusSignal}
            insetsBottom={insetsBottom}
            onClose={onSearchCleared}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            focused={searchFocused}
          />
        </KeyboardStickyView>
      )}
    </View>
  );
}

export const InboxScreenLoadedBody = memo(InboxScreenLoadedBodyInner);
