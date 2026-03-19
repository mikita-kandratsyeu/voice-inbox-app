import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, LayoutAnimation, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import type { BottomTabParamList, RootStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { RecordCard, useRecordStore } from '@/entities/record';
import { InboxFilterBar, useInboxFiltersReset } from '@/features/inbox-filters';
import { SearchBar, useSearchRecords } from '@/features/search-records';
import { getColors, useAppTheme } from '@/shared/config';
import { keyboardAvoidingBehavior, keyboardVerticalOffset, useIsTablet } from '@/shared/lib';
import { getHasSeenSwipeHint, setHasSeenSwipeHint } from '@/shared/lib/hintsStorage';
import { EmptyState, SectionHeader, SwipeableCard, SwipeHintBanner } from '@/shared/ui';

import { EmptySearchState } from './EmptySearchState';
import { InboxHeader } from './InboxHeader';
import { InboxSkeleton } from './InboxSkeleton';

type FlattenedItem =
  | { type: 'header'; title: string; isFirst: boolean }
  | { type: 'record'; item: VoiceRecord };

type InboxNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, 'Inbox'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const InboxScreen = () => {
  const { t } = useTranslation();
  const color = getColors(useAppTheme());
  const isTablet = useIsTablet();
  const navigation = useNavigation<InboxNavigationProp>();
  const { records, isLoaded, archiveRecord, unarchiveRecord, togglePin } = useRecordStore(
    useShallow((s) => ({
      records: s.records,
      isLoaded: s.isLoaded,
      archiveRecord: s.archiveRecord,
      unarchiveRecord: s.unarchiveRecord,
      togglePin: s.togglePin,
    })),
  );

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
  const [showSwipeHint, setShowSwipeHint] = useState(() => !getHasSeenSwipeHint());

  const dismissSwipeHint = useCallback(() => {
    setHasSeenSwipeHint();
    setShowSwipeHint(false);
  }, []);

  useEffect(() => {
    if (!inboxFiltersReset) return;
    return inboxFiltersReset.registerReset(resetToDefault);
  }, [inboxFiltersReset, resetToDefault]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [filterStatus]);

  const handleStatusPress = useCallback(
    (item: VoiceRecord) => {
      if (
        item.aiStatus === 'loading_model' ||
        item.aiStatus === 'processing' ||
        item.aiStatus === 'error' ||
        item.aiStatus === 'idle'
      ) {
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
          onLeftAction={() => {
            dismissSwipeHint();
            listRef.current?.prepareForLayoutAnimationRender();
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            isArchivedView ? unarchiveRecord(item.item.id) : archiveRecord(item.item.id);
          }}
          onPin={() => {
            dismissSwipeHint();
            togglePin(item.item.id);
          }}
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
      dismissSwipeHint,
      archiveRecord,
      unarchiveRecord,
      togglePin,
      handleRecordPress,
      handleStatusPress,
    ],
  );

  const getItemType = useCallback((item: FlattenedItem) => item.type, []);

  const keyExtractor = useCallback((item: FlattenedItem) => {
    if (item.type === 'header') {
      return `header-${item.title}`;
    }

    return item.item.id;
  }, []);

  const screenStyle = { flex: 1, backgroundColor: color.background.primary };
  const contentMaxWidth = isTablet ? 720 : undefined;

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
        <EmptyState
          title={t('inbox.emptyTitle')}
          description={t('inbox.emptyDescription')}
          hint={t('inbox.emptyImportHint')}
        />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: color.background.secondary }}
          behavior={keyboardAvoidingBehavior}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          <View style={{ flex: 1, alignSelf: 'center', width: '100%', maxWidth: contentMaxWidth }}>
            <SearchBar query={query} onChangeQuery={setQuery} color={color} />
            {showSwipeHint ? <SwipeHintBanner onDismiss={dismissSwipeHint} /> : null}
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
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};
