import { SearchX } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type EmptySearchStateProps = {
  query: string;
  color: Colors;
};

export const EmptySearchState = ({ query, color }: EmptySearchStateProps) => {
  const { t } = useTranslation();
  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
    >
      <View
        className="mb-4 rounded-full p-5"
        style={{ backgroundColor: color.background.tertiary }}
      >
        <SearchX size={40} color={color.icon.muted} strokeWidth={1.5} />
      </View>
      <Text
        className="mb-2 text-center text-lg font-semibold"
        style={{ color: color.text.primary }}
      >
        {t('search.nothingFound')}
      </Text>
      <Text className="text-center text-sm leading-5" style={{ color: color.text.secondary }}>
        {t('search.nothingFoundFor', { query })}
      </Text>
    </View>
  );
};
