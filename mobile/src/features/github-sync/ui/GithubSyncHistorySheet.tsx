import { BottomSheetFlatList, BottomSheetView } from '@gorhom/bottom-sheet';
import { ExternalLink, History } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { openInAppBrowser } from '@/features/in-app-browser';
import type { Colors } from '@/shared/config';
import { formatRelativeTime, hapticSelection } from '@/shared/lib';
import { AppBottomSheetModal, SheetFooterButtons, useBottomSheetContentPadding } from '@/shared/ui';

import type { GithubCommitSummary } from '../lib/githubApi';

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

  useEffect(() => {
    if (visible) {
      void onLoad();
    }
  }, [onLoad, visible]);

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

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose} snapPoints={['60%', '90%']}>
      <BottomSheetView style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <View className="flex-row items-center gap-2">
          <History size={20} color={color.accent.primary} strokeWidth={1.8} />
          <Text className="text-lg font-semibold" style={{ color: color.text.primary }}>
            {t('settings.githubSync.historyTitle')}
          </Text>
        </View>
        <Text className="mt-1 text-sm" style={{ color: color.text.secondary }}>
          {t('settings.githubSync.historySubtitle')}
        </Text>
      </BottomSheetView>

      {loading ? (
        <View className="items-center py-10">
          <ActivityIndicator color={color.accent.primary} />
        </View>
      ) : (
        <BottomSheetFlatList
          data={commits}
          keyExtractor={(item) => item.sha}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 120,
          }}
          renderItem={({ item }) => {
            const isSelected = item.sha === selectedSha;
            return (
              <Pressable
                onPress={() => {
                  hapticSelection();
                  setSelectedSha(item.sha);
                }}
                className="mb-2 rounded-xl px-3 py-3"
                style={{
                  backgroundColor: isSelected ? `${color.accent.primary}14` : color.background.card,
                  borderWidth: 1,
                  borderColor: isSelected ? color.accent.primary : color.border.default,
                }}
              >
                <Text className="text-sm font-medium" style={{ color: color.text.primary }}>
                  {item.message || t('settings.githubSync.untitledCommit')}
                </Text>
                <Text className="mt-1 text-xs" style={{ color: color.text.secondary }}>
                  {formatRelativeTime(item.committedAt, i18n.language)} · {shortSha(item.sha)}
                </Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text className="py-8 text-center text-sm" style={{ color: color.text.secondary }}>
              {t('settings.githubSync.historyEmpty')}
            </Text>
          }
        />
      )}

      <BottomSheetView style={{ paddingHorizontal: 20, ...contentPadding }}>
        {selected?.htmlUrl ? (
          <Pressable
            onPress={() => void openInAppBrowser(selected.htmlUrl)}
            className="mb-3 flex-row items-center justify-center gap-2 py-2"
          >
            <ExternalLink size={16} color={color.accent.primary} strokeWidth={2} />
            <Text className="text-sm font-medium" style={{ color: color.accent.primary }}>
              {t('settings.githubSync.openOnGithub')}
            </Text>
          </Pressable>
        ) : null}
        <SheetFooterButtons
          color={color}
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
