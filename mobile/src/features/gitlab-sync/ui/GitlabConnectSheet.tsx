import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, Easing, Text, View } from 'react-native';

import { openInAppBrowser } from '@/features/in-app-browser';
import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  Button,
  BUTTON_BORDER_RADIUS,
  CopyableUserCodeCard,
  SheetHeader,
} from '@/shared/ui';
import {
  sheetFooterButtonContainerStyle,
  sheetFooterPrimaryButtonContainerStyle,
} from '@/shared/ui/bottom-sheet';

import { buildGitlabVerificationUriComplete } from '../lib/gitlabVerificationUri';
import { GitlabConnectCountdownBadge } from './GitlabConnectCountdownBadge';
import { GitlabIcon } from './GitlabIcon';

type Props = {
  visible: boolean;
  color: Colors;
  userCode: string | null;
  verificationUri: string | null;
  waiting: boolean;
  onClose: () => void;
  onCancel: () => void;
};

const AUTO_OPEN_DELAY_SEC = 3;
const ROW_BUTTON_CLASS = 'min-w-0 flex-1';

export function GitlabConnectSheet({
  visible,
  color,
  userCode,
  verificationUri,
  waiting,
  onClose,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const autoOpenedRef = useRef(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [secondsLeft, setSecondsLeft] = useState(AUTO_OPEN_DELAY_SEC);
  const [externalCopySignal, setExternalCopySignal] = useState(0);
  const canOpenGitlab = verificationUri != null && userCode != null;
  const countdownActive = secondsLeft > 0 && canOpenGitlab;

  const openGitlabVerification = useCallback(() => {
    if (!verificationUri || !userCode) return;
    setExternalCopySignal((prev) => prev + 1);
    const url = buildGitlabVerificationUriComplete(verificationUri, userCode);
    void openInAppBrowser(url).catch(() => {});
  }, [userCode, verificationUri]);

  useEffect(() => {
    if (!visible || !canOpenGitlab) {
      autoOpenedRef.current = false;
      progressAnim.stopAnimation();
      progressAnim.setValue(0);
      setSecondsLeft(AUTO_OPEN_DELAY_SEC);
      return;
    }
    if (autoOpenedRef.current) {
      return;
    }

    setSecondsLeft(AUTO_OPEN_DELAY_SEC);
    progressAnim.setValue(0);
    const progressAnimation = Animated.timing(progressAnim, {
      toValue: 1,
      duration: AUTO_OPEN_DELAY_SEC * 1_000,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    progressAnimation.start();

    const countdown = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1_000);

    const timer = setTimeout(() => {
      if (autoOpenedRef.current) {
        return;
      }
      autoOpenedRef.current = true;
      setSecondsLeft(0);
      progressAnim.setValue(1);
      openGitlabVerification();
    }, AUTO_OPEN_DELAY_SEC * 1_000);

    return () => {
      progressAnimation.stop();
      clearTimeout(timer);
      clearInterval(countdown);
    };
  }, [canOpenGitlab, openGitlabVerification, progressAnim, visible]);

  const handleOpenGitlab = useCallback(() => {
    if (!canOpenGitlab) return;
    hapticSelection();
    autoOpenedRef.current = true;
    progressAnim.stopAnimation();
    progressAnim.setValue(1);
    setSecondsLeft(0);
    openGitlabVerification();
  }, [canOpenGitlab, openGitlabVerification, progressAnim]);

  const handleCancel = useCallback(() => {
    onCancel();
    onClose();
  }, [onCancel, onClose]);

  const openGitlabLabel = t('settings.gitlabSync.openGitlab');
  const openGitlabAccessibilityLabel = countdownActive
    ? t('settings.gitlabSync.openGitlabInA11y', { seconds: secondsLeft })
    : openGitlabLabel;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <AppBottomSheetModal visible={visible} onClose={handleCancel}>
      <AppBottomSheetContent useTabletPadding>
        <SheetHeader
          title={t('settings.gitlabSync.connectSheetTitle')}
          subtitle={t('settings.gitlabSync.connectSheetBody')}
          icon={<GitlabIcon size={28} color={color.accent.primary} />}
          color={color}
          marginBottom={12}
        />
        <Text
          className="mb-5 text-center text-[13px] leading-[18px]"
          style={{ color: color.text.muted }}
        >
          {t('settings.gitlabSync.scopeHint')}
        </Text>

        {userCode ? (
          <CopyableUserCodeCard
            userCode={userCode}
            color={color}
            hint={t('settings.gitlabSync.connectUserCodeHint')}
            copyLabel={t('settings.gitlabSync.copyUserCode')}
            copiedLabel={t('settings.gitlabSync.userCodeCopied')}
            copyAccessibilityLabel={t('settings.gitlabSync.copyUserCode')}
            externalCopySignal={externalCopySignal}
          />
        ) : null}

        {waiting ? (
          <View className="mt-5 flex-row items-center justify-center gap-2">
            <ActivityIndicator color={color.accent.primary} />
            <Text className="text-sm" style={{ color: color.text.secondary }}>
              {t('settings.gitlabSync.waitingForGitlab')}
            </Text>
          </View>
        ) : null}

        <View className="mt-4 w-full flex-row gap-3">
          <View className={ROW_BUTTON_CLASS}>
            <Button
              variant="secondary"
              fullWidth
              label={t('common.cancel')}
              onPress={handleCancel}
              activeOpacity={0.8}
              color={color}
              containerStyle={sheetFooterButtonContainerStyle(color, 'secondary')}
            />
          </View>
          <View
            className={ROW_BUTTON_CLASS}
            style={{ borderRadius: BUTTON_BORDER_RADIUS, overflow: 'hidden' }}
          >
            <Button
              variant="primary"
              fullWidth
              label={openGitlabLabel}
              trailingIcon={
                countdownActive ? (
                  <GitlabConnectCountdownBadge
                    seconds={secondsLeft}
                    totalSeconds={AUTO_OPEN_DELAY_SEC}
                    tintColor={color.icon.onAccent}
                  />
                ) : undefined
              }
              onPress={handleOpenGitlab}
              activeOpacity={0.85}
              color={color}
              disabled={!canOpenGitlab}
              containerStyle={sheetFooterPrimaryButtonContainerStyle(color, {
                disabled: !canOpenGitlab,
              })}
              accessibilityLabel={openGitlabAccessibilityLabel}
            />
            {countdownActive ? (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: 2,
                  width: progressWidth,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                }}
              />
            ) : null}
          </View>
        </View>
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
