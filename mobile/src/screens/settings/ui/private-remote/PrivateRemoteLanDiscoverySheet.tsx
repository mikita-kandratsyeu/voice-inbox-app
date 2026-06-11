import { Box, Server } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import type { Colors } from '@/shared/config';
import type {
  DiscoveredPrivateRemoteServer,
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

type PrivateRemoteLanDiscoverySheetProps = {
  visible: boolean;
  color: Colors;
  isScanning: boolean;
  progress: { scanned: number; total: number } | null;
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
    if (unavailableReason === 'not_on_local_network') {
      return t('aiSettings.privateProvider.lanDiscovery.unavailable.not_on_local_network');
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
    if (servers.length === 0 && !isScanning) {
      return t('aiSettings.privateProvider.lanDiscovery.empty');
    }
    return t('aiSettings.privateProvider.lanDiscovery.subtitle');
  })();

  const body = (() => {
    if (unavailableReason != null) {
      return (
        <RetryErrorState
          title={t('aiSettings.privateProvider.lanDiscovery.title')}
          message={t(`aiSettings.privateProvider.lanDiscovery.unavailable.${unavailableReason}`)}
          onRetry={onRetry}
          retryLabel={t('common.retry')}
          color={color}
        />
      );
    }

    if (isScanning) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: 28 }}>
          <ActivityIndicator size="small" color={color.accent.primary} />
        </View>
      );
    }

    if (servers.length === 0) {
      return (
        <RetryErrorState
          title={t('aiSettings.privateProvider.lanDiscovery.title')}
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
