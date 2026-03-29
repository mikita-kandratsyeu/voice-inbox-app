import type { FlashListRef } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import { Folder } from 'lucide-react-native';
import React, { memo } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { BatchSelectState } from '@/features/batch-select';
import type { InboxFilterStatus, InboxSortOption } from '@/features/inbox-filters';
import { InboxFilterBar } from '@/features/inbox-filters';
import { SearchBar } from '@/features/search-records';
import type { Colors } from '@/shared/config';
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '@/shared/lib';
import { EmptyState, SwipeHintBanner } from '@/shared/ui';

import type { FlattenedItem } from '../lib/inboxScreenTypes';
import { EmptySearchState } from './EmptySearchState';
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
  sortOption: InboxSortOption;
  onFilterChange: (s: InboxFilterStatus) => void;
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
  filterStatusKey: InboxFilterStatus;
  pagedFlattenedData: FlattenedItem[];
  listContentStyle: object;
  listStyle: object;
  onEndReached: () => void;
  renderListItem: (props: { item: FlattenedItem }) => React.ReactElement;
  keyExtractor: (item: FlattenedItem) => string;
  getItemType: (item: FlattenedItem) => FlattenedItem['type'];
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
  sortOption,
  onFilterChange,
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
}: InboxScreenLoadedBodyProps) {
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
            filteredLength === 0 ? getFloatingTabBarScrollPaddingBottom(insetsBottom, isTablet) : 0,
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
        {!batchSelect.isSelectMode && (
          <InboxFilterBar
            filterStatus={filterStatus}
            sortOption={sortOption}
            onFilterChange={onFilterChange}
            onSortChange={onSortChange}
            color={color}
          />
        )}
        {showSwipeHint && !batchSelect.isSelectMode && (
          <View style={{ marginTop: showInboxSearchBar ? 4 : 0 }}>
            <SwipeHintBanner onDismiss={onDismissSwipeHint} />
          </View>
        )}
        {isSearching && filteredLength === 0 ? (
          <EmptySearchState query={query} color={color} verticalPlacement={emptyStatePlacement} />
        ) : filteredLength === 0 ? (
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
        ) : (
          <FlashList
            ref={listRef}
            key={String(filterStatusKey)}
            data={pagedFlattenedData}
            renderItem={renderListItem}
            keyExtractor={keyExtractor}
            getItemType={getItemType}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.35}
            contentContainerStyle={listContentStyle}
            style={listStyle}
            showsVerticalScrollIndicator={false}
            extraData={batchSelect.selectedIds}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

export const InboxScreenLoadedBody = memo(InboxScreenLoadedBodyInner);
