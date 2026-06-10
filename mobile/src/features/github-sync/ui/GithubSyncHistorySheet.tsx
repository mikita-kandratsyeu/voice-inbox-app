import { BottomSheetView } from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { Check, ExternalLink, History } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

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
  restoring: boolean;
  onClose: () => void;
  onLoad: () => void | Promise<void>;
  onRestore: (commitSha: string) => void | Promise<void>;
};

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

type HistoryPickerRowProps = {
  color: Colors;
  isLast: boolean;
  isSelected: boolean;
  metaLabel: string;
  title: string;
  onPress: () => void;
};

function HistoryPickerRow({
  color,
  isLast,
  isSelected,
  metaLabel,
  title,
  onPress,
}: HistoryPickerRowProps) {
  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={title}
      style={({ pressed }) => ({
        backgroundColor: pressed
          ? color.background.tertiary
          : isSelected
            ? `${color.accent.primary}14`
            : 'transparent',
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
        {isSelected ? (
          <Check size={20} color={color.accent.primary} strokeWidth={2.5} />
        ) : (
          <View style={{ width: 20 }} />
        )}
      </View>
    </Pressable>
  );
}

export function GithubSyncHistorySheet({
  visible,
  color,
  commits,
  loading,
  restoring,
  onClose,
  onLoad,
  onRestore,
}: Props) {
  const { t, i18n } = useTranslation();
  const contentPadding = useBottomSheetContentPadding(12);
  const [selectedSha, setSelectedSha] = useState<string | null>(null);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  useEffect(() => {
    if (visible) {
      void onLoadRef.current();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setSelectedSha(null);
      return;
    }
    if (commits.length > 0 && !selectedSha) {
      setSelectedSha(commits[0]?.sha ?? null);
    }
  }, [commits, selectedSha, visible]);

  const selected = commits.find((c) => c.sha === selectedSha) ?? null;

  const confirmRestore = useCallback(() => {
    if (!selected) return;
    Alert.alert(t('settings.githubSync.restoreTitle'), t('settings.githubSync.restoreMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.githubSync.restoreConfirm'),
        style: 'destructive',
        onPress: () => void onRestore(selected.sha),
      },
    ]);
  }, [onRestore, selected, t]);

  const listHeight = useMemo(
    () => Math.min(commits.length * HISTORY_ROW_HEIGHT, HISTORY_LIST_MAX_HEIGHT),
    [commits.length],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: GithubCommitSummary; index: number }) => (
      <HistoryPickerRow
        color={color}
        isLast={index === commits.length - 1}
        isSelected={item.sha === selectedSha}
        title={item.message || t('settings.githubSync.untitledCommit')}
        metaLabel={`${formatRelativeTime(item.committedAt, i18n.language)} · ${shortSha(item.sha)}`}
        onPress={() => setSelectedSha(item.sha)}
      />
    ),
    [color, commits.length, i18n.language, selectedSha, t],
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
        keyboardShouldPersistTaps="handled"
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

        {selected?.htmlUrl ? (
          <Pressable
            onPress={() => void openInAppBrowser(selected.htmlUrl)}
            className="mt-3 flex-row items-center justify-center gap-2 py-2"
          >
            <ExternalLink size={16} color={color.accent.primary} strokeWidth={2} />
            <Text className="text-sm font-medium" style={{ color: color.accent.primary }}>
              {t('settings.githubSync.openOnGithub')}
            </Text>
          </Pressable>
        ) : null}

        <SheetFooterButtons
          color={color}
          className="mt-4 w-full"
          primaryLabel={
            restoring ? t('settings.githubSync.restoring') : t('settings.githubSync.restoreConfirm')
          }
          onPrimaryPress={confirmRestore}
          primaryDisabled={!selected || restoring || loading}
          primaryLoading={restoring}
          secondaryLabel={t('common.close')}
          onSecondaryPress={onClose}
        />
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}
