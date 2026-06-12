import { Box, Server, Wifi } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ANIMATION_DURATIONS, type Colors, getAnimationDuration } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';
import type {
  DiscoveredPrivateRemoteServer,
  PrivateRemoteLanDiscoveryProgress,
  PrivateRemoteLanDiscoveryUnavailableReason,
  PrivateRemoteLanServerKind,
} from '@/shared/lib/ai-core/private-remote/privateRemoteLanDiscovery';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  RetryErrorState,
  SheetFooterButtons,
  SheetHeader,
} from '@/shared/ui';

import { PrivateRemoteSheetPickerRow } from './PrivateRemoteSheetPickerRow';

const SCANNER_SIZE = 136;
const PROGRESS_BAR_WIDTH = 172;
const NETWORK_NODE_COUNT = 3;

type PrivateRemoteLanDiscoverySheetProps = {
  visible: boolean;
  color: Colors;
  isScanning: boolean;
  progress: PrivateRemoteLanDiscoveryProgress | null;
  unavailableReason: PrivateRemoteLanDiscoveryUnavailableReason | null;
  limitedToLocalhost: boolean;
  servers: DiscoveredPrivateRemoteServer[];
  onClose: () => void;
  onCancelScan: () => void;
  onSelectServer: (server: DiscoveredPrivateRemoteServer) => void;
  onRetry: () => void;
};

function resolveKindAccent(kind: PrivateRemoteLanServerKind, color: Colors): string {
  switch (kind) {
    case 'ollama':
      return color.accent.primary;
    case 'lm_studio':
      return color.accent.transcript;
  }
}

function resolveKindIcon(kind: PrivateRemoteLanServerKind) {
  switch (kind) {
    case 'ollama':
      return Box;
    case 'lm_studio':
      return Server;
  }
}

type NetworkNodePosition = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

function NetworkNode({
  index,
  tint,
  position,
  wave,
}: {
  index: number;
  tint: string;
  position: NetworkNodePosition;
  wave: SharedValue<number>;
}) {
  const nodeStyle = useAnimatedStyle(() => {
    const rawDistance = Math.abs(wave.value - index);
    const distance = Math.min(rawDistance, NETWORK_NODE_COUNT - rawDistance);
    const active = interpolate(distance, [0, 0.9, 1.5], [1, 0.16, 0], Extrapolation.CLAMP);

    return {
      opacity: 0.45 + active * 0.55,
      shadowOpacity: 0.12 + active * 0.34,
      transform: [{ scale: 0.82 + active * 0.42 }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: tint,
          shadowColor: tint,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 7,
          ...position,
        },
        nodeStyle,
      ]}
    />
  );
}

function PrivateRemoteLanSearchAnimation({
  color,
  progress,
}: {
  color: Colors;
  progress: PrivateRemoteLanDiscoveryProgress | null;
}) {
  const { t } = useTranslation();
  const pulse = useSharedValue(0);
  const wave = useSharedValue(0);
  const progressValue = useSharedValue(0);

  const scanned = progress?.scanned ?? 0;
  const total = progress?.total ?? 0;
  const progressRatio = total > 0 ? Math.min(Math.max(scanned / total, 0), 1) : 0;

  useEffect(() => {
    const pulseDuration = getAnimationDuration(ANIMATION_DURATIONS.skeletonPulse);
    const waveDuration = getAnimationDuration(1500);

    pulse.value =
      pulseDuration === 0
        ? 1
        : withRepeat(
            withTiming(1, { duration: pulseDuration, easing: Easing.inOut(Easing.cubic) }),
            -1,
            true,
          );

    wave.value =
      waveDuration === 0
        ? 0
        : withRepeat(
            withTiming(NETWORK_NODE_COUNT, { duration: waveDuration, easing: Easing.linear }),
            -1,
            false,
          );
  }, [pulse, wave]);

  useEffect(() => {
    progressValue.value = withTiming(progressRatio, {
      duration: getAnimationDuration(260),
      easing: Easing.out(Easing.cubic),
    });
  }, [progressRatio, progressValue]);

  const outerRingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.24, 0.08]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.86, 1]) }],
  }));

  const middleRingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.32, 0.16]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.92, 1.04]) }],
  }));

  const progressFillStyle = useAnimatedStyle(() => ({
    width: progressValue.value * PROGRESS_BAR_WIDTH,
  }));

  const progressLabel =
    total > 0
      ? t('aiSettings.privateProvider.lanDiscovery.progress', { scanned, total })
      : t('aiSettings.privateProvider.lanDiscovery.subtitle');
  const currentTarget = progress?.currentTarget;

  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 18, paddingVertical: 24 }}>
      <View
        style={{
          width: SCANNER_SIZE,
          height: SCANNER_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: SCANNER_SIZE,
              height: SCANNER_SIZE,
              borderRadius: SCANNER_SIZE / 2,
              borderWidth: 1,
              borderColor: withAlphaHex(color.accent.primary, 0.3),
              backgroundColor: withAlphaHex(color.accent.primary, 0.06),
            },
            outerRingStyle,
          ]}
        />
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 96,
              height: 96,
              borderRadius: 48,
              borderWidth: 1,
              borderColor: withAlphaHex(color.accent.transcript, 0.32),
              backgroundColor: withAlphaHex(color.accent.transcript, 0.06),
            },
            middleRingStyle,
          ]}
        />
        <View
          style={{
            position: 'absolute',
            width: 54,
            height: 54,
            borderRadius: 27,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlphaHex(color.accent.primary, 0.12),
            borderColor: withAlphaHex(color.accent.primary, 0.24),
            borderWidth: 1,
          }}
        >
          <Wifi size={24} color={color.accent.primary} strokeWidth={2.1} />
        </View>

        {[
          { top: 24, right: 27, tint: color.accent.success },
          { bottom: 31, left: 22, tint: color.accent.transcript },
          { bottom: 22, right: 36, tint: color.accent.primary },
        ].map(({ tint, ...position }, index) => (
          <NetworkNode
            key={`${position.top ?? position.bottom}-${position.left ?? position.right}`}
            index={index}
            tint={tint}
            position={position}
            wave={wave}
          />
        ))}
      </View>

      <Text
        className="mt-3 text-center text-[13px] font-medium"
        style={{ color: color.text.secondary }}
      >
        {progressLabel}
      </Text>

      <View
        style={{
          width: PROGRESS_BAR_WIDTH,
          height: 4,
          marginTop: 10,
          overflow: 'hidden',
          borderRadius: 999,
          backgroundColor: withAlphaHex(color.accent.primary, 0.12),
        }}
      >
        <Animated.View
          style={[
            {
              height: 4,
              borderRadius: 999,
              backgroundColor: color.accent.primary,
            },
            progressFillStyle,
          ]}
        />
      </View>

      {currentTarget ? (
        <Text
          className="mt-2 text-center text-[12px] font-medium"
          style={{ color: color.text.muted }}
          numberOfLines={1}
        >
          {t('aiSettings.privateProvider.lanDiscovery.scanningTarget', {
            target: currentTarget,
          })}
        </Text>
      ) : null}
    </View>
  );
}

export function PrivateRemoteLanDiscoverySheet({
  visible,
  color,
  isScanning,
  progress,
  unavailableReason,
  limitedToLocalhost,
  servers,
  onClose,
  onCancelScan,
  onSelectServer,
  onRetry,
}: PrivateRemoteLanDiscoverySheetProps) {
  const { t } = useTranslation();

  const subtitle = (() => {
    if (unavailableReason != null || (servers.length === 0 && !isScanning)) {
      return undefined;
    }
    if (limitedToLocalhost) {
      return t('aiSettings.privateProvider.lanDiscovery.limitedToLocalhost');
    }
    if (isScanning && progress) {
      return t('aiSettings.privateProvider.lanDiscovery.progress', {
        scanned: progress.scanned,
        total: progress.total,
      });
    }
    return t('aiSettings.privateProvider.lanDiscovery.subtitle');
  })();

  const body = (() => {
    if (unavailableReason != null) {
      return (
        <RetryErrorState
          message={t(`aiSettings.privateProvider.lanDiscovery.unavailable.${unavailableReason}`)}
          onRetry={onRetry}
          retryLabel={t('common.retry')}
          color={color}
        />
      );
    }

    if (isScanning) {
      return <PrivateRemoteLanSearchAnimation color={color} progress={progress} />;
    }

    if (servers.length === 0) {
      return (
        <RetryErrorState
          message={t('aiSettings.privateProvider.lanDiscovery.empty')}
          onRetry={onRetry}
          retryLabel={t('aiSettings.privateProvider.lanDiscovery.scanAgain')}
          color={color}
        />
      );
    }

    return servers.map((server, index) => {
      const Icon = resolveKindIcon(server.kind);
      const accentHex = resolveKindAccent(server.kind, color);
      const kindLabel = t(`aiSettings.privateProvider.templates.${server.kind}`);
      const modelsPreview = server.sampleModels.join(', ');
      return (
        <PrivateRemoteSheetPickerRow
          key={server.baseUrl}
          label={server.baseUrl}
          subtitle={t('aiSettings.privateProvider.lanDiscovery.serverSubtitle', {
            kind: kindLabel,
            count: server.modelCount,
            models: modelsPreview,
          })}
          color={color}
          icon={Icon}
          accentHex={accentHex}
          showSelectionCheck={false}
          isLast={index === servers.length - 1}
          onPress={() => onSelectServer(server)}
        />
      );
    });
  })();

  return (
    <AppBottomSheetModal visible={visible} onClose={isScanning ? onCancelScan : onClose}>
      <AppBottomSheetContent scrollable bottomPadding={12}>
        <SheetHeader
          title={t('aiSettings.privateProvider.lanDiscovery.title')}
          subtitle={subtitle}
          color={color}
          marginBottom={16}
        />

        <View
          style={{
            backgroundColor: color.background.card,
            borderColor: color.border.default,
            borderRadius: 12,
            borderWidth: 1,
            overflow: 'hidden',
          }}
        >
          {unavailableReason != null || servers.length === 0 ? (
            <View style={{ padding: 16 }}>{body}</View>
          ) : (
            body
          )}
        </View>

        {isScanning ? (
          <SheetFooterButtons
            className="mt-4 w-full"
            color={color}
            primaryLabel={t('common.cancel')}
            onPrimaryPress={onCancelScan}
            singleVariant="secondary"
          />
        ) : null}
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
