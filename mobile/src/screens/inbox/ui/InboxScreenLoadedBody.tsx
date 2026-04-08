import type { FlashListRef } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import { Folder } from 'lucide-react-native';
import React, { memo, useCallback, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { KeyboardAvoidingView, View } from 'react-native';

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
import { SearchBar } from '@/features/search-records';
import type { Colors } from '@/shared/config';
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '@/shared/lib';
import { EmptyState, SwipeHintBanner } from '@/shared/ui';

import type { FlattenedItem } from '../lib/inboxScreenTypes';
import { EmptySearchState } from './EmptySearchState';
import { InboxSkeleton } from './InboxSkeleton';

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
  showTabScrollResetSkeleton: boolean;
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
  showTabScrollResetSkeleton,
}: InboxScreenLoadedBodyProps) {
  const [filterBarHeight, setFilterBarHeight] = useState(INBOX_FILTER_BAR_FALLBACK_HEIGHT);

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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: color.background.secondary }}
      behavior={keyboardAvoidingBehavior}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
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
        {showInboxSearchBar && (
          <SearchBar
            query={query}
            onChangeQuery={onChangeQuery}
            color={color}
            variant="compact"
            focusSignal={searchFocusSignal}
            onCleared={onSearchCleared}
          />
        )}
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
                contentContainerStyle={mergedListContentStyle}
                style={[listStyle, { flex: 1 }]}
                showsVerticalScrollIndicator={false}
                extraData={batchSelect.selectedIds}
                ListHeaderComponent={swipeListHeader}
                maintainVisibleContentPosition={{ disabled: true }}
              />
              {showTabScrollResetSkeleton && (
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
    </KeyboardAvoidingView>
  );
}

export const InboxScreenLoadedBody = memo(InboxScreenLoadedBodyInner);
