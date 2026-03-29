import { SearchX } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type EmptySearchStateProps = {
  query: string;
  color: Colors;
  verticalPlacement?: 'center' | 'top';
};

const MIN_QUERY_LENGTH = 3;

export const EmptySearchState = ({
  query,
  color,
  verticalPlacement = 'center',
}: EmptySearchStateProps) => {
  const { t } = useTranslation();
  const isShortQuery = query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH;
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: verticalPlacement === 'top' ? 'flex-start' : 'center',
        paddingHorizontal: 32,
        paddingTop: verticalPlacement === 'top' ? 48 : 0,
      }}
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
        {isShortQuery ? t('search.typeMoreChars') : t('search.nothingFound')}
      </Text>
      <Text className="text-center text-sm leading-5" style={{ color: color.text.secondary }}>
        {isShortQuery
          ? t('search.typeMoreCharsHint', { count: MIN_QUERY_LENGTH })
          : t('search.nothingFoundFor', { query })}
      </Text>
    </View>
  );
};
