import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from '@react-navigation/native';
import { Check, Copy, RefreshCw, ShieldCheck, Wifi } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { useSettingsStore } from '@/entities/settings';
import { useProEntitlement } from '@/features/pro-license';
import { type Colors, useColors } from '@/shared/config';
import { hapticLight, IS_IOS, useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { FrostedHeaderIconButton, ProcessingArcSpinner, ScreenHeader } from '@/shared/ui';

import { formatMaskedApiKey } from '../lib/formatMaskedApiKey';
import { usePrivateRemoteServerScreen } from '../lib/usePrivateRemoteServerScreen';
import { PrivateRemoteLanDiscoverySheet } from './private-remote/PrivateRemoteLanDiscoverySheet';
import { PrivateRemoteModelsPicker } from './private-remote/PrivateRemoteModelsPicker';
import { PrivateRemoteProfilesPicker } from './private-remote/PrivateRemoteProfilesPicker';
import { PrivateRemoteQueueConcurrencySlider } from './PrivateRemoteQueueConcurrencySlider';

const COPY_PRESS_IN_MS = 70;
const COPY_SPRING_DAMPING = 14;
const COPY_SPRING_STIFFNESS = 280;
const COPY_OK_ICON_MS = 900;

/** Stops iOS from pairing URL + secure field as a website login and offering Keychain save. */
const API_KEY_TEXT_CONTENT_TYPE = IS_IOS ? 'oneTimeCode' : 'none';

type BaseUrlCopyButtonProps = {
  value: string;
  color: Colors;
  disabled: boolean;
};

function BaseUrlCopyButton({ value, color, disabled }: BaseUrlCopyButtonProps) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const [copied, setCopied] = React.useState(false);
  const resetCopiedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (resetCopiedTimerRef.current) clearTimeout(resetCopiedTimerRef.current);
    },
    [],
  );

  const chipAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    Clipboard.setString(trimmed);
    hapticLight();
    scale.value = withSequence(
      withTiming(0.88, { duration: COPY_PRESS_IN_MS, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: COPY_SPRING_DAMPING, stiffness: COPY_SPRING_STIFFNESS }),
    );
    setCopied(true);
    if (resetCopiedTimerRef.current) clearTimeout(resetCopiedTimerRef.current);
    resetCopiedTimerRef.current = setTimeout(() => setCopied(false), COPY_OK_ICON_MS);
  };

  const iconColor = copied ? color.accent.primary : color.text.secondary;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t('aiSettings.privateProvider.copyBaseUrl')}
      accessibilityState={{ disabled }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      className="h-10 w-10 items-center justify-center rounded-lg"
      style={{ opacity: disabled ? 0.35 : 1 }}
    >
      <Animated.View className="items-center justify-center" style={chipAnimStyle}>
        {copied ? (
          <Check size={18} color={iconColor} strokeWidth={2.5} />
        ) : (
          <Copy size={18} color={iconColor} strokeWidth={2} />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

type ApiKeyReplaceButtonProps = {
  color: Colors;
  onPress: () => void;
};

function ApiKeyReplaceButton({ color, onPress }: ApiKeyReplaceButtonProps) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      onPress={() => {
        hapticLight();
        onPress();
      }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t('aiSettings.privateProvider.replaceApiKey')}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      className="h-10 w-10 items-center justify-center rounded-lg"
    >
      <RefreshCw size={18} color={color.text.secondary} strokeWidth={2} />
    </TouchableOpacity>
  );
}

export const PrivateRemoteServerScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const color = useColors();
  const { isProActive } = useProEntitlement();
  const isTablet = useIsTablet();
  const contentMaxWidth = useTabletContentMaxWidth();

  React.useEffect(() => {
    if (!isProActive) {
      navigation.goBack();
    }
  }, [isProActive, navigation]);

  const screen = usePrivateRemoteServerScreen();
  const privateRemoteQueueConcurrency = useSettingsStore((s) => s.privateRemoteQueueConcurrency);
  const setPrivateRemoteQueueConcurrency = useSettingsStore(
    (s) => s.setPrivateRemoteQueueConcurrency,
  );

  if (!isProActive) {
    return null;
  }

  const baseUrlBorderColor =
    screen.baseUrlValidationError != null ? color.accent.delete : color.border.default;
  const canCopyBaseUrl = screen.privateRemoteBaseUrl.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('aiSettings.privateProvider.serverConfig')}
        onBack={() => navigation.goBack()}
        rightSlot={
          <FrostedHeaderIconButton
            iconOnly
            variant="icon"
            size="md"
            accessibilityLabel={screen.connectAccessibilityLabel}
            accessibilityState={{
              disabled: screen.isTestingConnection || !screen.canTestConnection,
            }}
            icon={
              screen.isTestingConnection ? (
                <ActivityIndicator size="small" color={color.accent.primary} />
              ) : (
                <Check size={22} color={color.accent.primary} strokeWidth={2.5} />
              )
            }
            color={color}
            onPress={() => {
              void screen.handleTestAndSaveRemoteConnection();
            }}
            disabled={screen.isTestingConnection || !screen.canTestConnection}
          />
        }
      />
      <View style={{ flex: 1, alignSelf: 'center', width: '100%', maxWidth: contentMaxWidth }}>
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bottomOffset={16}
        >
          <Text className="mb-5 text-[14px] leading-5" style={{ color: color.text.secondary }}>
            {t('aiSettings.privateProvider.serverConfigHint')}
          </Text>

          <Text className="mb-3 text-[13px] font-semibold" style={{ color: color.text.secondary }}>
            {t('aiSettings.privateProvider.quickTemplates')}
          </Text>
          <View className="mb-6 flex-row flex-wrap gap-2">
            {screen.quickTemplates.map((template) => (
              <TouchableOpacity
                key={template.id}
                onPress={() => screen.applyQuickTemplate(template.baseUrl, template.model)}
                className="rounded-lg border px-3 py-2"
                style={{ borderColor: color.border.default }}
                accessibilityRole="button"
                accessibilityLabel={t(`aiSettings.privateProvider.templates.${template.id}`)}
              >
                <Text style={{ color: color.text.primary }}>
                  {t(`aiSettings.privateProvider.templates.${template.id}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="mb-6">
            <Text
              className="mb-3 text-[13px] font-semibold"
              style={{ color: color.text.secondary }}
            >
              {t('aiSettings.privateProvider.savedConnections')}
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={screen.switchToSavedConnectionMode}
                disabled={!screen.hasSavedProfiles}
                activeOpacity={0.85}
                className="min-h-[44px] min-w-0 flex-1 justify-center rounded-xl border-2 px-3.5 py-3"
                style={{
                  borderColor: !screen.isCreatingNewConnection
                    ? color.accent.primary
                    : color.border.default,
                  backgroundColor: color.background.tertiary,
                  opacity: screen.hasSavedProfiles ? 1 : 0.45,
                }}
                accessibilityRole="button"
                accessibilityLabel={t('aiSettings.privateProvider.editConfig')}
                accessibilityState={{
                  selected: !screen.isCreatingNewConnection,
                  disabled: !screen.hasSavedProfiles,
                }}
              >
                <Text
                  className="text-center text-[15px] font-semibold leading-5"
                  style={{
                    color: !screen.isCreatingNewConnection
                      ? color.accent.primary
                      : color.text.primary,
                  }}
                  numberOfLines={2}
                >
                  {t('aiSettings.privateProvider.editConfig')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={screen.switchToCreateConnectionMode}
                activeOpacity={0.85}
                className="min-h-[44px] min-w-0 flex-1 justify-center rounded-xl border-2 px-3.5 py-3"
                style={{
                  borderColor: screen.isCreatingNewConnection
                    ? color.accent.primary
                    : color.border.default,
                  backgroundColor: color.background.tertiary,
                }}
                accessibilityRole="button"
                accessibilityLabel={t('aiSettings.privateProvider.newConnectionSwitch')}
                accessibilityState={{ selected: screen.isCreatingNewConnection }}
              >
                <Text
                  className="text-center text-[15px] font-semibold leading-5"
                  style={{
                    color: screen.isCreatingNewConnection
                      ? color.accent.primary
                      : color.text.primary,
                  }}
                  numberOfLines={2}
                >
                  {t('aiSettings.privateProvider.newConnectionSwitch')}
                </Text>
              </TouchableOpacity>
            </View>
            <Text className="mb-3 mt-3 text-[13px] leading-5" style={{ color: color.text.muted }}>
              {screen.isCreatingNewConnection
                ? t('aiSettings.privateProvider.newConnectionHint')
                : t('aiSettings.privateProvider.editConnectionHint')}
            </Text>
            {!screen.hasSavedProfiles ? (
              <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
                {t('aiSettings.privateProvider.savedConnectionsEmpty')}
              </Text>
            ) : (
              <PrivateRemoteProfilesPicker
                profiles={screen.privateRemoteProfiles}
                activeProfileId={screen.privateRemoteActiveProfileId}
                onSelectProfile={screen.setPrivateRemoteActiveProfile}
                onDeleteProfile={screen.removePrivateRemoteProfile}
                color={color}
                disabled={screen.isCreatingNewConnection}
              />
            )}
          </View>

          <View className="mb-8 flex-row gap-3">
            <TouchableOpacity
              onPress={() => {
                void screen.exportRemoteProfiles();
              }}
              disabled={screen.isExportingProfiles || screen.privateRemoteProfiles.length === 0}
              className="min-h-[44px] min-w-0 flex-1 flex-row items-center justify-center rounded-xl border px-3 py-2.5"
              style={{
                borderColor: color.border.default,
                opacity:
                  screen.isExportingProfiles || screen.privateRemoteProfiles.length === 0 ? 0.5 : 1,
              }}
              accessibilityRole="button"
              accessibilityLabel={t('aiSettings.privateProvider.exportProfiles')}
              accessibilityState={{
                disabled: screen.isExportingProfiles || screen.privateRemoteProfiles.length === 0,
              }}
            >
              {screen.isExportingProfiles ? (
                <ActivityIndicator size="small" color={color.text.muted} />
              ) : (
                <Text className="text-[13px] font-semibold" style={{ color: color.text.primary }}>
                  {t('aiSettings.privateProvider.exportProfiles')}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                void screen.importRemoteProfiles();
              }}
              disabled={screen.isImportingProfiles}
              className="min-h-[44px] min-w-0 flex-1 flex-row items-center justify-center rounded-xl border px-3 py-2.5"
              style={{
                borderColor: color.border.default,
                opacity: screen.isImportingProfiles ? 0.5 : 1,
              }}
              accessibilityRole="button"
              accessibilityLabel={t('aiSettings.privateProvider.importProfiles')}
              accessibilityState={{ disabled: screen.isImportingProfiles }}
            >
              {screen.isImportingProfiles ? (
                <ActivityIndicator size="small" color={color.text.muted} />
              ) : (
                <Text className="text-[13px] font-semibold" style={{ color: color.text.primary }}>
                  {t('aiSettings.privateProvider.importProfiles')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="mb-6">
            <View className="mb-2 flex-row items-center justify-between gap-3">
              <Text className="text-[13px] font-semibold" style={{ color: color.text.secondary }}>
                {t('aiSettings.privateProvider.baseUrl')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  void screen.runLanDiscovery();
                }}
                disabled={screen.isDiscoveringLan}
                className="min-h-[36px] flex-row items-center gap-2 rounded-lg border px-3 py-2"
                style={{
                  borderColor: color.border.default,
                  opacity: screen.isDiscoveringLan ? 0.55 : 1,
                }}
                accessibilityRole="button"
                accessibilityLabel={t('aiSettings.privateProvider.lanDiscovery.findOnNetwork')}
                accessibilityState={{ disabled: screen.isDiscoveringLan }}
              >
                {screen.isDiscoveringLan ? (
                  <ProcessingArcSpinner size="md" color={color.accent.primary} />
                ) : (
                  <Wifi size={16} color={color.accent.primary} strokeWidth={2.2} />
                )}
                <Text className="text-[13px] font-semibold" style={{ color: color.accent.primary }}>
                  {t('aiSettings.privateProvider.lanDiscovery.findOnNetwork')}
                </Text>
              </TouchableOpacity>
            </View>
            <View
              className="min-h-[48px] flex-row items-center rounded-xl border pr-1"
              style={{
                borderColor: baseUrlBorderColor,
                backgroundColor: color.background.card,
              }}
            >
              <TextInput
                value={screen.privateRemoteBaseUrl}
                onChangeText={screen.onBaseUrlChange}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="URL"
                importantForAutofill="no"
                keyboardType="url"
                placeholder={t('aiSettings.privateProvider.baseUrlPlaceholder')}
                placeholderTextColor={color.text.muted}
                className="min-h-[48px] flex-1 px-4 py-3 text-[15px]"
                style={{ color: color.text.primary }}
              />
              <BaseUrlCopyButton
                value={screen.privateRemoteBaseUrl}
                color={color}
                disabled={!canCopyBaseUrl}
              />
            </View>
            {screen.baseUrlValidationError != null ? (
              <Text className="mt-2 text-[13px] leading-5" style={{ color: color.accent.delete }}>
                {t(`aiSettings.privateProvider.baseUrlError.${screen.baseUrlValidationError}`)}
              </Text>
            ) : null}
          </View>

          <View className="mb-6">
            <Text
              className="mb-2 text-[13px] font-semibold"
              style={{ color: color.text.secondary }}
            >
              {t('aiSettings.privateProvider.apiKey')}
            </Text>
            {screen.showMaskedSavedApiKey ? (
              <>
                <View
                  className="min-h-[48px] flex-row items-center rounded-xl border pr-1"
                  style={{
                    borderColor: color.border.default,
                    backgroundColor: color.background.tertiary,
                    opacity: 0.85,
                  }}
                >
                  <TextInput
                    value={formatMaskedApiKey(screen.privateRemoteApiKey)}
                    editable={false}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    textContentType="none"
                    importantForAutofill="no"
                    className="min-h-[48px] flex-1 px-4 py-3 text-[15px]"
                    style={{ color: color.text.secondary }}
                    accessibilityLabel={t('aiSettings.privateProvider.apiKeySavedA11y')}
                  />
                  <ApiKeyReplaceButton color={color} onPress={screen.startReplacingApiKey} />
                </View>
                <View className="mt-2 flex-row items-center gap-1.5">
                  <ShieldCheck size={14} color={color.text.muted} strokeWidth={2} />
                  <Text
                    className="flex-1 text-[13px] leading-5"
                    style={{ color: color.text.muted }}
                  >
                    {t('aiSettings.privateProvider.apiKeySavedHint')}
                  </Text>
                </View>
              </>
            ) : (
              <TextInput
                value={screen.isReplacingApiKey ? screen.apiKeyDraft : screen.privateRemoteApiKey}
                onChangeText={screen.onApiKeyChange}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType={API_KEY_TEXT_CONTENT_TYPE}
                importantForAutofill="no"
                passwordRules=""
                secureTextEntry
                placeholder={t('aiSettings.privateProvider.apiKeyPlaceholder')}
                placeholderTextColor={color.text.muted}
                className="min-h-[48px] rounded-xl border px-4 py-3 text-[15px]"
                style={{
                  borderColor: color.border.default,
                  color: color.text.primary,
                  backgroundColor: color.background.card,
                }}
              />
            )}
          </View>

          <View className="mb-4">
            <PrivateRemoteModelsPicker
              baseUrl={screen.privateRemoteBaseUrl}
              apiKey={screen.effectiveApiKey}
              selectedModel={screen.privateRemoteModel}
              onModelChange={screen.onModelChange}
              color={color}
              refreshNonce={screen.remoteModelListNonce}
            />
          </View>

          <View className="mb-8">
            <Text
              className="mb-2 text-[13px] font-semibold"
              style={{ color: color.text.secondary }}
            >
              {t('aiSettings.privateProvider.queueConcurrency.title')}
            </Text>
            <Text className="mb-3 text-[13px] leading-5" style={{ color: color.text.muted }}>
              {t('aiSettings.privateProvider.queueConcurrency.hint')}
            </Text>
            <View
              className="overflow-hidden rounded-2xl"
              style={{ borderWidth: 1, borderColor: color.border.default }}
            >
              <PrivateRemoteQueueConcurrencySlider
                value={privateRemoteQueueConcurrency}
                onChange={setPrivateRemoteQueueConcurrency}
                tickLabel={(value) => t(`aiSettings.privateProvider.queueConcurrency.tick${value}`)}
                sliderAccessibilityLabel={t(
                  'aiSettings.privateProvider.queueConcurrency.sliderA11yLabel',
                )}
                color={color}
              />
            </View>
          </View>
        </KeyboardAwareScrollView>
      </View>

      <PrivateRemoteLanDiscoverySheet
        visible={screen.lanDiscoveryVisible}
        color={color}
        isScanning={screen.isDiscoveringLan}
        progress={screen.lanDiscoveryProgress}
        unavailableReason={screen.lanDiscoveryUnavailable}
        limitedToLocalhost={screen.lanDiscoveryLimitedToLocalhost}
        servers={screen.discoveredLanServers}
        onClose={screen.closeLanDiscovery}
        onCancelScan={screen.cancelLanDiscovery}
        onSelectServer={screen.selectDiscoveredLanServer}
        onRetry={() => {
          void screen.runLanDiscovery();
        }}
      />
    </View>
  );
};
