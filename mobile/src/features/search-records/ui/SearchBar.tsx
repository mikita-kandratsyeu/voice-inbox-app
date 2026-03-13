import { Search, X } from 'lucide-react-native';
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { getInputFieldInputStyle, InputField } from '@/shared/ui';

type SearchBarProps = {
  query: string;
  onChangeQuery: (text: string) => void;
  color: Colors;
  placeholder?: string;
};

export const SearchBar = ({ query, onChangeQuery, color, placeholder }: SearchBarProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);

  const searchIcon = (
    <Search size={16} color={query ? color.accent.primary : color.icon.muted} strokeWidth={2} />
  );

  const clearButton =
    query.length > 0 ? (
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
    ) : undefined;

  return (
    <View className="mx-4 my-6">
      <InputField
        color={color}
        hasValue={Boolean(query)}
        leftIcon={searchIcon}
        rightElement={clearButton}
      >
        <TextInput
          ref={inputRef}
          style={getInputFieldInputStyle(color)}
          placeholder={placeholder ?? t('search.placeholder')}
          placeholderTextColor={color.text.secondary}
          value={query}
          onChangeText={onChangeQuery}
          returnKeyType="search"
          clearButtonMode="never"
          autoCapitalize="none"
        />
      </InputField>
    </View>
  );
};
