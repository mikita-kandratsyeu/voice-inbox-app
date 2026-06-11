import { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { ChevronRight, Plus, Search, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection, IS_IOS, matchesSearchQuery, normalizeSearchQuery } from '@/shared/lib';
import {
  AppBottomSheetModal,
  getInputFieldInputStyle,
  useBottomSheetContentPadding,
} from '@/shared/ui';

import { GITHUB_SYNC_DEFAULT_BRANCH, GITHUB_SYNC_DEFAULT_REPO_NAME } from '../lib/constants';
import type { GithubRepoSummary } from '../lib/githubApi';
import { GithubIcon } from './GithubIcon';
import { GithubSyncBranchText } from './GithubSyncBranchText';

const REPO_ROW_HEIGHT = 72;
const REPO_LIST_MAX_HEIGHT = 420;

type Props = {
  visible: boolean;
  color: Colors;
  repos: GithubRepoSummary[];
  loading: boolean;
  creating?: boolean;
  onClose: () => void;
  onSelect: (repo: GithubRepoSummary) => void | Promise<void>;
  onCreateRepo: (name: string) => void | Promise<void>;
  onLoadRepos: () => void | Promise<void>;
};

type RepoPickerRowProps = {
  item: GithubRepoSummary;
  color: Colors;
  isLast: boolean;
  visibilityLabel: string;
  onPress: () => void;
};

function RepoPickerRow({ item, color, isLast, visibilityLabel, onPress }: RepoPickerRowProps) {
  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${item.fullName}, ${visibilityLabel}`}
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
          minHeight: 52,
          paddingHorizontal: 14,
          paddingVertical: 12,
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
          <GithubIcon size={18} color={color.accent.primary} />
        </View>
        <View style={{ flex: 1, flexShrink: 1, justifyContent: 'center', minWidth: 0 }}>
          <Text
            style={{ color: color.text.primary, fontSize: 16, fontWeight: '600', lineHeight: 21 }}
            numberOfLines={1}
          >
            {item.fullName}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: color.text.secondary,
              fontSize: 13,
              lineHeight: 18,
              marginTop: 3,
            }}
          >
            {visibilityLabel}
          </Text>
        </View>
        <ChevronRight size={18} color={color.text.muted} strokeWidth={2.2} />
      </View>
    </Pressable>
  );
}

export function GithubRepoPickerSheet({
  visible,
  color,
  repos,
  loading,
  creating = false,
  onClose,
  onSelect,
  onCreateRepo,
  onLoadRepos,
}: Props) {
  const { t } = useTranslation();
  const contentPadding = useBottomSheetContentPadding(12);
  const onLoadReposRef = useRef(onLoadRepos);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  onLoadReposRef.current = onLoadRepos;

  useEffect(() => {
    if (visible) {
      void onLoadReposRef.current();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    setQuery('');
    setFocused(false);
    onClose();
  }, [onClose]);

  const handleCreate = useCallback(() => {
    hapticSelection();
    void onCreateRepo(GITHUB_SYNC_DEFAULT_REPO_NAME);
  }, [onCreateRepo]);

  const normalizedQuery = useMemo(() => normalizeSearchQuery(query), [query]);

  const canCreateDefaultRepo = useMemo(() => {
    if (loading) return false;
    return !repos.some(
      (repo) =>
        repo.name.localeCompare(GITHUB_SYNC_DEFAULT_REPO_NAME, undefined, {
          sensitivity: 'accent',
        }) === 0,
    );
  }, [loading, repos]);

  const filteredRepos = useMemo(() => {
    const sorted = [...repos].sort((a, b) =>
      a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' }),
    );
    if (!normalizedQuery) return sorted;
    return sorted.filter(
      (repo) =>
        matchesSearchQuery(repo.fullName, normalizedQuery) ||
        matchesSearchQuery(repo.name, normalizedQuery) ||
        matchesSearchQuery(repo.owner, normalizedQuery),
    );
  }, [normalizedQuery, repos]);

  const listHeight = useMemo(
    () => Math.min(filteredRepos.length * REPO_ROW_HEIGHT, REPO_LIST_MAX_HEIGHT),
    [filteredRepos.length],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: GithubRepoSummary; index: number }) => (
      <RepoPickerRow
        item={item}
        color={color}
        isLast={index === filteredRepos.length - 1}
        visibilityLabel={
          item.private ? t('settings.githubSync.repoPrivate') : t('settings.githubSync.repoPublic')
        }
        onPress={() => void onSelect(item)}
      />
    ),
    [color, filteredRepos.length, onSelect, t],
  );

  const keyExtractor = useCallback((item: GithubRepoSummary) => String(item.id), []);

  const listBody = loading ? (
    <View className="items-center py-10">
      <ActivityIndicator color={color.accent.primary} />
    </View>
  ) : repos.length === 0 ? (
    <Text
      style={{
        color: color.text.secondary,
        fontSize: 15,
        lineHeight: 22,
        paddingVertical: 24,
        textAlign: 'center',
      }}
    >
      {t('settings.githubSync.noRepos')}
    </Text>
  ) : filteredRepos.length === 0 ? (
    <Text
      style={{
        color: color.text.secondary,
        fontSize: 15,
        lineHeight: 22,
        paddingVertical: 24,
        textAlign: 'center',
      }}
    >
      {t('settings.githubSync.repoSearchEmpty', { query: normalizedQuery })}
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
        data={filteredRepos}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  return (
    <AppBottomSheetModal visible={visible} onClose={handleClose}>
      <BottomSheetView style={{ paddingHorizontal: 20, paddingTop: 4, ...contentPadding }}>
        <Text
          style={{
            color: color.text.primary,
            fontSize: 17,
            fontWeight: '600',
            marginBottom: 4,
            marginTop: 4,
            textAlign: 'center',
          }}
        >
          {t('settings.githubSync.selectRepoTitle')}
        </Text>
        <GithubSyncBranchText
          i18nKey="settings.githubSync.selectRepoSubtitle"
          branch={GITHUB_SYNC_DEFAULT_BRANCH}
          style={{
            color: color.text.secondary,
            fontSize: 14,
            lineHeight: 20,
            marginBottom: 10,
            textAlign: 'center',
          }}
        />

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
            placeholder={t('settings.githubSync.repoSearchPlaceholder')}
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

        {canCreateDefaultRepo ? (
          <Pressable
            onPress={handleCreate}
            disabled={creating}
            accessibilityState={{ disabled: creating, busy: creating }}
            className="mb-3 flex-row items-center justify-between rounded-xl px-3 py-3"
            style={{
              backgroundColor: color.background.secondary,
              opacity: creating ? 0.75 : 1,
            }}
          >
            <View className="min-w-0 flex-1 flex-row items-center gap-2">
              <Plus size={18} color={color.accent.primary} strokeWidth={2} />
              <Text className="text-sm font-medium" style={{ color: color.accent.primary }}>
                {t('settings.githubSync.createRepo')}
              </Text>
            </View>
            {creating ? <ActivityIndicator color={color.accent.primary} /> : null}
          </Pressable>
        ) : null}

        {listBody}
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}
