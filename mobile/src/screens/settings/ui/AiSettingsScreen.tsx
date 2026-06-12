import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, Crown } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { openPlanPaywall } from '@/app/navigation/openPlanPaywall';
import type { SettingsStackParamList } from '@/app/navigation/types';
import type {
  AiOutputLanguage,
  PrivateAiProvider,
  PrivateLocalLlmBudget,
  PrivateRemoteOutputBudget,
  SummaryStyle,
  TaskStrictness,
} from '@/entities/settings';
import { useSettingsStore } from '@/entities/settings';
import { type CloudAiKvTtlSeconds } from '@/entities/settings/lib/cloudAiKvTtl';
import { isMeetingSpeakerSettingsAvailable } from '@/features/ai-processing/lib/meetingSpeakerBreakdown';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { useProEntitlement } from '@/features/pro-license';
import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import {
  type PrivateRemoteConnectionFailureReason,
  testPrivateRemoteConnection,
} from '@/shared/lib/ai-core/privateRemoteProvider';
import { ScreenHeader, SettingsRow, SettingsSection } from '@/shared/ui';

import { validatePrivateBaseUrl } from '../lib/privateRemoteServerShared';
import { AutomationComingSoonSheet } from './AutomationComingSoonSheet';
import { CloudAiKvTtlSlider } from './CloudAiKvTtlSlider';

const SUMMARY_STYLES: SummaryStyle[] = ['brief', 'standard', 'detailed'];
const TASK_STRICTNESS_OPTIONS: TaskStrictness[] = ['strict', 'balanced', 'soft'];
const OUTPUT_LANGUAGES: AiOutputLanguage[] = ['same', 'ru', 'en'];
const PRIVATE_LOCAL_LLM_BUDGETS: PrivateLocalLlmBudget[] = ['efficient', 'balanced', 'expanded'];
const PRIVATE_REMOTE_OUTPUT_BUDGETS: PrivateRemoteOutputBudget[] = [
  'efficient',
  'balanced',
  'expanded',
  'unlimited',
];
const PRIVATE_AI_PROVIDERS: PrivateAiProvider[] = ['local', 'custom_openai'];
type PickerRowProps<T extends string | number> = {
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  labelKey: (value: T) => string;
  color: Colors;
};

function PickerSection<T extends string | number>({
  options,
  selected,
  onSelect,
  labelKey,
  color,
}: PickerRowProps<T>) {
  return (
    <View
      className="overflow-hidden rounded-2xl"
      style={{ backgroundColor: color.background.card }}
    >
      {options.map((opt, index) => {
        const isSelected = opt === selected;
        const isLast = index === options.length - 1;
        const rowKey = typeof opt === 'number' ? `n-${opt}` : opt;
        return (
          <TouchableOpacity
            key={rowKey}
            onPress={() => onSelect(opt)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={labelKey(opt)}
            accessibilityState={{ selected: isSelected }}
            className="flex-row items-center justify-between px-4 py-3.5"
            style={
              !isLast
                ? { borderBottomWidth: 1, borderBottomColor: color.border.default }
                : undefined
            }
          >
            <Text className="text-[16px]" style={{ color: color.text.primary }}>
              {labelKey(opt)}
            </Text>
            {isSelected ? (
              <View
                className="h-6 w-6 rounded-full items-center justify-center"
                style={{ backgroundColor: color.accent.primary }}
              >
                <Check size={14} color="#ffffff" strokeWidth={2.5} />
              </View>
            ) : (
              <View
                className="h-6 w-6 rounded-full"
                style={{ borderWidth: 2, borderColor: color.border.default }}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export const AiSettingsScreen = () => {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const route = useRoute<RouteProp<SettingsStackParamList, 'AiSettings'>>();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const isTablet = useIsTablet();

  const summaryStyle = useSettingsStore((s) => s.summaryStyle);
  const setSummaryStyle = useSettingsStore((s) => s.setSummaryStyle);
  const taskStrictness = useSettingsStore((s) => s.taskStrictness);
  const setTaskStrictness = useSettingsStore((s) => s.setTaskStrictness);
  const aiOutputLanguage = useSettingsStore((s) => s.aiOutputLanguage);
  const setAiOutputLanguage = useSettingsStore((s) => s.setAiOutputLanguage);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateLocalLlmBudget = useSettingsStore((s) => s.privateLocalLlmBudget);
  const setPrivateLocalLlmBudget = useSettingsStore((s) => s.setPrivateLocalLlmBudget);
  const privateRemoteOutputBudget = useSettingsStore((s) => s.privateRemoteOutputBudget);
  const setPrivateRemoteOutputBudget = useSettingsStore((s) => s.setPrivateRemoteOutputBudget);
  const privateRemotePreferJsonObject = useSettingsStore((s) => s.privateRemotePreferJsonObject);
  const setPrivateRemotePreferJsonObject = useSettingsStore(
    (s) => s.setPrivateRemotePreferJsonObject,
  );
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const setPrivateAiProvider = useSettingsStore((s) => s.setPrivateAiProvider);
  const privateRemoteBaseUrl = useSettingsStore((s) => s.privateRemoteBaseUrl);
  const privateRemoteApiKey = useSettingsStore((s) => s.privateRemoteApiKey);
  const privateRemoteModel = useSettingsStore((s) => s.privateRemoteModel);
  const privateRemoteLastSuccessfulBaseUrl = useSettingsStore(
    (s) => s.privateRemoteLastSuccessfulBaseUrl,
  );
  const privateRemoteLastSuccessfulApiKey = useSettingsStore(
    (s) => s.privateRemoteLastSuccessfulApiKey,
  );
  const privateRemoteLastSuccessfulModel = useSettingsStore(
    (s) => s.privateRemoteLastSuccessfulModel,
  );
  const cloudAiKvTtlSeconds = useSettingsStore((s) => s.cloudAiKvTtlSeconds);
  const setCloudAiKvTtlSeconds = useSettingsStore((s) => s.setCloudAiKvTtlSeconds);
  const showSummaryReasoningInNotes = useSettingsStore((s) => s.showSummaryReasoningInNotes);
  const setShowSummaryReasoningInNotes = useSettingsStore((s) => s.setShowSummaryReasoningInNotes);
  const autoRefreshMeetingSpeakersOnRegen = useSettingsStore(
    (s) => s.autoRefreshMeetingSpeakersOnRegen,
  );
  const setAutoRefreshMeetingSpeakersOnRegen = useSettingsStore(
    (s) => s.setAutoRefreshMeetingSpeakersOnRegen,
  );
  const { isProActive } = useProEntitlement();
  const isPrivateMode = aiExecutionMode === 'private_experimental';
  const customProviderLocked = !isProActive;
  const showMeetingSpeakerSettings = isMeetingSpeakerSettingsAvailable(
    aiExecutionMode,
    privateAiProvider,
    isProActive,
  );
  const [privateServerProSheet, setPrivateServerProSheet] = React.useState(false);
  const [isAutoTestingProviderConnection, setIsAutoTestingProviderConnection] =
    React.useState(false);
  const [lastConnectionCheckOk, setLastConnectionCheckOk] = React.useState<boolean | null>(null);
  const [lastConnectionFailureReason, setLastConnectionFailureReason] =
    React.useState<PrivateRemoteConnectionFailureReason | null>(null);
  const didRunInitialProviderCheckRef = React.useRef(false);
  const skipNextFocusConnectionCheckRef = React.useRef(true);

  React.useEffect(() => {
    if (customProviderLocked && privateAiProvider === 'custom_openai') {
      setPrivateAiProvider('local');
    }
  }, [customProviderLocked, privateAiProvider, setPrivateAiProvider]);

  const cloudRetentionLabel = (sec: CloudAiKvTtlSeconds) =>
    t(`aiSettings.smartModeCloudRetention.m${sec}`);
  const hasSavedRemoteConfig =
    privateRemoteLastSuccessfulBaseUrl.trim().length > 0 &&
    privateRemoteLastSuccessfulModel.trim().length > 0;
  const connectionCheckInProgress = isAutoTestingProviderConnection;
  const remoteConnectionStatusLabel = connectionCheckInProgress
    ? t('aiSettings.privateProvider.connectionStatus.checking')
    : lastConnectionCheckOk == null
      ? hasSavedRemoteConfig
        ? t('aiSettings.privateProvider.connectionStatus.connected')
        : t('aiSettings.privateProvider.connectionStatus.disconnected')
      : lastConnectionCheckOk
        ? t('aiSettings.privateProvider.connectionStatus.connected')
        : lastConnectionFailureReason === 'auth_failed'
          ? t('aiSettings.privateProvider.connectionStatus.authFailed')
          : lastConnectionFailureReason === 'model_not_found'
            ? t('aiSettings.privateProvider.connectionStatus.modelNotFound')
            : lastConnectionFailureReason === 'server_unreachable'
              ? t('aiSettings.privateProvider.connectionStatus.serverUnavailable')
              : t('aiSettings.privateProvider.connectionStatus.invalidResponse');
  const remoteConnectionStatusColor = connectionCheckInProgress
    ? color.text.muted
    : lastConnectionCheckOk === true || (lastConnectionCheckOk == null && hasSavedRemoteConfig)
      ? color.accent.success
      : color.accent.delete;
  const openPrivateRemoteServerScreen = React.useCallback(() => {
    if (!isProActive) {
      setPrivateServerProSheet(true);
      return;
    }
    navigation.navigate('PrivateRemoteServer');
  }, [isProActive, navigation]);
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
  const runRemoteConnectionCheck = React.useCallback(
    async (
      config: { baseUrl: string; apiKey: string; model: string },
      showFailureAlert = false,
    ) => {
      const isConfigReady =
        validatePrivateBaseUrl(config.baseUrl) == null && config.model.trim().length > 0;
      if (!isConfigReady) return;

      setIsAutoTestingProviderConnection(true);
      try {
        const result = await testPrivateRemoteConnection({
          privateRemoteBaseUrl: config.baseUrl,
          privateRemoteApiKey: config.apiKey,
          privateRemoteModel: config.model,
        });
        setLastConnectionCheckOk(result.ok);
        setLastConnectionFailureReason(result.ok ? null : result.reason);
        if (showFailureAlert && !result.ok) {
          const message = getConnectionFailureMessage(
            result.reason,
            config.model.trim(),
            result.models,
            result.error,
          );
          Alert.alert(t('aiSettings.privateProvider.connectionFailTitle'), message);
        }
      } finally {
        setIsAutoTestingProviderConnection(false);
      }
    },
    [getConnectionFailureMessage, t],
  );
  const handlePrivateProviderSelect = React.useCallback(
    async (provider: PrivateAiProvider) => {
      if (provider === 'custom_openai' && !isProActive) {
        setPrivateServerProSheet(true);
        return;
      }
      setPrivateAiProvider(provider);
      if (provider !== 'custom_openai') return;

      const baseUrlCandidate =
        privateRemoteBaseUrl.trim().length > 0
          ? privateRemoteBaseUrl
          : privateRemoteLastSuccessfulBaseUrl;
      const modelCandidate =
        privateRemoteModel.trim().length > 0
          ? privateRemoteModel
          : privateRemoteLastSuccessfulModel;
      const apiKeyCandidate =
        privateRemoteApiKey.trim().length > 0
          ? privateRemoteApiKey
          : privateRemoteLastSuccessfulApiKey;
      await runRemoteConnectionCheck(
        {
          baseUrl: baseUrlCandidate,
          apiKey: apiKeyCandidate,
          model: modelCandidate,
        },
        false,
      );
    },
    [
      isProActive,
      privateRemoteBaseUrl,
      privateRemoteModel,
      privateRemoteApiKey,
      privateRemoteLastSuccessfulBaseUrl,
      privateRemoteLastSuccessfulApiKey,
      privateRemoteLastSuccessfulModel,
      setPrivateAiProvider,
      runRemoteConnectionCheck,
    ],
  );

  React.useEffect(() => {
    if (!route.params?.focusPrivateServer) return;

    navigation.setParams({ focusPrivateServer: undefined });

    if (!isPrivateMode) return;

    if (customProviderLocked) {
      setPrivateServerProSheet(true);
      return;
    }

    if (privateAiProvider !== 'custom_openai') {
      void handlePrivateProviderSelect('custom_openai');
    }
    openPrivateRemoteServerScreen();
  }, [
    route.params?.focusPrivateServer,
    navigation,
    isPrivateMode,
    customProviderLocked,
    privateAiProvider,
    handlePrivateProviderSelect,
    openPrivateRemoteServerScreen,
  ]);

  const refreshRemoteConnectionStatus = React.useCallback(() => {
    if (privateAiProvider !== 'custom_openai') return;
    const baseUrlCandidate =
      privateRemoteBaseUrl.trim().length > 0
        ? privateRemoteBaseUrl
        : privateRemoteLastSuccessfulBaseUrl;
    const modelCandidate =
      privateRemoteModel.trim().length > 0 ? privateRemoteModel : privateRemoteLastSuccessfulModel;
    const apiKeyCandidate =
      privateRemoteApiKey.trim().length > 0
        ? privateRemoteApiKey
        : privateRemoteLastSuccessfulApiKey;
    void runRemoteConnectionCheck({
      baseUrl: baseUrlCandidate,
      apiKey: apiKeyCandidate,
      model: modelCandidate,
    });
  }, [
    privateAiProvider,
    privateRemoteApiKey,
    privateRemoteBaseUrl,
    privateRemoteLastSuccessfulApiKey,
    privateRemoteLastSuccessfulBaseUrl,
    privateRemoteLastSuccessfulModel,
    privateRemoteModel,
    runRemoteConnectionCheck,
  ]);

  React.useEffect(() => {
    if (didRunInitialProviderCheckRef.current) return;
    if (privateAiProvider !== 'custom_openai') return;
    didRunInitialProviderCheckRef.current = true;
    refreshRemoteConnectionStatus();
  }, [privateAiProvider, refreshRemoteConnectionStatus]);

  useFocusEffect(
    React.useCallback(() => {
      if (skipNextFocusConnectionCheckRef.current) {
        skipNextFocusConnectionCheckRef.current = false;
        return;
      }
      refreshRemoteConnectionStatus();
    }, [refreshRemoteConnectionStatus]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('aiSettings.title')} onBack={() => navigation.goBack()} />
      <View
        style={{
          flex: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="mb-4 text-[14px] leading-5" style={{ color: color.text.secondary }}>
            {t('aiSettings.description')}
          </Text>
          {isPrivateMode && (
            <>
              <View className="mb-7">
                <View className="mb-2.5 flex-row items-center gap-1 px-1">
                  <Text
                    className="text-xs font-semibold uppercase tracking-widest"
                    style={{ color: color.text.secondary }}
                  >
                    {t('aiSettings.privateProvider.title')}
                  </Text>
                  {customProviderLocked ? (
                    <View className="flex-row items-center gap-1">
                      <Crown size={14} color={color.accent.primary} strokeWidth={2} />
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: color.accent.primary }}
                      >
                        {t('common.pro')}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  className="mb-2 px-1 text-[13px] leading-5"
                  style={{ color: color.text.muted }}
                >
                  {t('aiSettings.privateProvider.description')}
                </Text>
                <TouchableOpacity
                  activeOpacity={customProviderLocked ? 0.85 : 1}
                  disabled={!customProviderLocked}
                  onPress={() => setPrivateServerProSheet(true)}
                  accessibilityRole={customProviderLocked ? 'button' : undefined}
                  accessibilityLabel={
                    customProviderLocked ? t('aiSettings.privateProvider.proOnlyA11y') : undefined
                  }
                  accessibilityHint={
                    customProviderLocked ? t('aiSettings.privateProvider.proOnlyHint') : undefined
                  }
                >
                  <View
                    className="flex-row rounded-xl p-1"
                    style={{
                      backgroundColor: color.background.tertiary,
                      opacity: customProviderLocked ? 0.7 : 1,
                    }}
                    pointerEvents={customProviderLocked ? 'none' : 'auto'}
                  >
                    {PRIVATE_AI_PROVIDERS.map((provider) => {
                      const isSelected = privateAiProvider === provider;
                      return (
                        <TouchableOpacity
                          key={provider}
                          onPress={() => {
                            if (isSelected) return;
                            void handlePrivateProviderSelect(provider);
                          }}
                          activeOpacity={0.8}
                          className="flex-1 items-center justify-center rounded-lg px-2 py-3"
                          style={{
                            minHeight: 44,
                            backgroundColor: isSelected ? color.background.card : 'transparent',
                            borderWidth: isSelected ? 1 : 0,
                            borderColor: isSelected ? color.accent.primary : 'transparent',
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={t(`aiSettings.privateProvider.${provider}`)}
                          accessibilityState={{ selected: isSelected }}
                        >
                          <Text
                            className="text-center text-[14px] font-medium"
                            numberOfLines={2}
                            style={{
                              color: isSelected ? color.accent.primary : color.text.secondary,
                            }}
                          >
                            {t(`aiSettings.privateProvider.${provider}`)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </TouchableOpacity>
              </View>
              {privateAiProvider === 'custom_openai' ? (
                <View className="mb-7">
                  <Text
                    className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: color.text.secondary }}
                  >
                    {t('aiSettings.privateProvider.serverConfig')}
                  </Text>
                  <Text
                    className="mb-2 px-1 text-[13px] leading-5"
                    style={{ color: color.text.muted }}
                  >
                    {t('aiSettings.privateProvider.serverConfigHint')}
                  </Text>
                  <View
                    className="overflow-hidden rounded-2xl"
                    style={{
                      borderWidth: 1,
                      borderColor: color.border.default,
                    }}
                  >
                    <SettingsRow
                      label={
                        hasSavedRemoteConfig
                          ? remoteConnectionStatusLabel
                          : t('aiSettings.privateProvider.notConfiguredTitle')
                      }
                      labelClassName={hasSavedRemoteConfig ? 'font-semibold' : undefined}
                      subtitle={
                        hasSavedRemoteConfig
                          ? `${privateRemoteLastSuccessfulBaseUrl}\n${t(
                              'aiSettings.privateProvider.savedModelLabel',
                              {
                                model: privateRemoteLastSuccessfulModel,
                              },
                            )}`
                          : t('aiSettings.privateProvider.notConfiguredHint')
                      }
                      leftIcon={
                        <View
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: remoteConnectionStatusColor }}
                        />
                      }
                      loading={connectionCheckInProgress}
                      onPress={openPrivateRemoteServerScreen}
                      isFirst
                      isLast
                    />
                  </View>
                </View>
              ) : null}
              {privateAiProvider === 'custom_openai' ? (
                <View className="mb-7">
                  <Text
                    className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: color.text.secondary }}
                  >
                    {t('aiSettings.privateRemoteGeneration.title')}
                  </Text>
                  <Text
                    className="mb-2 px-1 text-[13px] leading-5"
                    style={{ color: color.text.muted }}
                  >
                    {t('aiSettings.privateRemoteGeneration.hint')}
                  </Text>
                  <View
                    className="mb-3 overflow-hidden rounded-2xl"
                    style={{ borderWidth: 1, borderColor: color.border.default }}
                  >
                    <PickerSection
                      options={PRIVATE_REMOTE_OUTPUT_BUDGETS}
                      selected={privateRemoteOutputBudget}
                      onSelect={setPrivateRemoteOutputBudget}
                      labelKey={(v) => t(`aiSettings.privateRemoteGeneration.${v}`)}
                      color={color}
                    />
                  </View>
                  <View
                    className="overflow-hidden rounded-2xl"
                    style={{ borderWidth: 1, borderColor: color.border.default }}
                  >
                    <SettingsRow
                      label={t('aiSettings.privateRemoteGeneration.jsonObjectLabel')}
                      subtitle={t('aiSettings.privateRemoteGeneration.jsonObjectHint')}
                      rightSlot={
                        <Switch
                          value={privateRemotePreferJsonObject}
                          onValueChange={setPrivateRemotePreferJsonObject}
                          accessibilityLabel={t(
                            'aiSettings.privateRemoteGeneration.jsonObjectA11y',
                          )}
                          trackColor={{
                            false: color.background.tertiary,
                            true: color.accent.primary,
                          }}
                          thumbColor={color.icon.onAccent}
                        />
                      }
                      showChevron={false}
                      isFirst
                      isLast
                    />
                  </View>
                </View>
              ) : null}
              {privateAiProvider === 'local' ? (
                <View className="mb-7">
                  <Text
                    className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: color.text.secondary }}
                  >
                    {t('aiSettings.privateLocalGeneration')}
                  </Text>
                  <Text
                    className="mb-2 px-1 text-[13px] leading-5"
                    style={{ color: color.text.muted }}
                  >
                    {t('aiSettings.privateLocalGenerationHint')}
                  </Text>
                  <View
                    className="overflow-hidden rounded-2xl"
                    style={{ borderWidth: 1, borderColor: color.border.default }}
                  >
                    <PickerSection
                      options={PRIVATE_LOCAL_LLM_BUDGETS}
                      selected={privateLocalLlmBudget}
                      onSelect={setPrivateLocalLlmBudget}
                      labelKey={(v) => t(`aiSettings.privateLocalGeneration.${v}`)}
                      color={color}
                    />
                  </View>
                </View>
              ) : null}
            </>
          )}
          {!isPrivateMode && (
            <View className="mb-7">
              <Text
                className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-widest"
                style={{ color: color.text.secondary }}
              >
                {t('aiSettings.smartModeCloudRetention.title')}
              </Text>
              <Text className="mb-2 px-1 text-[13px] leading-5" style={{ color: color.text.muted }}>
                {t('aiSettings.smartModeCloudRetention.description')}
              </Text>
              <View
                className="overflow-hidden rounded-2xl"
                style={{ borderWidth: 1, borderColor: color.border.default }}
              >
                <CloudAiKvTtlSlider
                  valueSeconds={cloudAiKvTtlSeconds}
                  onChangeSeconds={setCloudAiKvTtlSeconds}
                  fullLabel={cloudRetentionLabel}
                  tickLabel={(sec) => t(`aiSettings.smartModeCloudRetention.tick${sec}`)}
                  sliderAccessibilityLabel={t('aiSettings.smartModeCloudRetention.sliderA11yLabel')}
                  color={color}
                />
              </View>
            </View>
          )}
          {!isPrivateMode || privateAiProvider === 'custom_openai' ? (
            <SettingsSection title={t('aiSettings.showSummaryReasoning.title')}>
              <SettingsRow
                label={t('aiSettings.showSummaryReasoning.label')}
                subtitle={t('aiSettings.showSummaryReasoning.subtitle')}
                rightSlot={
                  <Switch
                    value={showSummaryReasoningInNotes}
                    onValueChange={setShowSummaryReasoningInNotes}
                    accessibilityLabel={t('aiSettings.showSummaryReasoning.a11y')}
                    trackColor={{
                      false: color.background.tertiary,
                      true: color.accent.primary,
                    }}
                    thumbColor={color.icon.onAccent}
                  />
                }
                showChevron={false}
                isFirst
                isLast
              />
            </SettingsSection>
          ) : null}
          {showMeetingSpeakerSettings ? (
            <SettingsSection title={t('aiSettings.autoRefreshMeetingSpeakers.title')}>
              <SettingsRow
                label={t('aiSettings.autoRefreshMeetingSpeakers.label')}
                subtitle={t('aiSettings.autoRefreshMeetingSpeakers.subtitle')}
                rightSlot={
                  <Switch
                    value={autoRefreshMeetingSpeakersOnRegen}
                    onValueChange={setAutoRefreshMeetingSpeakersOnRegen}
                    accessibilityLabel={t('aiSettings.autoRefreshMeetingSpeakers.a11y')}
                    trackColor={{
                      false: color.background.tertiary,
                      true: color.accent.primary,
                    }}
                    thumbColor={color.icon.onAccent}
                  />
                }
                showChevron={false}
                isFirst
                isLast
              />
            </SettingsSection>
          ) : null}
          <SettingsSection title={t('aiSettings.summaryStyle')}>
            <PickerSection
              options={SUMMARY_STYLES}
              selected={summaryStyle}
              onSelect={setSummaryStyle}
              labelKey={(v) => t(`aiSettings.summaryStyle.${v}`)}
              color={color}
            />
          </SettingsSection>
          <SettingsSection title={t('aiSettings.taskStrictness')}>
            <PickerSection
              options={TASK_STRICTNESS_OPTIONS}
              selected={taskStrictness}
              onSelect={setTaskStrictness}
              labelKey={(v) => t(`aiSettings.taskStrictness.${v}`)}
              color={color}
            />
          </SettingsSection>
          <SettingsSection title={t('aiSettings.outputLanguage')}>
            <PickerSection
              options={OUTPUT_LANGUAGES}
              selected={aiOutputLanguage}
              onSelect={setAiOutputLanguage}
              labelKey={(v) => t(`aiSettings.outputLanguage.${v}`)}
              color={color}
            />
          </SettingsSection>
          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
      </View>
      <AutomationComingSoonSheet
        visible={privateServerProSheet}
        feature="privateCustomServer"
        onUpgradePress={() => {
          setPrivateServerProSheet(false);
          openPlanPaywall();
        }}
        onClose={() => setPrivateServerProSheet(false)}
      />
    </View>
  );
};
