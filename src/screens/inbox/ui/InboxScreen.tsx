import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { SectionList, useColorScheme, View } from 'react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { RecordCard, useRecordStore } from '@/entities/record';
import { SearchBar, useSearchRecords } from '@/features/search-records';
import { getColors } from '@/shared/config';
import { EmptyState, SectionHeader, SwipeableCard } from '@/shared/ui';

import { EmptySearchState } from './EmptySearchState';
import { InboxHeader } from './InboxHeader';
import { InboxSkeleton } from './InboxSkeleton';

export const InboxScreen = () => {
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { records, deleteRecord, togglePin, isLoaded, updateAiStatus } = useRecordStore();

  const { query, setQuery, sections, filtered, isSearching } = useSearchRecords(records);

  const handleStatusPress = (item: VoiceRecord) => {
    switch (item.aiStatus) {
      case 'idle':
        console.warn(updateAiStatus);
        break;
      case 'processing':
        navigation.navigate('RecordingDetail', { record: item });
        break;
      case 'error':
        console.warn(updateAiStatus);
        break;
      case 'done':
        navigation.navigate('RecordingDetail', { record: item });
        break;
    }
  };

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
        <EmptyState
          title="Нет входящих"
          description="Здесь будут отображаться ваши входящие голосовые сообщения"
        />
      ) : (
        <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
          <SearchBar query={query} onChangeQuery={setQuery} color={color} />
          {isSearching && filtered.length === 0 ? (
            <EmptySearchState query={query} color={color} />
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <SwipeableCard
                  isPinned={item.isPinned}
                  onDelete={() => deleteRecord(item.id)}
                  onPin={() => togglePin(item.id)}
                >
                  <RecordCard
                    item={item}
                    color={color}
                    onPress={() => navigation.navigate('RecordingDetail', { record: item })}
                    onStatusPress={() => handleStatusPress(item)}
                  />
                </SwipeableCard>
              )}
              renderSectionHeader={({ section }) => (
                <SectionHeader
                  title={section.title}
                  color={color}
                  isFirst={section.title === sections[0]?.title}
                />
              )}
              stickySectionHeadersEnabled={false}
              contentContainerStyle={listContentStyle}
              style={listStyle}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}
    </View>
  );
};
