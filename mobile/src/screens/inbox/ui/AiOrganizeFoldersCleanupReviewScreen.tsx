import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { InboxStackParamList } from '@/app/navigation/types';
import { useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import { AutoOrganizeProgressOverlay } from '@/features/manage-folders';
import { useAiOrganizeCleanupReview } from '@/features/manage-folders/model/useAiOrganizeCleanupReview';
import { useColors } from '@/shared/config';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { HeaderIconButton, ScreenHeader } from '@/shared/ui';

type Route = RouteProp<InboxStackParamList, 'AiOrganizeFoldersCleanupReview'>;

const APPLY_SUCCESS_OVERLAY_MS = 1400;

export function AiOrganizeFoldersCleanupReviewScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<InboxStackParamList>>();
  const route = useRoute<Route>();
  const color = useColors();
  const isTablet = useIsTablet();
  const contentMaxWidth = useTabletContentMaxWidth('wide');

  const getFolders = useCallback(() => useFolderStore.getState().folders, []);
  const getRecords = useCallback(() => useRecordStore.getState().records, []);
  const moveRecord = useFolderStore((s) => s.moveRecord);
  const updateFolder = useFolderStore((s) => s.updateFolder);
  const deleteFolder = useFolderStore((s) => s.deleteFolder);

  const [applyOverlayVisible, setApplyOverlayVisible] = useState(false);
  const [applyOverlayMode, setApplyOverlayMode] = useState<'loading' | 'success'>('loading');

  const {
    mergeItems,
    deleteEmptyFolderNames,
    selectedMergeKeys,
    selectedDeleteNames,
    toggleMerge,
    toggleDelete,
    isApplying,
    apply,
  } = useAiOrganizeCleanupReview({
    result: route.params.result,
    getFolders,
    getRecords,
    moveRecord,
    updateFolder,
    deleteFolder,
  });

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('InboxHome');
  }, [navigation]);

  const confirmApply = useCallback(async () => {
    if (isApplying || applyOverlayVisible) return;
    setApplyOverlayVisible(true);
    setApplyOverlayMode('loading');
    const ok = await apply();
    if (!ok) {
      setApplyOverlayVisible(false);
      return;
    }
    setApplyOverlayMode('success');
    await new Promise<void>((resolve) => setTimeout(resolve, APPLY_SUCCESS_OVERLAY_MS));
    setApplyOverlayVisible(false);
    goBack();
  }, [apply, applyOverlayVisible, goBack, isApplying]);

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('folders.aiOrganizeCleanupReview.title')}
        onBack={() => {
          if (applyOverlayVisible) return;
          goBack();
        }}
        titleAlign="center"
        rightSlot={
          <HeaderIconButton
            iconOnly
            variant="icon"
            size="md"
            accessibilityLabel={t('folders.autoOrganizeApplyA11y')}
            icon={<Check size={22} color={color.accent.primary} strokeWidth={2.5} />}
            color={color}
            onPress={() => void confirmApply()}
            disabled={isApplying || applyOverlayVisible}
          />
        }
      />
      <View style={{ flex: 1, alignSelf: 'center', width: '100%', maxWidth: contentMaxWidth }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
          }}
        >
          <Text style={{ fontSize: 13, color: color.text.secondary, marginBottom: 12 }}>
            {t('folders.aiOrganizeCleanupReview.subtitle')}
          </Text>

          {mergeItems.length > 0 ? (
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: color.text.primary,
                marginBottom: 8,
              }}
            >
              {t('folders.aiOrganizeCleanupReview.mergesSection')}
            </Text>
          ) : null}
          {mergeItems.map(({ key, merge }) => {
            const selected = selectedMergeKeys.has(key);
            return (
              <Pressable
                key={key}
                onPress={() => toggleMerge(key)}
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: selected ? color.accent.primary : color.border.default,
                  backgroundColor: color.background.card,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontSize: 16, color: color.text.primary, fontWeight: '500' }}>
                  {merge.targetFolderName}
                </Text>
                <Text style={{ fontSize: 13, color: color.text.muted, marginTop: 4 }}>
                  {t('folders.aiOrganizeCleanupReview.mergeSources', {
                    names: merge.sourceFolderNames.join(', '),
                  })}
                </Text>
              </Pressable>
            );
          })}

          {deleteEmptyFolderNames.length > 0 ? (
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: color.text.primary,
                marginTop: 12,
                marginBottom: 8,
              }}
            >
              {t('folders.aiOrganizeCleanupReview.deleteSection')}
            </Text>
          ) : null}
          {deleteEmptyFolderNames.map((name) => {
            const selected = selectedDeleteNames.has(name);
            return (
              <Pressable
                key={name}
                onPress={() => toggleDelete(name)}
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: selected ? color.accent.primary : color.border.default,
                  backgroundColor: color.background.card,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontSize: 16, color: color.text.primary }}>{name}</Text>
              </Pressable>
            );
          })}

          {mergeItems.length === 0 && deleteEmptyFolderNames.length === 0 ? (
            <Text style={{ fontSize: 14, color: color.text.secondary }}>
              {t('folders.aiOrganizeCleanupReview.empty')}
            </Text>
          ) : null}
        </ScrollView>
      </View>
      <AutoOrganizeProgressOverlay
        visible={applyOverlayVisible}
        mode={applyOverlayMode}
        variant="apply"
        organizeMode="consolidate_folders"
      />
    </View>
  );
}
