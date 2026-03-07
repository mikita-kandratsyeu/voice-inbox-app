import { Inbox } from 'lucide-react-native';
import React from 'react';
import { Text, useColorScheme, View } from 'react-native';

import { getColors } from '@/shared/config';

type EmptyStateProps = {
  title?: string;
  description?: string;
};

export const EmptyState = ({
  title = 'Нет записей',
  description = 'Здесь будут отображаться ваши входящие голосовые заметки',
}: EmptyStateProps) => {
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');

  return (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className="mb-4 rounded-full p-5"
        style={{ backgroundColor: color.background.tertiary }}
      >
        <Inbox size={40} color={color.icon.muted} strokeWidth={1.5} />
      </View>
      <Text
        className="mb-2 text-center text-lg font-semibold"
        style={{ color: color.text.primary }}
      >
        {title}
      </Text>
      <Text className="text-center text-sm leading-5" style={{ color: color.text.secondary }}>
        {description}
      </Text>
    </View>
  );
};
