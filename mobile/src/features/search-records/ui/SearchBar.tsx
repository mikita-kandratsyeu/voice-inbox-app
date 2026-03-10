import { Search, X } from 'lucide-react-native';
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';

type SearchBarProps = {
  query: string;
  onChangeQuery: (text: string) => void;
  color: Colors;
  placeholder?: string;
};

export const SearchBar = ({ query, onChangeQuery, color, placeholder }: SearchBarProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);

  return (
    <View
      className="mx-4 my-6 flex-row items-center gap-2 rounded-xl px-3 py-4"
      style={{
        backgroundColor: color.background.tertiary,
        borderWidth: 1,
        borderColor: query ? color.accent.primary : color.border.default,
      }}
    >
      <Search size={16} color={query ? color.accent.primary : color.icon.muted} strokeWidth={2} />
      <TextInput
        ref={inputRef}
        style={{
          flex: 1,
          fontSize: 16,
          color: color.text.primary,
          paddingVertical: 0,
          margin: 0,
          textAlignVertical: 'center',
          includeFontPadding: false,
        }}
        placeholder={placeholder ?? t('search.placeholder')}
        placeholderTextColor={color.text.secondary}
        value={query}
        onChangeText={onChangeQuery}
        returnKeyType="search"
        clearButtonMode="never"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {query.length > 0 && (
        <TouchableOpacity
          onPress={() => {
            onChangeQuery('');
            inputRef.current?.focus();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <View
            className="h-4 w-4 items-center justify-center rounded-full"
            style={{ backgroundColor: color.icon.muted }}
          >
            <X size={10} color={color.background.primary} strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};
