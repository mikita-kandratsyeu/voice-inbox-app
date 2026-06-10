import { BottomSheetView } from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { ExternalLink, History } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { openInAppBrowser } from '@/features/in-app-browser';
import type { Colors } from '@/shared/config';
import { formatRelativeTime, hapticSelection } from '@/shared/lib';
import { AppBottomSheetModal, SheetFooterButtons, useBottomSheetContentPadding } from '@/shared/ui';

import type { GithubCommitSummary } from '../lib/githubApi';

const HISTORY_ROW_HEIGHT = 72;
const HISTORY_LIST_MAX_HEIGHT = 420;

type Props = {
  visible: boolean;
  color: Colors;
  commits: GithubCommitSummary[];
  loading: boolean;
  onClose: () => void;
  onLoad: () => void | Promise<void>;
};

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

type HistoryListRowProps = {
  color: Colors;
  commit: GithubCommitSummary;
  isLast: boolean;
  metaLabel: string;
  title: string;
};

function HistoryListRow({ color, commit, isLast, metaLabel, title }: HistoryListRowProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        borderBottomColor: color.border.default,
        borderBottomWidth: isLast ? 0 : 1,
        width: '100%',
      }}
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
          <History size={18} color={color.accent.primary} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, flexShrink: 1, justifyContent: 'center', minWidth: 0 }}>
          <Text
            style={{ color: color.text.primary, fontSize: 16, fontWeight: '600', lineHeight: 21 }}
            numberOfLines={2}
          >
            {title}
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
            {metaLabel}
          </Text>
        </View>
        {commit.htmlUrl ? (
          <Pressable
            onPress={() => {
              hapticSelection();
              void openInAppBrowser(commit.htmlUrl);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('settings.githubSync.openOnGithub')}
            hitSlop={4}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: color.background.tertiary,
              borderRadius: 10,
              flexShrink: 0,
              height: 36,
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
              width: 36,
            })}
          >
            <ExternalLink size={18} color={color.accent.primary} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function GithubSyncHistorySheet({
  visible,
  color,
  commits,
  loading,
  onClose,
  onLoad,
}: Props) {
  const { t, i18n } = useTranslation();
  const contentPadding = useBottomSheetContentPadding(12);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  useEffect(() => {
    if (visible) {
      void onLoadRef.current();
    }
  }, [visible]);

  const listHeight = useMemo(
    () => Math.min(commits.length * HISTORY_ROW_HEIGHT, HISTORY_LIST_MAX_HEIGHT),
    [commits.length],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: GithubCommitSummary; index: number }) => (
      <HistoryListRow
        color={color}
        commit={item}
        isLast={index === commits.length - 1}
        title={item.message || t('settings.githubSync.untitledCommit')}
        metaLabel={`${formatRelativeTime(item.committedAt, i18n.language)} · ${shortSha(item.sha)}`}
      />
    ),
    [color, commits.length, i18n.language, t],
  );

  const keyExtractor = useCallback((item: GithubCommitSummary) => item.sha, []);

  const listBody = loading ? (
    <View className="items-center py-10">
      <ActivityIndicator color={color.accent.primary} />
    </View>
  ) : commits.length === 0 ? (
    <Text
      style={{
        color: color.text.secondary,
        fontSize: 15,
        lineHeight: 22,
        paddingVertical: 24,
        textAlign: 'center',
      }}
    >
      {t('settings.githubSync.historyEmpty')}
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
        data={commits}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
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
          {t('settings.githubSync.historyTitle')}
        </Text>
        <Text
          style={{
            color: color.text.secondary,
            fontSize: 14,
            lineHeight: 20,
            marginBottom: 10,
            textAlign: 'center',
          }}
        >
          {t('settings.githubSync.historySubtitle')}
        </Text>

        {listBody}

        <SheetFooterButtons
          color={color}
          className="mt-4 w-full"
          primaryLabel={t('common.close')}
          onPrimaryPress={onClose}
        />
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}
