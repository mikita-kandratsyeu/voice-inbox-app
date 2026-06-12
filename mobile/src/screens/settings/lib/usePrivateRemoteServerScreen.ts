import NetInfo from '@react-native-community/netinfo';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Share } from 'react-native';

import { useSettingsStore } from '@/entities/settings';
import {
  type DiscoveredPrivateRemoteServer,
  discoverPrivateRemoteServersOnLan,
  type PrivateRemoteLanDiscoveryProgress,
  type PrivateRemoteLanDiscoveryUnavailableReason,
  readDeviceLanIpv4,
  resolvePrivateRemoteLanDiscoveryUnavailableReason,
} from '@/shared/lib/ai-core/private-remote/privateRemoteLanDiscovery';
import {
  type PrivateRemoteConnectionFailureReason,
  testPrivateRemoteConnection,
} from '@/shared/lib/ai-core/privateRemoteProvider';
import {
  getCachesDirectoryPath,
  getReadableDocumentPickerFsPath,
  NitroFS,
  pickSingleFileToCachesDirectory,
} from '@/shared/lib/fs';

import {
  PRIVATE_QUICK_TEMPLATES,
  PRIVATE_REMOTE_PROFILES_EXPORT_VERSION,
  type PrivateRemoteProfilesExportPayload,
  toFsPath,
  validatePrivateBaseUrl,
} from './privateRemoteServerShared';

type UsePrivateRemoteServerScreenOptions = {
  onConnectionSaved?: () => void;
};

export function usePrivateRemoteServerScreen(options: UsePrivateRemoteServerScreenOptions = {}) {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const privateRemoteBaseUrl = useSettingsStore((s) => s.privateRemoteBaseUrl);
  const setPrivateRemoteBaseUrl = useSettingsStore((s) => s.setPrivateRemoteBaseUrl);
  const privateRemoteApiKey = useSettingsStore((s) => s.privateRemoteApiKey);
  const setPrivateRemoteApiKey = useSettingsStore((s) => s.setPrivateRemoteApiKey);
  const privateRemoteModel = useSettingsStore((s) => s.privateRemoteModel);
  const setPrivateRemoteModel = useSettingsStore((s) => s.setPrivateRemoteModel);
  const setPrivateAiProvider = useSettingsStore((s) => s.setPrivateAiProvider);
  const privateRemoteLastSuccessfulBaseUrl = useSettingsStore(
    (s) => s.privateRemoteLastSuccessfulBaseUrl,
  );
  const privateRemoteLastSuccessfulApiKey = useSettingsStore(
    (s) => s.privateRemoteLastSuccessfulApiKey,
  );
  const privateRemoteLastSuccessfulModel = useSettingsStore(
    (s) => s.privateRemoteLastSuccessfulModel,
  );
  const setPrivateRemoteLastSuccessfulConfig = useSettingsStore(
    (s) => s.setPrivateRemoteLastSuccessfulConfig,
  );
  const privateRemoteProfiles = useSettingsStore((s) => s.privateRemoteProfiles);
  const privateRemoteActiveProfileId = useSettingsStore((s) => s.privateRemoteActiveProfileId);
  const upsertPrivateRemoteProfile = useSettingsStore((s) => s.upsertPrivateRemoteProfile);
  const setPrivateRemoteActiveProfile = useSettingsStore((s) => s.setPrivateRemoteActiveProfile);
  const removePrivateRemoteProfile = useSettingsStore((s) => s.removePrivateRemoteProfile);

  const [remoteModelListNonce, setRemoteModelListNonce] = React.useState(0);
  const [isTestingConnection, setIsTestingConnection] = React.useState(false);
  const [isExportingProfiles, setIsExportingProfiles] = React.useState(false);
  const [isImportingProfiles, setIsImportingProfiles] = React.useState(false);
  const [isReplacingApiKey, setIsReplacingApiKey] = React.useState(false);
  const [apiKeyDraft, setApiKeyDraft] = React.useState('');
  const didTouchRemoteConfigRef = React.useRef(false);
  const didInitializeRef = React.useRef(false);
  const [previousProfileBeforeCreateId, setPreviousProfileBeforeCreateId] = React.useState<
    string | null
  >(null);
  const lanDiscoveryAbortRef = React.useRef<AbortController | null>(null);
  const [lanDiscoveryVisible, setLanDiscoveryVisible] = React.useState(false);
  const [isDiscoveringLan, setIsDiscoveringLan] = React.useState(false);
  const [lanDiscoveryProgress, setLanDiscoveryProgress] =
    React.useState<PrivateRemoteLanDiscoveryProgress | null>(null);
  const [discoveredLanServers, setDiscoveredLanServers] = React.useState<
    DiscoveredPrivateRemoteServer[]
  >([]);
  const [lanDiscoveryUnavailable, setLanDiscoveryUnavailable] =
    React.useState<PrivateRemoteLanDiscoveryUnavailableReason | null>(null);
  const [lanDiscoveryLimitedToLocalhost, setLanDiscoveryLimitedToLocalhost] = React.useState(false);

  React.useEffect(() => {
    if (didInitializeRef.current) return;
    didInitializeRef.current = true;
    didTouchRemoteConfigRef.current = false;

    if (privateRemoteProfiles.length > 0) {
      const defaultProfileId = privateRemoteActiveProfileId ?? privateRemoteProfiles[0]?.id ?? null;
      if (defaultProfileId) {
        setPrivateRemoteActiveProfile(defaultProfileId);
      }
      setPreviousProfileBeforeCreateId(null);
      return;
    }

    setPrivateRemoteActiveProfile(null);
    setPreviousProfileBeforeCreateId(null);
    setPrivateRemoteBaseUrl('');
    setPrivateRemoteApiKey('');
    setPrivateRemoteModel('');
  }, [
    privateRemoteProfiles,
    privateRemoteActiveProfileId,
    setPrivateRemoteActiveProfile,
    setPrivateRemoteApiKey,
    setPrivateRemoteBaseUrl,
    setPrivateRemoteModel,
  ]);

  React.useEffect(() => {
    if (didTouchRemoteConfigRef.current) return;
    const isCreatingNewConnection =
      privateRemoteActiveProfileId == null && privateRemoteProfiles.length > 0;
    if (isCreatingNewConnection) return;
    const needsBaseUrl = privateRemoteBaseUrl.trim().length === 0;
    const needsModel = privateRemoteModel.trim().length === 0;
    const hasLastSuccess =
      privateRemoteLastSuccessfulBaseUrl.trim().length > 0 &&
      privateRemoteLastSuccessfulModel.trim().length > 0;
    if (!hasLastSuccess || (!needsBaseUrl && !needsModel)) return;

    setPrivateRemoteBaseUrl(privateRemoteLastSuccessfulBaseUrl);
    setPrivateRemoteModel(privateRemoteLastSuccessfulModel);
    if (
      privateRemoteApiKey.trim().length === 0 &&
      privateRemoteLastSuccessfulApiKey.trim().length > 0
    ) {
      setPrivateRemoteApiKey(privateRemoteLastSuccessfulApiKey);
    }
  }, [
    privateRemoteBaseUrl,
    privateRemoteModel,
    privateRemoteApiKey,
    privateRemoteActiveProfileId,
    privateRemoteProfiles.length,
    privateRemoteLastSuccessfulBaseUrl,
    privateRemoteLastSuccessfulApiKey,
    privateRemoteLastSuccessfulModel,
    setPrivateRemoteBaseUrl,
    setPrivateRemoteModel,
    setPrivateRemoteApiKey,
  ]);

  const baseUrlValidationError = React.useMemo(
    () => validatePrivateBaseUrl(privateRemoteBaseUrl),
    [privateRemoteBaseUrl],
  );
  const isRemoteModelFilled = privateRemoteModel.trim().length > 0;
  const canTestConnection =
    baseUrlValidationError == null && isRemoteModelFilled && !isTestingConnection;
  const isCreatingNewConnection = privateRemoteActiveProfileId == null;
  const hasSavedProfiles = privateRemoteProfiles.length > 0;
  const hasSavedApiKey = privateRemoteApiKey.trim().length > 0;
  const showMaskedSavedApiKey = hasSavedApiKey && !isReplacingApiKey;
  const effectiveApiKey = isReplacingApiKey ? apiKeyDraft : privateRemoteApiKey;

  React.useEffect(() => {
    setIsReplacingApiKey(false);
    setApiKeyDraft('');
  }, [privateRemoteActiveProfileId, isCreatingNewConnection]);

  const buildRemoteProfileName = React.useCallback(
    (baseUrl: string, model: string) => {
      const base = baseUrl.trim().toLowerCase();
      const provider = base.includes(':11434')
        ? t('aiSettings.privateProvider.templates.ollama')
        : base.includes(':1234')
          ? t('aiSettings.privateProvider.templates.lm_studio')
          : base.includes('api.openai.com')
            ? t('aiSettings.privateProvider.templates.openai')
            : base.includes('api.deepseek.com') || base.includes('deepseek.com')
              ? t('aiSettings.privateProvider.templates.deepseek')
              : base.includes('openrouter.ai')
                ? t('aiSettings.privateProvider.templates.openrouter')
                : base.includes('generativelanguage.googleapis.com')
                  ? t('aiSettings.privateProvider.templates.google')
                  : t('settings.privateRemoteProviderCustom');
      const trimmedModel = model.trim();
      return trimmedModel.length > 0 ? `${provider} · ${trimmedModel}` : provider;
    },
    [t],
  );

  const getConnectionFailureMessage = React.useCallback(
    (
      reason: PrivateRemoteConnectionFailureReason,
      model: string,
      models?: string[],
      fallbackError?: string,
    ) => {
      switch (reason) {
        case 'server_unreachable':
          return t('aiSettings.privateProvider.healthCheck.serverUnavailable');
        case 'auth_failed':
          return t('aiSettings.privateProvider.healthCheck.authFailed');
        case 'model_not_found': {
          const preview = (models ?? []).slice(0, 3).join(', ');
          return t('aiSettings.privateProvider.healthCheck.modelNotFound', {
            model,
            modelsPreview: preview || '—',
          });
        }
        case 'invalid_response':
          return fallbackError || t('aiSettings.privateProvider.healthCheck.invalidResponse');
        default:
          return fallbackError || t('aiSettings.privateProvider.connectionFailMessage');
      }
    },
    [t],
  );

  const switchToCreateConnectionMode = React.useCallback(() => {
    didTouchRemoteConfigRef.current = false;
    setIsReplacingApiKey(false);
    setApiKeyDraft('');
    setPreviousProfileBeforeCreateId(privateRemoteActiveProfileId);
    setPrivateRemoteActiveProfile(null);
    setPrivateRemoteBaseUrl('');
    setPrivateRemoteApiKey('');
    setPrivateRemoteModel('');
  }, [
    privateRemoteActiveProfileId,
    setPrivateRemoteActiveProfile,
    setPrivateRemoteApiKey,
    setPrivateRemoteBaseUrl,
    setPrivateRemoteModel,
  ]);

  const switchToSavedConnectionMode = React.useCallback(() => {
    didTouchRemoteConfigRef.current = false;
    const restoreProfileId = previousProfileBeforeCreateId ?? privateRemoteProfiles[0]?.id ?? null;
    if (restoreProfileId) {
      setPrivateRemoteActiveProfile(restoreProfileId);
    }
    setPreviousProfileBeforeCreateId(null);
  }, [previousProfileBeforeCreateId, privateRemoteProfiles, setPrivateRemoteActiveProfile]);

  const handleTestAndSaveRemoteConnection = React.useCallback(async () => {
    if (!canTestConnection || isTestingConnection) return;
    setIsTestingConnection(true);
    try {
      const result = await testPrivateRemoteConnection({
        privateRemoteBaseUrl,
        privateRemoteApiKey: effectiveApiKey,
        privateRemoteModel,
      });
      if (result.ok) {
        const profileId = privateRemoteActiveProfileId ?? `remote-${Date.now()}`;
        const profileName = buildRemoteProfileName(privateRemoteBaseUrl, privateRemoteModel);
        setPrivateRemoteApiKey(effectiveApiKey);
        setIsReplacingApiKey(false);
        setApiKeyDraft('');
        setPrivateRemoteLastSuccessfulConfig({
          baseUrl: privateRemoteBaseUrl,
          apiKey: effectiveApiKey,
          model: privateRemoteModel,
        });
        upsertPrivateRemoteProfile({
          id: profileId,
          name: profileName,
          baseUrl: privateRemoteBaseUrl,
          apiKey: effectiveApiKey,
          model: privateRemoteModel,
          updatedAt: Date.now(),
        });
        setPrivateAiProvider('custom_openai');
        Alert.alert(
          t('aiSettings.privateProvider.connectionOkTitle'),
          t('aiSettings.privateProvider.connectionOkMessage'),
          [
            {
              text: t('common.ok'),
              onPress: () => {
                options.onConnectionSaved?.();
                if (navigation.canGoBack()) {
                  navigation.goBack();
                }
              },
            },
          ],
        );
        return;
      }
      const message = getConnectionFailureMessage(
        result.reason,
        privateRemoteModel.trim(),
        result.models,
        result.error,
      );
      Alert.alert(t('aiSettings.privateProvider.connectionFailTitle'), message);
    } finally {
      setIsTestingConnection(false);
    }
  }, [
    buildRemoteProfileName,
    canTestConnection,
    getConnectionFailureMessage,
    isTestingConnection,
    navigation,
    options,
    privateRemoteActiveProfileId,
    effectiveApiKey,
    privateRemoteBaseUrl,
    privateRemoteModel,
    setPrivateAiProvider,
    setPrivateRemoteApiKey,
    setPrivateRemoteLastSuccessfulConfig,
    t,
    upsertPrivateRemoteProfile,
  ]);

  const exportRemoteProfiles = React.useCallback(async () => {
    if (privateRemoteProfiles.length === 0) {
      Alert.alert(
        t('aiSettings.privateProvider.exportEmptyTitle'),
        t('aiSettings.privateProvider.savedConnectionsEmpty'),
      );
      return;
    }

    setIsExportingProfiles(true);
    const cacheDir = getCachesDirectoryPath();
    const timestamp = Date.now();
    const filePath = `${cacheDir}/voice-inbox-remote-profiles-${timestamp}.json`;
    try {
      const payload: PrivateRemoteProfilesExportPayload = {
        version: PRIVATE_REMOTE_PROFILES_EXPORT_VERSION,
        exportedAt: new Date(timestamp).toISOString(),
        profiles: privateRemoteProfiles.map((profile) => ({
          name: profile.name,
          baseUrl: profile.baseUrl,
          model: profile.model,
        })),
      };
      await NitroFS.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
      await Share.share({
        url: `file://${filePath}`,
        title: t('aiSettings.privateProvider.exportTitle'),
      });
    } catch {
      Alert.alert(
        t('aiSettings.privateProvider.exportFailedTitle'),
        t('aiSettings.privateProvider.exportFailedMessage'),
      );
    } finally {
      setIsExportingProfiles(false);
      try {
        const exists = await NitroFS.exists(filePath);
        if (exists) await NitroFS.unlink(filePath);
      } catch {
        // ignore temp cleanup failures
      }
    }
  }, [privateRemoteProfiles, t]);

  const importRemoteProfiles = React.useCallback(async () => {
    setIsImportingProfiles(true);
    let pickedFsPath: string | null = null;
    try {
      const picked = await pickSingleFileToCachesDirectory();
      if (picked.kind === 'canceled') return;
      if (picked.kind === 'failed') {
        Alert.alert(
          t('aiSettings.privateProvider.importFailedTitle'),
          t('aiSettings.privateProvider.importFailedMessage'),
        );
        return;
      }
      const fileLike = {
        uri: picked.localUri,
        fileUri: picked.localUri,
        fileCopyUri: picked.localUri,
      };
      const fsPath = await getReadableDocumentPickerFsPath(fileLike);
      if (!fsPath) {
        Alert.alert(
          t('aiSettings.privateProvider.importInvalidTitle'),
          t('aiSettings.privateProvider.importInvalidMessage'),
        );
        return;
      }
      pickedFsPath = fsPath;
      const raw = await NitroFS.readFile(fsPath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<PrivateRemoteProfilesExportPayload>;
      const profilesRaw = Array.isArray(parsed?.profiles) ? parsed.profiles : [];
      const validProfiles = profilesRaw
        .map((profile) => ({
          name: typeof profile?.name === 'string' ? profile.name.trim() : '',
          baseUrl: typeof profile?.baseUrl === 'string' ? profile.baseUrl.trim() : '',
          model: typeof profile?.model === 'string' ? profile.model.trim() : '',
        }))
        .filter((profile) => profile.baseUrl.length > 0 && profile.model.length > 0);

      if (validProfiles.length === 0) {
        Alert.alert(
          t('aiSettings.privateProvider.importInvalidTitle'),
          t('aiSettings.privateProvider.importInvalidMessage'),
        );
        return;
      }

      const existingBySignature = new Map(
        privateRemoteProfiles.map((profile) => [
          `${profile.baseUrl.trim().toLowerCase()}|${profile.model.trim().toLowerCase()}`,
          profile,
        ]),
      );

      let importedCount = 0;
      for (const profile of validProfiles) {
        const signature = `${profile.baseUrl.toLowerCase()}|${profile.model.toLowerCase()}`;
        const existing = existingBySignature.get(signature);
        const id = existing?.id ?? `remote-import-${Date.now()}-${importedCount}`;
        const name =
          profile.name.length > 0
            ? profile.name
            : buildRemoteProfileName(profile.baseUrl, profile.model);
        upsertPrivateRemoteProfile({
          id,
          name,
          baseUrl: profile.baseUrl,
          model: profile.model,
          apiKey: existing?.apiKey ?? '',
          updatedAt: Date.now(),
        });
        importedCount += 1;
      }

      Alert.alert(
        t('aiSettings.privateProvider.importSuccessTitle'),
        t('aiSettings.privateProvider.importSuccessMessage', { count: importedCount }),
      );
    } catch {
      Alert.alert(
        t('aiSettings.privateProvider.importFailedTitle'),
        t('aiSettings.privateProvider.importFailedMessage'),
      );
    } finally {
      setIsImportingProfiles(false);
      if (pickedFsPath) {
        try {
          const normalized = toFsPath(pickedFsPath);
          const exists = await NitroFS.exists(normalized);
          if (exists) await NitroFS.unlink(normalized);
        } catch {
          // ignore temp cleanup failures
        }
      }
    }
  }, [buildRemoteProfileName, privateRemoteProfiles, t, upsertPrivateRemoteProfile]);

  const applyQuickTemplate = React.useCallback(
    (baseUrl: string, model: string) => {
      didTouchRemoteConfigRef.current = false;
      setPrivateRemoteBaseUrl(baseUrl);
      setPrivateRemoteModel(model);
      setRemoteModelListNonce((n) => n + 1);
    },
    [setPrivateRemoteBaseUrl, setPrivateRemoteModel],
  );

  React.useEffect(
    () => () => {
      lanDiscoveryAbortRef.current?.abort();
    },
    [],
  );

  const runLanDiscovery = React.useCallback(async () => {
    lanDiscoveryAbortRef.current?.abort();
    const controller = new AbortController();
    lanDiscoveryAbortRef.current = controller;

    setLanDiscoveryVisible(true);
    setIsDiscoveringLan(true);
    setDiscoveredLanServers([]);
    setLanDiscoveryProgress(null);
    setLanDiscoveryUnavailable(null);
    setLanDiscoveryLimitedToLocalhost(false);

    const net = await NetInfo.fetch();
    const unavailable = resolvePrivateRemoteLanDiscoveryUnavailableReason(net);
    if (unavailable) {
      setLanDiscoveryUnavailable(unavailable);
      setIsDiscoveringLan(false);
      return;
    }

    const deviceIp = readDeviceLanIpv4(net);
    if (!deviceIp) {
      setLanDiscoveryLimitedToLocalhost(true);
    }

    try {
      const servers = await discoverPrivateRemoteServersOnLan({
        deviceIp,
        apiKey: privateRemoteApiKey,
        signal: controller.signal,
        onProgress: (progress: PrivateRemoteLanDiscoveryProgress) => {
          setLanDiscoveryProgress(progress);
        },
      });
      if (!controller.signal.aborted) {
        setDiscoveredLanServers(servers);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsDiscoveringLan(false);
      }
    }
  }, [privateRemoteApiKey]);

  const closeLanDiscovery = React.useCallback(() => {
    setLanDiscoveryVisible(false);
    setLanDiscoveryUnavailable(null);
    setLanDiscoveryProgress(null);
    setDiscoveredLanServers([]);
  }, []);

  const cancelLanDiscovery = React.useCallback(() => {
    lanDiscoveryAbortRef.current?.abort();
    lanDiscoveryAbortRef.current = null;
    setIsDiscoveringLan(false);
    closeLanDiscovery();
  }, [closeLanDiscovery]);

  const selectDiscoveredLanServer = React.useCallback(
    (server: DiscoveredPrivateRemoteServer) => {
      didTouchRemoteConfigRef.current = true;
      setPrivateRemoteBaseUrl(server.baseUrl);
      if (server.sampleModels[0]) {
        setPrivateRemoteModel(server.sampleModels[0]);
      }
      setRemoteModelListNonce((n) => n + 1);
      closeLanDiscovery();
    },
    [closeLanDiscovery, setPrivateRemoteBaseUrl, setPrivateRemoteModel],
  );

  const onBaseUrlChange = React.useCallback(
    (value: string) => {
      didTouchRemoteConfigRef.current = true;
      setPrivateRemoteBaseUrl(value);
      setRemoteModelListNonce((n) => n + 1);
    },
    [setPrivateRemoteBaseUrl],
  );

  const onModelChange = React.useCallback(
    (value: string) => {
      didTouchRemoteConfigRef.current = true;
      setPrivateRemoteModel(value);
    },
    [setPrivateRemoteModel],
  );

  const onApiKeyChange = React.useCallback(
    (value: string) => {
      if (showMaskedSavedApiKey) return;
      if (isReplacingApiKey) {
        setApiKeyDraft(value);
        return;
      }
      setPrivateRemoteApiKey(value);
    },
    [isReplacingApiKey, setPrivateRemoteApiKey, showMaskedSavedApiKey],
  );

  const startReplacingApiKey = React.useCallback(() => {
    setIsReplacingApiKey(true);
    setApiKeyDraft('');
  }, []);

  const connectAccessibilityLabel = isCreatingNewConnection
    ? t('aiSettings.privateProvider.testAndSaveConnection')
    : t('aiSettings.privateProvider.testAndUpdateConnection');

  return {
    quickTemplates: PRIVATE_QUICK_TEMPLATES,
    privateRemoteBaseUrl,
    privateRemoteApiKey,
    effectiveApiKey,
    apiKeyDraft,
    privateRemoteModel,
    showMaskedSavedApiKey,
    isReplacingApiKey,
    privateRemoteProfiles,
    privateRemoteActiveProfileId,
    setPrivateRemoteActiveProfile,
    removePrivateRemoteProfile,
    setPrivateRemoteApiKey,
    onApiKeyChange,
    startReplacingApiKey,
    remoteModelListNonce,
    baseUrlValidationError,
    canTestConnection,
    isTestingConnection,
    isCreatingNewConnection,
    hasSavedProfiles,
    isExportingProfiles,
    isImportingProfiles,
    switchToCreateConnectionMode,
    switchToSavedConnectionMode,
    handleTestAndSaveRemoteConnection,
    exportRemoteProfiles,
    importRemoteProfiles,
    applyQuickTemplate,
    onBaseUrlChange,
    onModelChange,
    connectAccessibilityLabel,
    lanDiscoveryVisible,
    isDiscoveringLan,
    lanDiscoveryProgress,
    discoveredLanServers,
    lanDiscoveryUnavailable,
    lanDiscoveryLimitedToLocalhost,
    runLanDiscovery,
    closeLanDiscovery,
    cancelLanDiscovery,
    selectDiscoveredLanServer,
  };
}
