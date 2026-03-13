import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import React, { useCallback, useEffect, useRef } from 'react';
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
  const { records, archiveRecord, unarchiveRecord, togglePin, isLoaded } = useRecordStore();

  const {
    query,
    setQuery,
    flattenedData,
    filtered,
    subtitleText,
    isSearching,
    filterStatus,
    setFilterStatus,
    sortOption,
    setSortOption,
    resetToDefault,
  } = useSearchRecords(records);

  const listRef = useRef<FlashListRef<FlattenedItem>>(null);
  const inboxFiltersReset = useInboxFiltersReset();

  useEffect(() => {
    if (!inboxFiltersReset) return;
    return inboxFiltersReset.registerReset(resetToDefault);
  }, [inboxFiltersReset, resetToDefault]);

  useFocusEffect(
    useCallback(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, []),
  );

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [filterStatus]);

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
        return <SectionHeader title={item.title} isFirst={item.isFirst} />;
      }
      const isArchivedView = filterStatus === 'archived';
      return (
        <SwipeableCard
          isPinned={item.item.isPinned}
          leftAction={isArchivedView ? 'unarchive' : 'archive'}
          onLeftAction={() =>
            isArchivedView ? unarchiveRecord(item.item.id) : archiveRecord(item.item.id)
          }
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
    [
      color,
      filterStatus,
      archiveRecord,
      unarchiveRecord,
      togglePin,
      handleRecordPress,
      handleStatusPress,
    ],
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

  return (
    <View style={screenStyle}>
      <InboxHeader
        color={color}
        isLoaded={isLoaded}
        subtitleText={subtitleText}
        title={t('inbox.title')}
      />
      {!isLoaded ? (
        <InboxSkeleton color={color} />
      ) : records.length === 0 ? (
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
          ) : filtered.length === 0 ? (
            <EmptyState
              title={t('inbox.emptyFilterTitle')}
              description={t('inbox.emptyFilterDescription')}
            />
          ) : (
            <FlashList
              ref={listRef}
              key={filterStatus}
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
