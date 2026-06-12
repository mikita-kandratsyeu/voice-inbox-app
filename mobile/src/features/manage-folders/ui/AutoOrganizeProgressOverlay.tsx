import { Check } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, Easing, Modal, Text, View } from 'react-native';

import type { AutoOrganizeMode } from '@/entities/folder/lib/autoOrganizeTypes';
import { useColors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
import { AiProcessingCancelButton } from '@/shared/ui';

export type AutoOrganizeProgressVariant = 'organize' | 'apply';

type AutoOrganizeProgressOverlayProps = {
  visible: boolean;
  mode: 'loading' | 'success';
  variant?: AutoOrganizeProgressVariant;
  organizeMode?: AutoOrganizeMode | null;
  onCancel?: () => void;
};

export const AutoOrganizeProgressOverlay = ({
  visible,
  mode,
  variant = 'organize',
  organizeMode = null,
  onCancel,
}: AutoOrganizeProgressOverlayProps) => {
  const { t } = useTranslation();
  const color = useColors();
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const subtitleFade = useRef(new Animated.Value(1)).current;
  const successScale = useRef(new Animated.Value(0.7)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const loadingSteps = useMemo(() => {
    if (variant === 'apply') {
      return [
        t('folders.autoOrganizeApplyStepCreatingFolders'),
        t('folders.autoOrganizeApplyStepDistributingNotes'),
      ];
    }
    if (organizeMode === 'assign_existing') {
      return [
        t('folders.aiOrganizeProgress.assignStepAnalyzing'),
        t('folders.aiOrganizeProgress.assignStepSorting'),
      ];
    }
    if (organizeMode === 'consolidate_folders') {
      return [
        t('folders.aiOrganizeProgress.consolidateStepAnalyzing'),
        t('folders.aiOrganizeProgress.consolidateStepMerging'),
      ];
    }
    if (organizeMode === 'suggest_archive') {
      return [
        t('folders.aiOrganizeProgress.archiveStepAnalyzing'),
        t('folders.aiOrganizeProgress.archiveStepSelecting'),
      ];
    }
    return [
      t('folders.autoOrganizeStepAnalyzing'),
      t('folders.autoOrganizeStepCreatingFolders'),
      t('folders.autoOrganizeStepDistributingNotes'),
    ];
  }, [organizeMode, t, variant]);

  const loadingTitle =
    variant === 'apply'
      ? t('folders.autoOrganizeApplyLoadingTitle')
      : organizeMode === 'assign_existing'
        ? t('folders.aiOrganizeProgress.assignLoadingTitle')
        : organizeMode === 'consolidate_folders'
          ? t('folders.aiOrganizeProgress.consolidateLoadingTitle')
          : organizeMode === 'suggest_archive'
            ? t('folders.aiOrganizeProgress.archiveLoadingTitle')
            : t('folders.autoOrganizeLoadingTitle');
  const successTitle =
    variant === 'apply'
      ? t('folders.autoOrganizeApplyDoneTitle')
      : t('folders.autoOrganizeDoneTitle');
  const successDescription =
    variant === 'apply'
      ? t('folders.autoOrganizeApplyDoneDescription')
      : t('folders.autoOrganizeDoneDescription');

  useEffect(() => {
    if (!visible || mode !== 'loading') return;
    setLoadingStepIdx(0);
    const timer = setInterval(() => {
      Animated.sequence([
        Animated.timing(subtitleFade, {
          toValue: 0.25,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(subtitleFade, {
          toValue: 1,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
      setLoadingStepIdx((idx) => (idx + 1) % loadingSteps.length);
    }, 1700);
    return () => clearInterval(timer);
  }, [loadingSteps.length, mode, subtitleFade, visible]);

  useEffect(() => {
    if (!visible || mode !== 'success') return;
    successScale.setValue(0.7);
    successOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(successScale, {
        toValue: 1,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [mode, successOpacity, successScale, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      {...(IS_IOS ? ({ presentationStyle: 'overFullScreen' } as const) : {})}
    >
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      >
        <View
          className="w-full max-w-sm rounded-2xl px-6 py-8"
          style={{ backgroundColor: color.background.card }}
        >
          <View className="items-center justify-center">
            {mode === 'loading' ? (
              <ActivityIndicator size="large" color={color.accent.primary} />
            ) : (
              <Animated.View
                style={{
                  opacity: successOpacity,
                  transform: [{ scale: successScale }],
                }}
              >
                <View
                  className="h-14 w-14 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${color.accent.primary}20` }}
                >
                  <Check size={28} color={color.accent.primary} strokeWidth={2.6} />
                </View>
              </Animated.View>
            )}
          </View>
          <Text
            className="mt-5 text-center text-[16px] font-semibold leading-6"
            style={{ color: color.text.primary }}
          >
            {mode === 'loading' ? loadingTitle : successTitle}
          </Text>
          {mode === 'loading' ? (
            <Animated.Text
              className="mt-2 text-center text-[14px] leading-5"
              style={{ color: color.text.secondary, opacity: subtitleFade }}
            >
              {loadingSteps[loadingStepIdx]}
            </Animated.Text>
          ) : null}
          {mode === 'loading' && onCancel ? (
            <AiProcessingCancelButton
              color={color}
              onPress={onCancel}
              fullWidth
              variant="secondary"
              size="lg"
              className="mt-6"
            />
          ) : mode === 'success' ? (
            <Text
              className="mt-2 text-center text-[14px] leading-5"
              style={{ color: color.text.secondary }}
            >
              {successDescription}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};
