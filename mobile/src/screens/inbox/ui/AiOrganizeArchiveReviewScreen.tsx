import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { InboxStackParamList } from '@/app/navigation/types';
import { useRecordStore } from '@/entities/record';
import { AutoOrganizeProgressOverlay } from '@/features/manage-folders';
import { useAiOrganizeArchiveReview } from '@/features/manage-folders/model/useAiOrganizeArchiveReview';
import { useColors } from '@/shared/config';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { Button, HeaderIconButton, ScreenHeader } from '@/shared/ui';

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

  const { suggestions, selectedIds, toggle, isApplying, apply, applyAll } =
    useAiOrganizeArchiveReview({
      result: route.params.result,
      archiveRecord,
    });

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

  const confirmApplySelected = useCallback(() => void runApply(apply), [apply, runApply]);

  const confirmApplyAll = useCallback(() => void runApply(applyAll), [applyAll, runApply]);

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
          <HeaderIconButton
            iconOnly
            variant="icon"
            size="md"
            accessibilityLabel={t('folders.autoOrganizeApplyA11y')}
            icon={<Check size={22} color={color.accent.primary} strokeWidth={2.5} />}
            color={color}
            onPress={confirmApplySelected}
            disabled={isApplying || applyOverlayVisible || selectedIds.size === 0}
          />
        }
      />
      <View style={{ flex: 1, alignSelf: 'center', width: '100%', maxWidth: contentMaxWidth }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom:
              suggestions.length > 0
                ? 16
                : getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
          }}
        >
          <Text style={{ fontSize: 13, color: color.text.secondary, marginBottom: 12 }}>
            {t('folders.aiOrganizeArchiveReview.subtitle')}
          </Text>

          {suggestions.map((suggestion) => {
            const selected = selectedIds.has(suggestion.recordId);
            return (
              <Pressable
                key={suggestion.recordId}
                onPress={() => toggle(suggestion.recordId)}
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: selected ? color.accent.primary : color.border.default,
                  backgroundColor: color.background.card,
                  padding: 14,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, color: color.text.primary, fontWeight: '500' }}>
                    {recordTitleById.get(suggestion.recordId) ??
                      t('folders.autoOrganizeReviewUnknownNote')}
                  </Text>
                  <Text style={{ fontSize: 13, color: color.text.muted, marginTop: 4 }}>
                    {suggestion.reason}
                  </Text>
                </View>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: selected ? color.accent.primary : color.border.default,
                    backgroundColor: selected ? color.accent.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 2,
                  }}
                >
                  {selected ? (
                    <Check size={14} color={color.icon.onAccent} strokeWidth={3} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}

          {suggestions.length === 0 ? (
            <Text style={{ fontSize: 14, color: color.text.secondary }}>
              {t('folders.aiOrganizeArchiveReview.empty')}
            </Text>
          ) : null}
        </ScrollView>

        {suggestions.length > 0 ? (
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 12),
              borderTopWidth: 1,
              borderTopColor: color.border.default,
              backgroundColor: color.background.secondary,
            }}
          >
            <Button
              label={t('folders.aiOrganizeArchiveReview.archiveAll', { count: suggestions.length })}
              variant="primary"
              size="lg"
              fullWidth
              color={color}
              disabled={isApplying || applyOverlayVisible}
              loading={isApplying || applyOverlayVisible}
              onPress={confirmApplyAll}
              accessibilityLabel={t('folders.aiOrganizeArchiveReview.archiveAllA11y', {
                count: suggestions.length,
              })}
            />
          </View>
        ) : null}
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
