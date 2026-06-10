import { BottomSheetFlatList, BottomSheetView } from '@gorhom/bottom-sheet';
import { Plus } from 'lucide-react-native';
import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { AppBottomSheetModal, useBottomSheetContentPadding } from '@/shared/ui';

import type { GithubRepoSummary } from '../lib/githubApi';

type Props = {
  visible: boolean;
  color: Colors;
  repos: GithubRepoSummary[];
  loading: boolean;
  onClose: () => void;
  onSelect: (repo: GithubRepoSummary) => void | Promise<void>;
  onCreateRepo: (name: string) => void | Promise<void>;
  onLoadRepos: () => void | Promise<void>;
};

export function GithubRepoPickerSheet({
  visible,
  color,
  repos,
  loading,
  onClose,
  onSelect,
  onCreateRepo,
  onLoadRepos,
}: Props) {
  const { t } = useTranslation();
  const contentPadding = useBottomSheetContentPadding(12);

  useEffect(() => {
    if (visible) {
      void onLoadRepos();
    }
  }, [onLoadRepos, visible]);

  const handleCreate = useCallback(() => {
    hapticSelection();
    void onCreateRepo('voice-inbox-ai');
  }, [onCreateRepo]);

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose} snapPoints={['55%', '85%']}>
      <BottomSheetView style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text className="text-lg font-semibold" style={{ color: color.text.primary }}>
          {t('settings.githubSync.selectRepoTitle')}
        </Text>
        <Text className="mt-1 text-sm" style={{ color: color.text.secondary }}>
          {t('settings.githubSync.selectRepoSubtitle')}
        </Text>
        <Pressable
          onPress={() => {
            hapticSelection();
            handleCreate();
          }}
          className="mt-4 flex-row items-center gap-2 rounded-xl px-3 py-3"
          style={{ backgroundColor: color.background.secondary }}
        >
          <Plus size={18} color={color.accent.primary} strokeWidth={2} />
          <Text className="text-sm font-medium" style={{ color: color.accent.primary }}>
            {t('settings.githubSync.createRepo')}
          </Text>
        </Pressable>
      </BottomSheetView>
      {loading ? (
        <View className="items-center py-8">
          <ActivityIndicator color={color.accent.primary} />
        </View>
      ) : (
        <BottomSheetFlatList
          data={repos}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 20,
            ...contentPadding,
          }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                hapticSelection();
                void onSelect(item);
              }}
              className="mb-2 rounded-xl px-3 py-3"
              style={{
                backgroundColor: color.background.card,
                borderWidth: 1,
                borderColor: color.border.default,
              }}
            >
              <Text className="text-base font-medium" style={{ color: color.text.primary }}>
                {item.fullName}
              </Text>
              <Text className="mt-0.5 text-xs" style={{ color: color.text.secondary }}>
                {item.private
                  ? t('settings.githubSync.repoPrivate')
                  : t('settings.githubSync.repoPublic')}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text className="py-6 text-center text-sm" style={{ color: color.text.secondary }}>
              {t('settings.githubSync.noRepos')}
            </Text>
          }
        />
      )}
    </AppBottomSheetModal>
  );
}
