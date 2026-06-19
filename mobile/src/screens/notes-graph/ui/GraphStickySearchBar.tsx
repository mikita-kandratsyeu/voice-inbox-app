import { ChevronDown, ChevronUp, Search, X } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { iosHitSlopForVisualSize } from '@/shared/lib/iosTouchTarget';
import {
  FLOATING_FROSTED_INPUT_ICON_SIZE,
  FLOATING_FROSTED_INPUT_ICON_STROKE,
  FloatingFrostedChromeDivider,
  FloatingFrostedChromeSection,
  FloatingFrostedInputChrome,
  getFloatingFrostedInputContainerStyle,
  getFloatingFrostedInputFieldRowStyle,
  getFloatingFrostedInputRowStyle,
  getInputFieldInputStyle,
  HeaderIconButton,
} from '@/shared/ui';

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
  onClose: () => void;
};

export const GraphStickySearchBar = memo(function GraphStickySearchBar({
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
  onClose,
}: GraphStickySearchBarProps) {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const hasMatches = matchCount > 0 && matchIndex != null;
  const isSearchPending = query !== debouncedQuery;

  const currentMatchLabel = useMemo(() => {
    if (hasMatches) {
      return t('notesGraph.searchResultCount', { current: matchIndex + 1, total: matchCount });
    }
    if (isSearchPending) {
      return null;
    }
    if (debouncedQuery.trim()) {
      return t('notesGraph.searchNoResults');
    }
    return null;
  }, [hasMatches, isSearchPending, debouncedQuery, matchIndex, matchCount, t]);

  useEffect(() => {
    if (focusSignal <= 0) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());

    return () => cancelAnimationFrame(id);
  }, [focusSignal]);

  const handleClear = useCallback(() => {
    onChangeQuery('');
    inputRef.current?.focus();
  }, [onChangeQuery]);

  const matchNav = hasMatches ? (
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
  ) : null;

  const closeButton = (
    <HeaderIconButton
      iconOnly
      variant="icon"
      size="md"
      icon={<X size={22} color={color.text.secondary} strokeWidth={2.2} />}
      color={color}
      onPress={onClose}
      accessibilityLabel={t('search.a11yHide')}
    />
  );

  const showMatchLabel = currentMatchLabel != null;

  return (
    <FloatingFrostedInputChrome color={color}>
      <View
        style={{
          ...getFloatingFrostedInputContainerStyle(),
          gap: showMatchLabel ? 8 : 0,
        }}
      >
        <View style={getFloatingFrostedInputRowStyle()}>
          <View style={getFloatingFrostedInputFieldRowStyle()}>
            <Search
              size={FLOATING_FROSTED_INPUT_ICON_SIZE}
              color={focused || query ? color.accent.primary : color.icon.muted}
              strokeWidth={FLOATING_FROSTED_INPUT_ICON_STROKE}
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
            {query.length > 0 ? (
              isSearchPending ? (
                <Animated.View
                  entering={FadeIn.duration(150)}
                  exiting={FadeOut.duration(150)}
                  style={{
                    width: 16,
                    height: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ActivityIndicator size="small" color={color.accent.primary} />
                </Animated.View>
              ) : (
                <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
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
                </Animated.View>
              )
            ) : null}
          </View>

          {hasMatches ? (
            <>
              <FloatingFrostedChromeDivider color={color} />
              <FloatingFrostedChromeSection>{matchNav}</FloatingFrostedChromeSection>
            </>
          ) : null}

          <FloatingFrostedChromeDivider color={color} />
          <FloatingFrostedChromeSection>{closeButton}</FloatingFrostedChromeSection>
        </View>

        {showMatchLabel ? (
          <View
            style={{
              minHeight: GRAPH_STICKY_SEARCH_MATCH_LABEL_HEIGHT,
              justifyContent: 'center',
              paddingHorizontal: 4,
            }}
          >
            <Text style={{ color: color.text.secondary, fontSize: 12, fontWeight: '600' }}>
              {currentMatchLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </FloatingFrostedInputChrome>
  );
});
