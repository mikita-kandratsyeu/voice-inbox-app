import { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { Check, Search, Tag, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { hapticSelection, IS_IOS } from '@/shared/lib';
import {
  AppBottomSheetModal,
  getInputFieldInputStyle,
  SheetFooterButtons,
  useBottomSheetContentPadding,
} from '@/shared/ui';

const TAG_PICKER_LIST_MAX_HEIGHT = 420;
const TAG_PICKER_ROW_HEIGHT = 52;

type TagPickerSheetProps = {
  visible: boolean;
  title: string;
  tags: string[];
  selectedTags: string[];
  onClose: () => void;
  onApply: (tags: string[]) => void;
};

function normalizeSearchQuery(value: string): string {
  return value.trim().toLowerCase();
}

function matchesSearchQuery(value: string, query: string): boolean {
  if (!query) return true;
  return value.toLowerCase().includes(query);
}

function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim();
}

type TagPickerRowProps = {
  tag: string;
  selected: boolean;
  color: Colors;
  isLast: boolean;
  onPress: () => void;
};

function TagPickerRow({ tag, selected, color, isLast, onPress }: TagPickerRowProps) {
  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={tag}
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        backgroundColor: pressed ? color.background.tertiary : 'transparent',
        borderBottomColor: color.border.default,
        borderBottomWidth: isLast ? 0 : 1,
        width: '100%',
      })}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 12,
          minHeight: TAG_PICKER_ROW_HEIGHT,
          paddingHorizontal: 14,
          paddingVertical: 10,
          width: '100%',
        }}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: color.background.tertiary,
            borderRadius: 10,
            flexShrink: 0,
            height: 36,
            justifyContent: 'center',
            width: 36,
          }}
        >
          <Tag size={18} color={color.text.secondary} strokeWidth={2} />
        </View>
        <Text
          style={{ color: color.text.primary, flex: 1, fontSize: 16, fontWeight: '600', lineHeight: 21 }}
          numberOfLines={1}
        >
          {tag}
        </Text>
        {selected ? (
          <Check size={20} color={color.accent.primary} strokeWidth={2.5} />
        ) : (
          <View style={{ width: 20 }} />
        )}
      </View>
    </Pressable>
  );
}

export function TagPickerSheet({
  visible,
  title,
  tags,
  selectedTags,
  onClose,
  onApply,
}: TagPickerSheetProps) {
  const { t } = useTranslation();
  const color = useColors();
  const contentPadding = useBottomSheetContentPadding(12);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [draftTags, setDraftTags] = useState<string[]>(selectedTags);

  useEffect(() => {
    if (!visible) return;
    setDraftTags(selectedTags);
    setQuery('');
    setFocused(false);
  }, [selectedTags, visible]);

  const sortedTags = useMemo(
    () => [...tags].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [tags],
  );

  const normalizedQuery = useMemo(() => normalizeSearchQuery(query), [query]);

  const filteredTags = useMemo(
    () => sortedTags.filter((tag) => matchesSearchQuery(tag, normalizedQuery)),
    [normalizedQuery, sortedTags],
  );

  const selectedSet = useMemo(
    () => new Set(draftTags.map(normalizeTag)),
    [draftTags],
  );

  const handleClose = useCallback(() => {
    setQuery('');
    setFocused(false);
    onClose();
  }, [onClose]);

  const toggleTag = useCallback((tag: string) => {
    const normalized = normalizeTag(tag);
    setDraftTags((prev) => {
      const has = prev.some((item) => normalizeTag(item) === normalized);
      return has
        ? prev.filter((item) => normalizeTag(item) !== normalized)
        : [...prev, tag];
    });
  }, []);

  const handleApply = useCallback(() => {
    onApply(draftTags);
    handleClose();
  }, [draftTags, handleClose, onApply]);

  const handleClear = useCallback(() => {
    setDraftTags([]);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: string; index: number }) => (
      <TagPickerRow
        tag={item}
        selected={selectedSet.has(normalizeTag(item))}
        color={color}
        isLast={index === filteredTags.length - 1}
        onPress={() => toggleTag(item)}
      />
    ),
    [color, filteredTags.length, selectedSet, toggleTag],
  );

  const listHeight = useMemo(
    () => Math.min(filteredTags.length * TAG_PICKER_ROW_HEIGHT, TAG_PICKER_LIST_MAX_HEIGHT),
    [filteredTags.length],
  );

  return (
    <AppBottomSheetModal visible={visible} onClose={handleClose}>
      <BottomSheetView style={{ paddingHorizontal: 20, ...contentPadding }}>
        <Text
          style={{
            color: color.text.primary,
            fontSize: 17,
            fontWeight: '600',
            marginBottom: 10,
            marginTop: 4,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: color.background.tertiary,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: IS_IOS ? 10 : 8,
            borderWidth: 1,
            borderColor: focused ? color.accent.primary : color.border.default,
            marginBottom: 10,
          }}
        >
          <Search
            size={16}
            color={focused || query ? color.accent.primary : color.icon.muted}
            strokeWidth={2}
          />
          <BottomSheetTextInput
            style={[getInputFieldInputStyle(color), { flex: 1 }]}
            placeholder={t('notesGraph.filters.tagPickerSearchPlaceholder')}
            placeholderTextColor={color.text.secondary}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('common.clear')}
            >
              <X size={16} color={color.text.secondary} strokeWidth={2.2} />
            </Pressable>
          ) : null}
        </View>

        {filteredTags.length === 0 ? (
          <Text
            style={{
              color: color.text.secondary,
              fontSize: 15,
              lineHeight: 22,
              paddingVertical: 24,
              textAlign: 'center',
            }}
          >
            {t('notesGraph.filters.tagPickerSearchEmpty')}
          </Text>
        ) : (
          <View
            style={{
              backgroundColor: color.background.card,
              borderColor: color.border.default,
              borderRadius: 12,
              borderWidth: 1,
              overflow: 'hidden',
              height: listHeight,
            }}
          >
            <FlashList
              data={filteredTags}
              renderItem={renderItem}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        <SheetFooterButtons
          color={color}
          primaryLabel={t('common.done')}
          onPrimaryPress={handleApply}
          secondaryLabel={t('common.clear')}
          onSecondaryPress={handleClear}
          secondaryDisabled={draftTags.length === 0}
        />
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}
