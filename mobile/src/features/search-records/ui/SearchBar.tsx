import { Search, X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { iosHitSlopForVisualSize } from '@/shared/lib/iosTouchTarget';
import { getInputFieldInputStyle, InputField } from '@/shared/ui';

type SearchBarProps = {
  query: string;
  onChangeQuery: (text: string) => void;
  color: Colors;
  placeholder?: string;
  variant?: 'default' | 'compact';
  focusSignal?: number;
  onCleared?: () => void;
};

export const SearchBar = ({
  query,
  onChangeQuery,
  color,
  placeholder,
  variant = 'default',
  focusSignal = 0,
  onCleared,
}: SearchBarProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (focusSignal <= 0) {
      return;
    }

    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [focusSignal]);

  const searchIcon = (
    <Search size={16} color={query ? color.accent.primary : color.icon.muted} strokeWidth={2} />
  );

  const clearButton =
    query.length > 0 ? (
      <TouchableOpacity
        onPress={() => {
          onChangeQuery('');
          if (onCleared) {
            onCleared();
          } else {
            inputRef.current?.focus();
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={t('common.clear')}
        hitSlop={iosHitSlopForVisualSize(16, 16)}
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

  const containerClassName = variant === 'compact' ? 'mx-4 mt-2.5' : 'mx-4 mt-6 mb-2.5';

  return (
    <View className={containerClassName}>
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
          accessibilityLabel={placeholder ?? t('search.placeholder')}
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
