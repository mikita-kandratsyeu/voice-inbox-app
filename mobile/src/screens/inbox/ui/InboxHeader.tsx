import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Colors } from '@/shared/config';

type InboxHeaderProps = {
  color: Colors;
  isLoaded: boolean;
  totalCount: number;
  filteredCount: number;
  isSearching: boolean;
};

export const InboxHeader = ({
  color,
  isLoaded,
  totalCount,
  filteredCount,
  isSearching,
}: InboxHeaderProps) => {
  const insets = useSafeAreaInsets();

  const headerStyle = {
    backgroundColor: color.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: color.border.default,
    paddingTop: insets.top + 16,
  };
  const titleStyle = { color: color.text.primary };
  const subtitleStyle = { color: color.text.secondary };

  return (
    <View className="px-4 pb-3" style={headerStyle}>
      <Text className="text-2xl font-bold" style={titleStyle}>
        Входящие
      </Text>
      {isLoaded ? (
        <Text className="mt-1 text-sm" style={subtitleStyle}>
          {isSearching ? `${filteredCount} из ${totalCount} записей` : `${totalCount} записей`}
        </Text>
      ) : (
        <View
          className="mt-2 h-3 w-20 rounded-full"
          style={{ backgroundColor: color.background.tertiary }}
        />
      )}
    </View>
  );
};
