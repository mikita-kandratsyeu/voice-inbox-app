import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { InboxStackParamList } from '@/app/navigation/types';
import { useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import { AutoOrganizeProgressOverlay } from '@/features/manage-folders';
import { useAiOrganizeCleanupReview } from '@/features/manage-folders/model/useAiOrganizeCleanupReview';
import {
  AiOrganizeReviewGroupedList,
  AiOrganizeReviewListDivider,
  AiOrganizeReviewListRow,
  AiOrganizeReviewSectionHeader,
  AiOrganizeReviewSelectToggle,
} from '@/features/manage-folders/ui/AiOrganizeReviewListRow';
import { useColors } from '@/shared/config';
import { hapticSelection, useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
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
    selectAll,
    deselectAll,
    hasItems,
    allSelected,
    noneSelected,
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

  const footerBottomPad = getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet);

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

  const handleToggleMerge = useCallback(
    (key: string) => {
      hapticSelection();
      toggleMerge(key);
    },
    [toggleMerge],
  );

  const handleToggleDelete = useCallback(
    (name: string) => {
      hapticSelection();
      toggleDelete(name);
    },
    [toggleDelete],
  );

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
          hasItems ? (
            <HeaderIconButton
              iconOnly
              variant="icon"
              size="md"
              accessibilityLabel={t('folders.autoOrganizeApplyA11y')}
              icon={<Check size={22} color={color.accent.primary} strokeWidth={2.5} />}
              color={color}
              onPress={() => void confirmApply()}
              disabled={isApplying || applyOverlayVisible || noneSelected}
            />
          ) : null
        }
      />
      <View style={{ flex: 1, alignSelf: 'center', width: '100%', maxWidth: contentMaxWidth }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: footerBottomPad,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {hasItems ? (
            <Text
              style={{
                fontSize: 13,
                color: color.text.secondary,
                textAlign: 'center',
                marginBottom: 16,
                paddingHorizontal: 4,
              }}
            >
              {t('folders.aiOrganizeCleanupReview.subtitle')}
            </Text>
          ) : null}

          {hasItems ? (
            <>
              <AiOrganizeReviewSelectToggle
                allSelected={allSelected}
                noneSelected={noneSelected}
                onSelectAll={selectAll}
                onDeselectAll={deselectAll}
                color={color}
              />

              {mergeItems.length > 0 ? (
                <View style={{ marginBottom: deleteEmptyFolderNames.length > 0 ? 24 : 0 }}>
                  <AiOrganizeReviewSectionHeader
                    title={t('folders.aiOrganizeCleanupReview.mergesSection')}
                    color={color}
                  />
                  <AiOrganizeReviewGroupedList color={color}>
                    {mergeItems.map(({ key, merge }, index) => (
                      <AiOrganizeReviewListDivider
                        key={key}
                        isLast={index === mergeItems.length - 1}
                        color={color}
                      >
                        <AiOrganizeReviewListRow
                          title={merge.targetFolderName}
                          subtitle={t('folders.aiOrganizeCleanupReview.mergeSources', {
                            names: merge.sourceFolderNames.join(', '),
                          })}
                          selected={selectedMergeKeys.has(key)}
                          color={color}
                          onPress={() => handleToggleMerge(key)}
                        />
                      </AiOrganizeReviewListDivider>
                    ))}
                  </AiOrganizeReviewGroupedList>
                </View>
              ) : null}

              {deleteEmptyFolderNames.length > 0 ? (
                <View style={{ marginBottom: 24 }}>
                  <AiOrganizeReviewSectionHeader
                    title={t('folders.aiOrganizeCleanupReview.deleteSection')}
                    color={color}
                  />
                  <AiOrganizeReviewGroupedList color={color}>
                    {deleteEmptyFolderNames.map((name, index) => (
                      <AiOrganizeReviewListDivider
                        key={name}
                        isLast={index === deleteEmptyFolderNames.length - 1}
                        color={color}
                      >
                        <AiOrganizeReviewListRow
                          title={name}
                          selected={selectedDeleteNames.has(name)}
                          color={color}
                          onPress={() => handleToggleDelete(name)}
                        />
                      </AiOrganizeReviewListDivider>
                    ))}
                  </AiOrganizeReviewGroupedList>
                </View>
              ) : null}
            </>
          ) : (
            <Text
              style={{
                fontSize: 15,
                color: color.text.secondary,
                lineHeight: 21,
                textAlign: 'center',
                paddingVertical: 48,
              }}
            >
              {t('folders.aiOrganizeCleanupReview.empty')}
            </Text>
          )}
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
