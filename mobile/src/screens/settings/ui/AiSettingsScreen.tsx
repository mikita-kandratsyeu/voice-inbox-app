import { BottomSheetView } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import { Check, Crown, Trash2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { openPlanPaywall } from '@/app/navigation/openPlanPaywall';
import type {
  AiOutputLanguage,
  PrivateAiProvider,
  PrivateLocalLlmBudget,
  SummaryStyle,
  TaskStrictness,
} from '@/entities/settings';
import { useSettingsStore } from '@/entities/settings';
import { type CloudAiKvTtlSeconds } from '@/entities/settings/lib/cloudAiKvTtl';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { useProEntitlement } from '@/features/pro-license';
import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { testPrivateRemoteConnection } from '@/shared/lib/ai-core/privateRemoteProvider';
import {
  AppBottomSheetModal,
  ScreenHeader,
  SettingsRow,
  SettingsSection,
  useBottomSheetContentPadding,
} from '@/shared/ui';

import { AutomationComingSoonSheet } from './AutomationComingSoonSheet';
import { CloudAiKvTtlSlider } from './CloudAiKvTtlSlider';

const SUMMARY_STYLES: SummaryStyle[] = ['brief', 'standard', 'detailed'];
const TASK_STRICTNESS_OPTIONS: TaskStrictness[] = ['strict', 'balanced', 'soft'];
const OUTPUT_LANGUAGES: AiOutputLanguage[] = ['same', 'ru', 'en'];
const PRIVATE_LOCAL_LLM_BUDGETS: PrivateLocalLlmBudget[] = ['efficient', 'balanced', 'expanded'];
const PRIVATE_AI_PROVIDERS: PrivateAiProvider[] = ['local', 'custom_openai'];
const PRIVATE_QUICK_TEMPLATES = [
  {
    id: 'ollama',
    baseUrl: 'http://127.0.0.1:11434',
    model: 'qwen2.5:7b-instruct',
  },
  {
    id: 'lm_studio',
    baseUrl: 'http://127.0.0.1:1234',
    model: 'openai/gpt-oss-20b',
  },
] as const;

function validatePrivateBaseUrl(baseUrl: string): string | null {
  const trimmed = baseUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'invalid_protocol';
    }
    if (!parsed.hostname.trim()) {
      return 'missing_host';
    }
    return null;
  } catch {
    return 'invalid_format';
  }
}

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
  const navigation = useNavigation();
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
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const setPrivateAiProvider = useSettingsStore((s) => s.setPrivateAiProvider);
  const privateRemoteBaseUrl = useSettingsStore((s) => s.privateRemoteBaseUrl);
  const setPrivateRemoteBaseUrl = useSettingsStore((s) => s.setPrivateRemoteBaseUrl);
  const privateRemoteApiKey = useSettingsStore((s) => s.privateRemoteApiKey);
  const setPrivateRemoteApiKey = useSettingsStore((s) => s.setPrivateRemoteApiKey);
  const privateRemoteModel = useSettingsStore((s) => s.privateRemoteModel);
  const setPrivateRemoteModel = useSettingsStore((s) => s.setPrivateRemoteModel);
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
  const showMeetingSpeakerSettings = isProActive;
  const [privateServerProSheet, setPrivateServerProSheet] = React.useState(false);
  const [isTestingConnection, setIsTestingConnection] = React.useState(false);
  const [remoteConfigSheetVisible, setRemoteConfigSheetVisible] = React.useState(false);
  const [previousProfileBeforeCreateId, setPreviousProfileBeforeCreateId] = React.useState<
    string | null
  >(null);
  const sheetContentPadding = useBottomSheetContentPadding(16);
  const activeRemoteProfile = React.useMemo(
    () =>
      privateRemoteProfiles.find((profile) => profile.id === privateRemoteActiveProfileId) ?? null,
    [privateRemoteActiveProfileId, privateRemoteProfiles],
  );

  React.useEffect(() => {
    if (customProviderLocked && privateAiProvider === 'custom_openai') {
      setPrivateAiProvider('local');
    }
  }, [customProviderLocked, privateAiProvider, setPrivateAiProvider]);

  React.useEffect(() => {
    if (privateAiProvider !== 'custom_openai') return;
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
    privateAiProvider,
    privateRemoteBaseUrl,
    privateRemoteModel,
    privateRemoteApiKey,
    privateRemoteLastSuccessfulBaseUrl,
    privateRemoteLastSuccessfulApiKey,
    privateRemoteLastSuccessfulModel,
    setPrivateRemoteBaseUrl,
    setPrivateRemoteModel,
    setPrivateRemoteApiKey,
  ]);

  const cloudRetentionLabel = (sec: CloudAiKvTtlSeconds) =>
    t(`aiSettings.smartModeCloudRetention.m${sec}`);
  const resolvedRemoteProviderName = React.useMemo(() => {
    const base = privateRemoteBaseUrl.trim().toLowerCase();
    if (base.includes(':11434')) return t('aiSettings.privateProvider.templates.ollama');
    if (base.includes(':1234')) return t('aiSettings.privateProvider.templates.lm_studio');
    return t('settings.privateRemoteProviderCustom');
  }, [privateRemoteBaseUrl, t]);
  const baseUrlValidationError = React.useMemo(
    () => validatePrivateBaseUrl(privateRemoteBaseUrl),
    [privateRemoteBaseUrl],
  );
  const hasSavedRemoteConfig =
    privateRemoteLastSuccessfulBaseUrl.trim().length > 0 &&
    privateRemoteLastSuccessfulModel.trim().length > 0;
  const isRemoteModelFilled = privateRemoteModel.trim().length > 0;
  const canTestConnection =
    baseUrlValidationError == null && isRemoteModelFilled && !isTestingConnection;
  const isCreatingNewConnection = privateRemoteActiveProfileId == null;
  const buildRemoteProfileName = React.useCallback(
    (baseUrl: string, model: string) => {
      const base = baseUrl.trim().toLowerCase();
      const provider = base.includes(':11434')
        ? t('aiSettings.privateProvider.templates.ollama')
        : base.includes(':1234')
          ? t('aiSettings.privateProvider.templates.lm_studio')
          : t('settings.privateRemoteProviderCustom');
      const trimmedModel = model.trim();
      return trimmedModel.length > 0 ? `${provider} · ${trimmedModel}` : provider;
    },
    [t],
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
                  accessibilityHint={
                    customProviderLocked ? t('aiSettings.privateProvider.proOnlyHint') : undefined
                  }
                >
                  <View
                    className="overflow-hidden rounded-2xl"
                    style={{
                      backgroundColor: color.background.card,
                      opacity: customProviderLocked ? 0.7 : 1,
                    }}
                    pointerEvents={customProviderLocked ? 'none' : 'auto'}
                  >
                    {PRIVATE_AI_PROVIDERS.map((provider, index) => {
                      const isSelected = privateAiProvider === provider;
                      const isLast = index === PRIVATE_AI_PROVIDERS.length - 1;
                      return (
                        <TouchableOpacity
                          key={provider}
                          onPress={() => {
                            setPrivateAiProvider(provider);
                          }}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={t(`aiSettings.privateProvider.${provider}`)}
                          accessibilityState={{ selected: isSelected }}
                          className="px-4 py-3.5"
                          style={
                            !isLast
                              ? { borderBottomWidth: 1, borderBottomColor: color.border.default }
                              : undefined
                          }
                        >
                          <View className="flex-row items-center justify-between">
                            <Text
                              className="pr-3 text-[16px]"
                              style={{ color: color.text.primary }}
                            >
                              {t(`aiSettings.privateProvider.${provider}`)}
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
                          </View>
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
                    className="rounded-2xl border p-3"
                    style={{
                      borderColor: color.border.default,
                      backgroundColor: color.background.card,
                    }}
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="min-w-0 flex-1 pr-3">
                        <View className="mb-1 flex-row items-center gap-1.5">
                          <View
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor: hasSavedRemoteConfig
                                ? color.accent.aiData
                                : color.text.muted,
                            }}
                          />
                          <Text
                            className="text-[13px] font-semibold"
                            style={{ color: color.text.primary }}
                          >
                            {hasSavedRemoteConfig
                              ? t('aiSettings.privateProvider.savedConfigTitle')
                              : t('aiSettings.privateProvider.notConfiguredTitle')}
                          </Text>
                        </View>
                        {hasSavedRemoteConfig ? (
                          <>
                            <Text
                              className="text-[13px] leading-5"
                              style={{ color: color.text.secondary }}
                              numberOfLines={1}
                            >
                              {privateRemoteLastSuccessfulBaseUrl}
                            </Text>
                            <Text
                              className="text-[13px] leading-5"
                              style={{ color: color.text.muted }}
                              numberOfLines={1}
                            >
                              {activeRemoteProfile?.name ??
                                t('aiSettings.privateProvider.savedProviderLabel', {
                                  provider: resolvedRemoteProviderName,
                                })}
                            </Text>
                            <Text
                              className="text-[13px] leading-5"
                              style={{ color: color.text.muted }}
                              numberOfLines={1}
                            >
                              {t('aiSettings.privateProvider.savedModelLabel', {
                                model: privateRemoteLastSuccessfulModel,
                              })}
                            </Text>
                          </>
                        ) : (
                          <Text
                            className="text-[13px] leading-5"
                            style={{ color: color.text.muted }}
                          >
                            {t('aiSettings.privateProvider.notConfiguredHint')}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => setRemoteConfigSheetVisible(true)}
                        className="rounded-lg px-3 py-2"
                        style={{ backgroundColor: color.background.secondary }}
                      >
                        <Text
                          className="text-[13px] font-semibold"
                          style={{ color: color.text.primary }}
                        >
                          {hasSavedRemoteConfig
                            ? t('aiSettings.privateProvider.editConfig')
                            : t('aiSettings.privateProvider.setupConfig')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : null}
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
          {!isPrivateMode ? (
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
      <AppBottomSheetModal
        visible={remoteConfigSheetVisible}
        onClose={() => setRemoteConfigSheetVisible(false)}
      >
        <BottomSheetView
          style={{
            paddingHorizontal: 20,
            paddingTop: 8,
            ...sheetContentPadding,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: color.text.primary,
              textAlign: 'center',
              paddingTop: 4,
              marginBottom: 6,
            }}
          >
            {t('aiSettings.privateProvider.serverConfig')}
          </Text>
          <Text
            style={{
              fontSize: 14,
              lineHeight: 20,
              color: color.text.secondary,
              textAlign: 'center',
              marginBottom: 12,
              paddingHorizontal: 4,
            }}
          >
            {t('aiSettings.privateProvider.serverConfigHint')}
          </Text>
          <Text className="mb-2 text-[13px] font-semibold" style={{ color: color.text.secondary }}>
            {t('aiSettings.privateProvider.quickTemplates')}
          </Text>
          <View className="mb-3 flex-row gap-2">
            {PRIVATE_QUICK_TEMPLATES.map((template) => (
              <TouchableOpacity
                key={template.id}
                onPress={() => {
                  setPrivateRemoteBaseUrl(template.baseUrl);
                  setPrivateRemoteModel(template.model);
                }}
                className="rounded-lg border px-3 py-2"
                style={{ borderColor: color.border.default }}
              >
                <Text style={{ color: color.text.primary }}>
                  {t(`aiSettings.privateProvider.templates.${template.id}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View className="mb-3">
            <View
              className="mb-2 rounded-xl border px-3 py-2.5"
              style={{ borderColor: color.border.default }}
            >
              <View className="flex-row items-center justify-between">
                <View className="min-w-0 flex-1 pr-3">
                  <Text
                    className="text-[13px] font-semibold"
                    style={{ color: color.text.secondary }}
                  >
                    {t('aiSettings.privateProvider.savedConnections')}
                  </Text>
                  <Text className="mt-0.5 text-[12px]" style={{ color: color.text.muted }}>
                    {t('aiSettings.privateProvider.newConnectionSwitch')}
                  </Text>
                </View>
                <Switch
                  value={isCreatingNewConnection}
                  onValueChange={(next) => {
                    if (next) {
                      setPreviousProfileBeforeCreateId(privateRemoteActiveProfileId);
                      setPrivateRemoteActiveProfile(null);
                      setPrivateRemoteBaseUrl('');
                      setPrivateRemoteApiKey('');
                      setPrivateRemoteModel('');
                      return;
                    }
                    const restoreProfileId =
                      previousProfileBeforeCreateId ?? privateRemoteProfiles[0]?.id ?? null;
                    if (restoreProfileId) {
                      setPrivateRemoteActiveProfile(restoreProfileId);
                    }
                    setPreviousProfileBeforeCreateId(null);
                  }}
                  accessibilityLabel={t('aiSettings.privateProvider.newConnectionSwitch')}
                  trackColor={{
                    false: color.background.tertiary,
                    true: color.accent.primary,
                  }}
                  thumbColor={color.icon.onAccent}
                />
              </View>
            </View>
            <Text className="mb-2 text-[12px] leading-4" style={{ color: color.text.muted }}>
              {isCreatingNewConnection
                ? t('aiSettings.privateProvider.newConnectionHint')
                : t('aiSettings.privateProvider.editConnectionHint')}
            </Text>
            {privateRemoteProfiles.length === 0 ? (
              <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
                {t('aiSettings.privateProvider.savedConnectionsEmpty')}
              </Text>
            ) : (
              <View
                className="rounded-xl border"
                style={{
                  borderColor: color.border.default,
                  opacity: isCreatingNewConnection ? 0.55 : 1,
                }}
                pointerEvents={isCreatingNewConnection ? 'none' : 'auto'}
              >
                {privateRemoteProfiles.map((profile, index) => {
                  const isActive = profile.id === privateRemoteActiveProfileId;
                  const isLast = index === privateRemoteProfiles.length - 1;
                  return (
                    <View
                      key={profile.id}
                      className="flex-row items-center px-3 py-2.5"
                      style={
                        !isLast
                          ? { borderBottomWidth: 1, borderBottomColor: color.border.default }
                          : undefined
                      }
                    >
                      <TouchableOpacity
                        onPress={() => setPrivateRemoteActiveProfile(profile.id)}
                        className="min-w-0 flex-1 pr-2"
                      >
                        <Text
                          className="text-[13px] font-semibold"
                          style={{ color: isActive ? color.text.primary : color.text.secondary }}
                          numberOfLines={1}
                        >
                          {profile.name}
                        </Text>
                        <Text
                          className="text-[12px]"
                          style={{ color: color.text.muted }}
                          numberOfLines={1}
                        >
                          {profile.baseUrl}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          Alert.alert(
                            t('aiSettings.privateProvider.deleteConnectionTitle'),
                            t('aiSettings.privateProvider.deleteConnectionMessage'),
                            [
                              { text: t('common.cancel'), style: 'cancel' },
                              {
                                text: t('common.delete'),
                                style: 'destructive',
                                onPress: () => removePrivateRemoteProfile(profile.id),
                              },
                            ],
                          )
                        }
                        className="rounded-lg p-2"
                        accessibilityRole="button"
                        accessibilityLabel={t('aiSettings.privateProvider.deleteConnection')}
                      >
                        <Trash2 size={16} color={color.accent.delete} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
          <Text className="mb-2 text-[13px] font-semibold" style={{ color: color.text.secondary }}>
            {t('aiSettings.privateProvider.baseUrl')}
          </Text>
          <TextInput
            value={privateRemoteBaseUrl}
            onChangeText={setPrivateRemoteBaseUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder={t('aiSettings.privateProvider.baseUrlPlaceholder')}
            placeholderTextColor={color.text.muted}
            className="rounded-xl border px-3 py-2 text-[14px]"
            style={{
              borderColor:
                baseUrlValidationError != null ? color.accent.delete : color.border.default,
              color: color.text.primary,
              backgroundColor: color.background.secondary,
            }}
          />
          {baseUrlValidationError != null ? (
            <Text className="mt-1 text-[12px] leading-4" style={{ color: color.accent.delete }}>
              {t(`aiSettings.privateProvider.baseUrlError.${baseUrlValidationError}`)}
            </Text>
          ) : null}
          <Text
            className="mb-2 mt-3 text-[13px] font-semibold"
            style={{ color: color.text.secondary }}
          >
            {t('aiSettings.privateProvider.model')}
          </Text>
          <TextInput
            value={privateRemoteModel}
            onChangeText={setPrivateRemoteModel}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('aiSettings.privateProvider.modelPlaceholder')}
            placeholderTextColor={color.text.muted}
            className="rounded-xl border px-3 py-2 text-[14px]"
            style={{
              borderColor: color.border.default,
              color: color.text.primary,
              backgroundColor: color.background.secondary,
            }}
          />
          <Text
            className="mb-2 mt-3 text-[13px] font-semibold"
            style={{ color: color.text.secondary }}
          >
            {t('aiSettings.privateProvider.apiKey')}
          </Text>
          <TextInput
            value={privateRemoteApiKey}
            onChangeText={setPrivateRemoteApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            secureTextEntry
            placeholder={t('aiSettings.privateProvider.apiKeyPlaceholder')}
            placeholderTextColor={color.text.muted}
            className="rounded-xl border px-3 py-2 text-[14px]"
            style={{
              borderColor: color.border.default,
              color: color.text.primary,
              backgroundColor: color.background.secondary,
            }}
          />
          <TouchableOpacity
            onPress={async () => {
              if (!canTestConnection) return;
              setIsTestingConnection(true);
              try {
                const result = await testPrivateRemoteConnection({
                  privateRemoteBaseUrl,
                  privateRemoteApiKey,
                  privateRemoteModel,
                });
                if (result.ok) {
                  const profileId = privateRemoteActiveProfileId ?? `remote-${Date.now()}`;
                  const profileName = buildRemoteProfileName(
                    privateRemoteBaseUrl,
                    privateRemoteModel,
                  );
                  setPrivateRemoteLastSuccessfulConfig({
                    baseUrl: privateRemoteBaseUrl,
                    apiKey: privateRemoteApiKey,
                    model: privateRemoteModel,
                  });
                  upsertPrivateRemoteProfile({
                    id: profileId,
                    name: profileName,
                    baseUrl: privateRemoteBaseUrl,
                    apiKey: privateRemoteApiKey,
                    model: privateRemoteModel,
                    updatedAt: Date.now(),
                  });
                  setRemoteConfigSheetVisible(false);
                  Alert.alert(
                    t('aiSettings.privateProvider.connectionOkTitle'),
                    t('aiSettings.privateProvider.connectionOkMessage'),
                  );
                  return;
                }
                Alert.alert(
                  t('aiSettings.privateProvider.connectionFailTitle'),
                  result.error || t('aiSettings.privateProvider.connectionFailMessage'),
                );
              } finally {
                setIsTestingConnection(false);
              }
            }}
            className="mt-4 rounded-xl px-4 py-3.5"
            disabled={!canTestConnection}
            style={{
              backgroundColor: canTestConnection ? color.accent.aiData : color.background.tertiary,
            }}
          >
            <View className="flex-row items-center justify-center gap-2">
              {isTestingConnection ? (
                <ActivityIndicator
                  size="small"
                  color={canTestConnection ? '#fff' : color.text.muted}
                />
              ) : null}
              <Text
                className="text-center text-[14px] font-semibold"
                style={{ color: canTestConnection ? '#fff' : color.text.muted }}
              >
                {isTestingConnection
                  ? t('aiSettings.privateProvider.testingConnection')
                  : isCreatingNewConnection
                    ? t('aiSettings.privateProvider.testAndSaveConnection')
                    : t('aiSettings.privateProvider.testAndUpdateConnection')}
              </Text>
            </View>
          </TouchableOpacity>
        </BottomSheetView>
      </AppBottomSheetModal>
    </View>
  );
};
