import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { InboxStackParamList } from '@/app/navigation/types';
import { useRecordStore } from '@/entities/record';
import { AutoOrganizeProgressOverlay } from '@/features/manage-folders';
import { useAiOrganizeArchiveReview } from '@/features/manage-folders/model/useAiOrganizeArchiveReview';
import {
  AiOrganizeReviewGroupedList,
  AiOrganizeReviewListDivider,
  AiOrganizeReviewListRow,
  AiOrganizeReviewSectionHeader,
  AiOrganizeReviewSelectToggle,
} from '@/features/manage-folders/ui/AiOrganizeReviewListRow';
import { useColors } from '@/shared/config';
import { hapticSelection, useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { FrostedHeaderIconButton, ScreenHeader } from '@/shared/ui';

type Route = RouteProp<InboxStackParamList, 'AiOrganizeArchiveReview'>;

const APPLY_SUCCESS_OVERLAY_MS = 1400;

export function AiOrganizeArchiveReviewScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<InboxStackParamList>>();
  const route = useRoute<Route>();
  const color = useColors();
  const isTablet = useIsTablet();
  const contentMaxWidth = useTabletContentMaxWidth('wide');

  const records = useRecordStore((s) => s.records);
  const archiveRecord = useRecordStore((s) => s.archiveRecord);

  const [applyOverlayVisible, setApplyOverlayVisible] = useState(false);
  const [applyOverlayMode, setApplyOverlayMode] = useState<'loading' | 'success'>('loading');

  const recordTitleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of records) {
      m.set(r.id, r.title || t('record.autoTitle.morning'));
    }
    return m;
  }, [records, t]);

  const {
    suggestions,
    selectedIds,
    toggle,
    selectAll,
    deselectAll,
    allSelected,
    isApplying,
    apply,
  } = useAiOrganizeArchiveReview({
    result: route.params.result,
    archiveRecord,
  });

  const footerBottomPad = getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet);
  const noneSelected = selectedIds.size === 0;

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('InboxHome');
  }, [navigation]);

  const runApply = useCallback(
    async (archiveFn: () => Promise<boolean>) => {
      if (isApplying || applyOverlayVisible) return;
      setApplyOverlayVisible(true);
      setApplyOverlayMode('loading');
      const ok = await archiveFn();
      if (!ok) {
        setApplyOverlayVisible(false);
        return;
      }
      setApplyOverlayMode('success');
      await new Promise<void>((resolve) => setTimeout(resolve, APPLY_SUCCESS_OVERLAY_MS));
      setApplyOverlayVisible(false);
      goBack();
    },
    [applyOverlayVisible, goBack, isApplying],
  );

  const confirmApply = useCallback(() => void runApply(apply), [apply, runApply]);

  const handleToggle = useCallback(
    (recordId: string) => {
      hapticSelection();
      toggle(recordId);
    },
    [toggle],
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('folders.aiOrganizeArchiveReview.title')}
        onBack={() => {
          if (applyOverlayVisible) return;
          goBack();
        }}
        titleAlign="center"
        rightSlot={
          suggestions.length > 0 ? (
            <FrostedHeaderIconButton
              iconOnly
              variant="icon"
              size="md"
              accessibilityLabel={t('folders.autoOrganizeApplyA11y')}
              icon={<Check size={22} color={color.accent.primary} strokeWidth={2.5} />}
              color={color}
              onPress={confirmApply}
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
          {suggestions.length > 0 ? (
            <Text
              style={{
                fontSize: 13,
                color: color.text.secondary,
                textAlign: 'center',
                marginBottom: 16,
                paddingHorizontal: 4,
              }}
            >
              {t('folders.aiOrganizeArchiveReview.subtitle')}
            </Text>
          ) : null}

          {suggestions.length > 0 ? (
            <View style={{ marginBottom: 24 }}>
              <AiOrganizeReviewSectionHeader
                title={t('folders.aiOrganizeArchiveReview.itemsSection')}
                color={color}
              />
              <AiOrganizeReviewSelectToggle
                allSelected={allSelected}
                noneSelected={noneSelected}
                onSelectAll={selectAll}
                onDeselectAll={deselectAll}
                color={color}
              />
              <AiOrganizeReviewGroupedList color={color}>
                {suggestions.map((suggestion, index) => (
                  <AiOrganizeReviewListDivider
                    key={suggestion.recordId}
                    isLast={index === suggestions.length - 1}
                    color={color}
                  >
                    <AiOrganizeReviewListRow
                      title={
                        recordTitleById.get(suggestion.recordId) ??
                        t('folders.autoOrganizeReviewUnknownNote')
                      }
                      subtitle={suggestion.reason}
                      selected={selectedIds.has(suggestion.recordId)}
                      color={color}
                      onPress={() => handleToggle(suggestion.recordId)}
                    />
                  </AiOrganizeReviewListDivider>
                ))}
              </AiOrganizeReviewGroupedList>
            </View>
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
              {t('folders.aiOrganizeArchiveReview.empty')}
            </Text>
          )}
        </ScrollView>
      </View>

      <AutoOrganizeProgressOverlay
        visible={applyOverlayVisible}
        mode={applyOverlayMode}
        variant="apply"
        organizeMode="suggest_archive"
      />
    </View>
  );
}
