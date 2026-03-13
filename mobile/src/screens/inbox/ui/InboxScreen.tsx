import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlashList } from '@shopify/flash-list';
import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { RecordCard, useRecordStore } from '@/entities/record';
import { InboxFilterBar, useInboxFiltersReset } from '@/features/inbox-filters';
import { SearchBar, useSearchRecords } from '@/features/search-records';
import { getColors, useAppTheme } from '@/shared/config';
import { EmptyState, SectionHeader, SwipeableCard } from '@/shared/ui';

import { EmptySearchState } from './EmptySearchState';
import { InboxHeader } from './InboxHeader';
import { InboxSkeleton } from './InboxSkeleton';

type FlattenedItem =
  | { type: 'header'; title: string; isFirst: boolean }
  | { type: 'record'; item: VoiceRecord };

export const InboxScreen = () => {
  const { t } = useTranslation();
  const color = getColors(useAppTheme());
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { records, deleteRecord, togglePin, isLoaded } = useRecordStore();

  const {
    query,
    setQuery,
    flattenedData,
    filtered,
    isSearching,
    filterStatus,
    setFilterStatus,
    sortOption,
    setSortOption,
    resetToDefault,
  } = useSearchRecords(records);

  const inboxFiltersReset = useInboxFiltersReset();
  useEffect(() => {
    if (!inboxFiltersReset) return;
    return inboxFiltersReset.registerReset(resetToDefault);
  }, [inboxFiltersReset, resetToDefault]);

  const handleStatusPress = useCallback(
    (item: VoiceRecord) => {
      if (item.aiStatus === 'processing' || item.aiStatus === 'error' || item.aiStatus === 'idle') {
        navigation.navigate('RecordingDetail', { record: item });
      }
    },
    [navigation],
  );

  const handleRecordPress = useCallback(
    (item: VoiceRecord) => {
      navigation.navigate('RecordingDetail', { record: item });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: FlattenedItem }) => {
      if (item.type === 'header') {
        return <SectionHeader title={item.title} color={color} isFirst={item.isFirst} />;
      }
      return (
        <SwipeableCard
          isPinned={item.item.isPinned}
          onDelete={() => deleteRecord(item.item.id)}
          onPin={() => togglePin(item.item.id)}
        >
          <RecordCard
            item={item.item}
            color={color}
            onPress={() => handleRecordPress(item.item)}
            onStatusPress={() => handleStatusPress(item.item)}
          />
        </SwipeableCard>
      );
    },
    [color, deleteRecord, togglePin, handleRecordPress, handleStatusPress],
  );

  const getItemType = useCallback((item: FlattenedItem) => item.type, []);

  const keyExtractor = useCallback((item: FlattenedItem) => {
    if (item.type === 'header') return `header-${item.title}`;
    return item.item.id;
  }, []);

  const screenStyle = { flex: 1, backgroundColor: color.background.primary };
  const listContentStyle = {
    paddingBottom: 100,
    paddingTop: 0,
    backgroundColor: color.background.secondary,
  };
  const listStyle = { backgroundColor: color.background.secondary };

  const totalCount = records.length;

  return (
    <View style={screenStyle}>
      <InboxHeader
        color={color}
        isLoaded={isLoaded}
        totalCount={totalCount}
        filteredCount={filtered.length}
        isSearching={isSearching}
      />
      {!isLoaded ? (
        <InboxSkeleton color={color} />
      ) : totalCount === 0 ? (
        <EmptyState title={t('inbox.emptyTitle')} description={t('inbox.emptyDescription')} />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: color.background.secondary }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <SearchBar query={query} onChangeQuery={setQuery} color={color} />
          <InboxFilterBar
            filterStatus={filterStatus}
            sortOption={sortOption}
            onFilterChange={setFilterStatus}
            onSortChange={setSortOption}
            color={color}
          />
          {isSearching && filtered.length === 0 ? (
            <EmptySearchState query={query} color={color} />
          ) : filterStatus !== 'all' && filtered.length === 0 ? (
            <EmptyState
              title={t('inbox.emptyFilterTitle')}
              description={t('inbox.emptyFilterDescription')}
            />
          ) : (
            <FlashList
              data={flattenedData}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              getItemType={getItemType}
              contentContainerStyle={listContentStyle}
              style={listStyle}
              showsVerticalScrollIndicator={false}
            />
          )}
        </KeyboardAvoidingView>
      )}
    </View>
  );
};
