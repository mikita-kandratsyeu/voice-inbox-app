import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { Check, ChevronRight, Pin, Plus, Search, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, Text, ToastAndroid, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection, IS_ANDROID, IS_IOS, normalizeSearchQuery } from '@/shared/lib';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  getInputFieldInputStyle,
  SheetHeader,
} from '@/shared/ui';

import {
  buildRepoPickerRows,
  repoPickerListHeight,
  type RepoPickerRow,
} from '../lib/buildRepoPickerRows';
import { REMOTE_SYNC_DEFAULT_BRANCH, REMOTE_SYNC_DEFAULT_REPO_NAME } from '../lib/constants';
import type { RemoteRepoSummary } from '../lib/types';
import { RemoteSyncBranchText } from './RemoteSyncBranchText';

type Props = {
  visible: boolean;
  color: Colors;
  i18nPrefix: string;
  repoIcon: React.ReactNode;
  repos: RemoteRepoSummary[];
  loading: boolean;
  creating?: boolean;
  currentRepoFullName?: string | null;
  pinnedRepoFullNames?: string[];
  onClose: () => void;
  onSelect: (repo: RemoteRepoSummary) => void | Promise<void>;
  onCreateRepo: (name: string) => void | Promise<void>;
  onLoadRepos: () => void | Promise<void>;
  onTogglePinnedRepo?: (fullName: string) => 'max' | 'ok';
};

type RepoPickerRowProps = {
  item: RemoteRepoSummary;
  color: Colors;
  repoIcon: React.ReactNode;
  isLast: boolean;
  visibilityLabel: string;
  pinned: boolean;
  isCurrent: boolean;
  showPinButton: boolean;
  pinA11yLabel: string;
  onPress: () => void;
  onTogglePin?: () => void;
};

function RepoPickerRow({
  item,
  color,
  repoIcon,
  isLast,
  visibilityLabel,
  pinned,
  isCurrent,
  showPinButton,
  pinA11yLabel,
  onPress,
  onTogglePin,
}: RepoPickerRowProps) {
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
          {repoIcon}
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
        {showPinButton && onTogglePin ? (
          <Pressable
            onPress={() => {
              hapticSelection();
              onTogglePin();
            }}
            accessibilityRole="button"
            accessibilityLabel={pinA11yLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
              padding: 4,
            })}
          >
            <Pin
              size={18}
              color={pinned ? color.accent.primary : color.text.muted}
              fill={pinned ? color.accent.primary : 'transparent'}
              strokeWidth={2}
            />
          </Pressable>
        ) : null}
        {isCurrent ? (
          <Check size={18} color={color.accent.success} strokeWidth={2.4} />
        ) : (
          <ChevronRight size={18} color={color.text.muted} strokeWidth={2.2} />
        )}
      </View>
    </Pressable>
  );
}

export function GitRemoteRepoPickerSheet({
  visible,
  color,
  i18nPrefix,
  repoIcon,
  repos,
  loading,
  creating = false,
  currentRepoFullName = null,
  pinnedRepoFullNames = [],
  onClose,
  onSelect,
  onCreateRepo,
  onLoadRepos,
  onTogglePinnedRepo,
}: Props) {
  const { t } = useTranslation();
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
    void onCreateRepo(REMOTE_SYNC_DEFAULT_REPO_NAME);
  }, [onCreateRepo]);

  const normalizedQuery = useMemo(() => normalizeSearchQuery(query), [query]);
  const pinnedSet = useMemo(() => new Set(pinnedRepoFullNames), [pinnedRepoFullNames]);

  const canCreateDefaultRepo = useMemo(() => {
    if (loading) return false;
    return !repos.some(
      (repo) =>
        repo.name.localeCompare(REMOTE_SYNC_DEFAULT_REPO_NAME, undefined, {
          sensitivity: 'accent',
        }) === 0,
    );
  }, [loading, repos]);

  const pickerRows = useMemo(
    () =>
      buildRepoPickerRows({
        repos,
        pinnedFullNames: pinnedRepoFullNames,
        currentFullName: currentRepoFullName,
        normalizedQuery,
      }),
    [repos, pinnedRepoFullNames, currentRepoFullName, normalizedQuery],
  );

  const listHeight = useMemo(() => repoPickerListHeight(pickerRows), [pickerRows]);

  const showPinnedMaxFeedback = useCallback(() => {
    if (IS_ANDROID) {
      ToastAndroid.show(t(`${i18nPrefix}.pinnedReposMax`), ToastAndroid.SHORT);
      return;
    }
    Alert.alert(t(`${i18nPrefix}.pinnedReposSection`), t(`${i18nPrefix}.pinnedReposMax`));
  }, [i18nPrefix, t]);

  const handleTogglePin = useCallback(
    (fullName: string) => {
      if (!onTogglePinnedRepo) return;
      const result = onTogglePinnedRepo(fullName);
      if (result === 'max') {
        showPinnedMaxFeedback();
      }
    },
    [onTogglePinnedRepo, showPinnedMaxFeedback],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: RepoPickerRow; index: number }) => {
      if (item.type === 'header') {
        const titleKey = `${i18nPrefix}.${item.sectionSuffix}`;
        return (
          <View
            style={{
              paddingHorizontal: 14,
              paddingTop: item.sectionSuffix === 'currentRepoSection' ? 12 : index === 0 ? 8 : 10,
              paddingBottom: 6,
            }}
          >
            <Text
              style={{
                color: color.text.muted,
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 0.2,
                lineHeight: 16,
                textTransform: 'uppercase',
              }}
            >
              {t(titleKey)}
            </Text>
          </View>
        );
      }

      const isLast = !pickerRows.slice(index + 1).some((row) => row.type === 'repo');
      const pinned = pinnedSet.has(item.repo.fullName);
      const isCurrent = item.repo.fullName === currentRepoFullName;

      return (
        <RepoPickerRow
          item={item.repo}
          color={color}
          repoIcon={repoIcon}
          isLast={isLast}
          visibilityLabel={
            item.repo.private ? t(`${i18nPrefix}.repoPrivate`) : t(`${i18nPrefix}.repoPublic`)
          }
          pinned={pinned}
          isCurrent={isCurrent}
          showPinButton={onTogglePinnedRepo != null}
          pinA11yLabel={
            pinned
              ? t(`${i18nPrefix}.unpinRepoA11y`, { repo: item.repo.fullName })
              : t(`${i18nPrefix}.pinRepoA11y`, { repo: item.repo.fullName })
          }
          onPress={() => void onSelect(item.repo)}
          onTogglePin={() => handleTogglePin(item.repo.fullName)}
        />
      );
    },
    [
      color,
      currentRepoFullName,
      handleTogglePin,
      i18nPrefix,
      onSelect,
      onTogglePinnedRepo,
      pickerRows,
      pinnedSet,
      repoIcon,
      t,
    ],
  );

  const keyExtractor = useCallback((item: RepoPickerRow) => item.id, []);

  const repoSearchEmpty = normalizedQuery
    ? t(`${i18nPrefix}.repoSearchEmpty`, { query: normalizedQuery })
    : t(`${i18nPrefix}.noRepos`);

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
      {t(`${i18nPrefix}.noRepos`)}
    </Text>
  ) : pickerRows.length === 0 ? (
    <Text
      style={{
        color: color.text.secondary,
        fontSize: 15,
        lineHeight: 22,
        paddingVertical: 24,
        textAlign: 'center',
      }}
    >
      {repoSearchEmpty}
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
        data={pickerRows}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  return (
    <AppBottomSheetModal visible={visible} onClose={handleClose}>
      <AppBottomSheetContent bottomPadding={12} style={{ paddingTop: 4 }}>
        <SheetHeader title={t(`${i18nPrefix}.selectRepoTitle`)} color={color} marginBottom={4} />
        <RemoteSyncBranchText
          i18nKey={`${i18nPrefix}.selectRepoSubtitle`}
          branch={REMOTE_SYNC_DEFAULT_BRANCH}
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
            placeholder={t(`${i18nPrefix}.repoSearchPlaceholder`)}
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
                {t(`${i18nPrefix}.createRepo`)}
              </Text>
            </View>
            {creating ? <ActivityIndicator color={color.accent.primary} /> : null}
          </Pressable>
        ) : null}

        {listBody}
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
