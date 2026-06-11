import { ChevronDown, ChevronUp, Search, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
import { iosHitSlopForVisualSize } from '@/shared/lib/iosTouchTarget';
import { FrostedBottomChrome, getInputFieldInputStyle, HeaderIconButton } from '@/shared/ui';

import { GRAPH_STICKY_SEARCH_MATCH_LABEL_HEIGHT } from '../lib/graphViewportInsets';

type GraphStickySearchBarProps = {
  query: string;
  debouncedQuery: string;
  onChangeQuery: (text: string) => void;
  onSubmit: () => void;
  matchCount: number;
  matchIndex: number | null;
  onPreviousMatch: () => void;
  onNextMatch: () => void;
  color: Colors;
  focusSignal: number;
  insetsBottom: number;
  onClose: () => void;
};

export function GraphStickySearchBar({
  query,
  debouncedQuery,
  onChangeQuery,
  onSubmit,
  matchCount,
  matchIndex,
  onPreviousMatch,
  onNextMatch,
  color,
  focusSignal,
  insetsBottom,
  onClose,
}: GraphStickySearchBarProps) {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const hasMatches = matchCount > 0 && matchIndex != null;
  const isSearchPending = query !== debouncedQuery;
  const currentMatchLabel = hasMatches
    ? t('notesGraph.searchResultCount', { current: matchIndex + 1, total: matchCount })
    : isSearchPending
      ? null
      : debouncedQuery.trim()
        ? t('notesGraph.searchNoResults')
        : null;

  useEffect(() => {
    if (focusSignal <= 0) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());

    return () => cancelAnimationFrame(id);
  }, [focusSignal]);

  const handleClear = () => {
    onChangeQuery('');
    inputRef.current?.focus();
  };

  return (
    <FrostedBottomChrome
      color={color}
      insetsBottom={insetsBottom}
      contentStyle={{
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 14,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 9,
            backgroundColor: color.background.tertiary,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: IS_IOS ? 11 : 9,
            borderWidth: focused ? 2 : 1.5,
            borderColor: focused ? color.accent.primary : color.border.default,
            shadowColor: color.shadow.color,
            shadowOpacity: focused ? color.shadow.opacity * 0.4 : 0,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: focused ? 2 : 0,
          }}
        >
          <Search
            size={17}
            color={focused || query ? color.accent.primary : color.icon.muted}
            strokeWidth={2.2}
          />
          <TextInput
            ref={inputRef}
            style={[getInputFieldInputStyle(color), { flex: 1 }]}
            placeholder={t('notesGraph.searchPlaceholder')}
            placeholderTextColor={color.text.secondary}
            value={query}
            onChangeText={onChangeQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={onSubmit}
            returnKeyType="search"
            clearButtonMode="never"
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              hitSlop={iosHitSlopForVisualSize(16, 16)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('common.clear')}
            >
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: color.icon.muted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={10} color={color.background.primary} strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {hasMatches ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <HeaderIconButton
              iconOnly
              variant="icon"
              size="md"
              icon={<ChevronUp size={20} color={color.text.primary} strokeWidth={2.2} />}
              color={color}
              onPress={onPreviousMatch}
              accessibilityLabel={t('notesGraph.searchPrevious')}
            />
            <HeaderIconButton
              iconOnly
              variant="icon"
              size="md"
              icon={<ChevronDown size={20} color={color.text.primary} strokeWidth={2.2} />}
              color={color}
              onPress={onNextMatch}
              accessibilityLabel={t('notesGraph.searchNext')}
            />
          </View>
        ) : null}

        <HeaderIconButton
          iconOnly
          variant="icon"
          size="md"
          icon={<X size={22} color={color.text.secondary} strokeWidth={2.2} />}
          color={color}
          onPress={onClose}
          accessibilityLabel={t('search.a11yHide')}
        />
      </View>

      <View
        style={{
          minHeight: GRAPH_STICKY_SEARCH_MATCH_LABEL_HEIGHT,
          justifyContent: 'center',
          paddingHorizontal: 4,
        }}
      >
        {currentMatchLabel ? (
          <Text style={{ color: color.text.secondary, fontSize: 12, fontWeight: '600' }}>
            {currentMatchLabel}
          </Text>
        ) : null}
      </View>
    </FrostedBottomChrome>
  );
}
