import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

export type ModelMetaChip = {
  key: string;
  label: string;
  variant?: 'default' | 'accent';
};

type ModelMetaChipsProps = {
  chips: ModelMetaChip[];
  color: Colors;
  className?: string;
};

export const ModelMetaChips = ({ chips, color, className }: ModelMetaChipsProps) => {
  if (chips.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      nestedScrollEnabled
      className={className}
      contentContainerClassName="flex-row items-center gap-2"
    >
      {chips.map((chip) => {
        const accent = chip.variant === 'accent';
        return (
          <View
            key={chip.key}
            className="rounded-full px-2 py-0.5"
            style={{
              backgroundColor: accent ? color.status.processing.bg : color.background.tertiary,
            }}
          >
            <Text
              className="text-[12px] font-medium"
              numberOfLines={1}
              style={{ color: accent ? color.status.processing.text : color.text.secondary }}
            >
              {chip.label}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
};
