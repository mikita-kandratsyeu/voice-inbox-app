import Clipboard from '@react-native-clipboard/clipboard';
import { Check } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import Reanimated, {
  Easing as ReanimatedEasing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { openInAppBrowser } from '@/features/in-app-browser';
import type { Colors } from '@/shared/config';
import { hapticLight, hapticSelection, hapticSuccess, IS_ANDROID } from '@/shared/lib';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  Button,
  BUTTON_BORDER_RADIUS,
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
const COPY_PRESS_IN_MS = 70;
const COPY_SPRING_DAMPING = 14;
const COPY_SPRING_STIFFNESS = 280;
const COPY_OK_ICON_MS = 900;

type GitlabUserCodeCopyCardProps = {
  userCode: string;
  color: Colors;
  externalCopySignal?: number;
};

function GitlabUserCodeCopyCard({
  userCode,
  color,
  externalCopySignal = 0,
}: GitlabUserCodeCopyCardProps) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const [copied, setCopied] = useState(false);
  const resetCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetCopiedTimerRef.current) clearTimeout(resetCopiedTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    setCopied(false);
  }, [userCode]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const copyWithFeedback = useCallback(
    (options: { haptic: 'success' | 'light'; toast: boolean }) => {
      Clipboard.setString(userCode);
      if (options.haptic === 'light') {
        hapticLight();
      } else {
        hapticSuccess();
      }
      scale.value = withSequence(
        withTiming(0.94, {
          duration: COPY_PRESS_IN_MS,
          easing: ReanimatedEasing.out(ReanimatedEasing.quad),
        }),
        withSpring(1, { damping: COPY_SPRING_DAMPING, stiffness: COPY_SPRING_STIFFNESS }),
      );
      setCopied(true);
      if (resetCopiedTimerRef.current) clearTimeout(resetCopiedTimerRef.current);
      resetCopiedTimerRef.current = setTimeout(() => setCopied(false), COPY_OK_ICON_MS);
      if (options.toast && IS_ANDROID) {
        ToastAndroid.show(t('settings.gitlabSync.userCodeCopied'), ToastAndroid.SHORT);
      }
    },
    [scale, t, userCode],
  );

  useEffect(() => {
    if (externalCopySignal <= 0) return;
    copyWithFeedback({ haptic: 'light', toast: false });
  }, [copyWithFeedback, externalCopySignal]);

  const handlePress = useCallback(() => {
    copyWithFeedback({ haptic: 'success', toast: true });
  }, [copyWithFeedback]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={t('settings.gitlabSync.copyUserCode')}
      className="items-center rounded-2xl px-4 py-5"
      style={{
        backgroundColor: color.background.secondary,
        borderWidth: 1,
        borderColor: color.border.default,
      }}
    >
      <Reanimated.View className="w-full items-center" style={cardAnimStyle}>
        <Text
          className="text-xs font-medium tracking-wide uppercase"
          style={{ color: color.text.secondary }}
        >
          {t('settings.gitlabSync.connectUserCodeHint')}
        </Text>
        <Text
          className="mt-2 text-3xl font-bold tracking-[0.2em]"
          style={{ color: color.text.primary }}
        >
          {userCode}
        </Text>
        <View className="mt-2 min-h-4 flex-row items-center justify-center gap-1.5">
          {copied ? (
            <>
              <Check size={14} color={color.accent.primary} strokeWidth={2.5} />
              <Text className="text-xs font-medium" style={{ color: color.accent.primary }}>
                {t('settings.gitlabSync.userCodeCopied')}
              </Text>
            </>
          ) : (
            <Text className="text-xs" style={{ color: color.accent.primary }}>
              {t('settings.gitlabSync.copyUserCode')}
            </Text>
          )}
        </View>
      </Reanimated.View>
    </Pressable>
  );
}

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
          <GitlabUserCodeCopyCard
            userCode={userCode}
            color={color}
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
