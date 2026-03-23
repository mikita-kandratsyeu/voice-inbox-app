import { Inbox, Upload } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { useColors } from '@/shared/config';

type EmptyStateProps = {
  title?: string;
  description?: string;
  hint?: string;
};

export const EmptyState = ({ title, description, hint }: EmptyStateProps) => {
  const color = useColors();

  return (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className="mb-4 rounded-full p-5"
        style={{ backgroundColor: color.background.tertiary }}
      >
        <Inbox size={40} color={color.icon.muted} strokeWidth={1.5} />
      </View>
      {Boolean(title) && (
        <Text
          className="mb-2 text-center text-lg font-semibold"
          style={{ color: color.text.primary }}
        >
          {title}
        </Text>
      )}
      {Boolean(description) && (
        <Text className="text-center text-sm leading-5" style={{ color: color.text.secondary }}>
          {description}
        </Text>
      )}
      {hint && (
        <View
          className="mt-8 max-w-sm flex-row items-center rounded-xl px-4 py-3"
          style={{ backgroundColor: color.background.tertiary }}
        >
          <Upload
            size={20}
            color={color.accent.primary}
            strokeWidth={2}
            style={{ marginRight: 12 }}
          />
          <Text className="flex-1 text-sm leading-5" style={{ color: color.text.secondary }}>
            {hint}
          </Text>
        </View>
      )}
    </View>
  );
};
