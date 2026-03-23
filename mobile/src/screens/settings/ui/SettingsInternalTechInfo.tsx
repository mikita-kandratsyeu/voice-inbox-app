import Clipboard from '@react-native-clipboard/clipboard';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Text, View } from 'react-native';
import { DeviceInfoModule } from 'react-native-nitro-device-info';

import { getWebsiteUrl, useColors } from '@/shared/config';
import {
  getAppEnv,
  getDatabaseUrl,
  getMobileUserAgent,
  getWebApiSecret,
  isTestflightInternalBuild,
} from '@/shared/config/buildEnv';
import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { isNumber, isString } from '@/shared/lib/type-guards';

function redactCredentialsInUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return trimmed.replace(/:\/\/([^:@/]+):([^@]+)@/, '://$1:***@');
}

function buildNumberDisplay(): string {
  const d = DeviceInfoModule;
  const buildRaw =
    'buildNumber' in d ? (d as { buildNumber?: string | number }).buildNumber : undefined;
  if (isString(buildRaw) || isNumber(buildRaw)) {
    return String(buildRaw);
  }
  return '';
}

type TechRowProps = {
  label: string;
  value: string;
  copyText: string;
  onCopy: (text: string) => void;
  color: ReturnType<typeof useColors>;
  isLast?: boolean;
};

const TechRow = ({ label, value, copyText, onCopy, color, isLast }: TechRowProps) => {
  const canCopy = copyText.trim().length > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!canCopy}
      onPress={() => onCopy(copyText)}
      className={isLast ? 'py-3' : 'border-b py-3'}
      style={isLast ? undefined : { borderBottomColor: color.border.default }}
    >
      <Text className="text-[11px] font-semibold uppercase" style={{ color: color.text.muted }}>
        {label}
      </Text>
      <Text
        className="mt-1 font-mono text-[13px] leading-5"
        style={{ color: color.text.primary }}
        selectable
      >
        {value}
      </Text>
    </Pressable>
  );
};

export const SettingsInternalTechInfo = () => {
  const { t } = useTranslation();
  const color = useColors();

  const onCopy = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      void Clipboard.setString(text);
      Alert.alert(t('settings.internalTech.copied'));
    },
    [t],
  );

  if (!isTestflightInternalBuild()) {
    return null;
  }

  const webApiUrl = getWebApiUrl().trim();
  const websiteUrl = getWebsiteUrl().trim();
  const userAgent = getMobileUserAgent().trim();
  const dbRaw = getDatabaseUrl().trim();
  const dbDisplay = dbRaw ? redactCredentialsInUrl(dbRaw) : '';
  const appEnv = getAppEnv().trim();
  const secretOk = getWebApiSecret().trim().length > 0;
  const secretLabel = secretOk
    ? t('settings.internalTech.secretConfigured')
    : t('settings.internalTech.secretNotSet');

  const ver = String(DeviceInfoModule.version ?? '');
  const build = buildNumberDisplay();
  const versionCopyText =
    ver.length > 0 ? (build.length > 0 ? `${ver} (${build})` : ver) : build.length > 0 ? build : '';

  const empty = t('settings.internalTech.empty');
  const versionDisplay = versionCopyText || empty;

  return (
    <View
      className="mt-2 rounded-xl border px-4 py-2"
      style={{ borderColor: color.border.default }}
    >
      <Text className="mb-1 text-sm font-bold" style={{ color: color.text.primary }}>
        {t('settings.internalTech.title')}
      </Text>
      <Text className="mb-2 text-xs" style={{ color: color.text.secondary }}>
        {t('settings.internalTech.hint')}
      </Text>
      <TechRow
        label={t('settings.internalTech.webApiUrl')}
        value={webApiUrl || empty}
        copyText={webApiUrl}
        onCopy={onCopy}
        color={color}
      />
      <TechRow
        label={t('settings.internalTech.websiteUrl')}
        value={websiteUrl || empty}
        copyText={websiteUrl}
        onCopy={onCopy}
        color={color}
      />
      <TechRow
        label={t('settings.internalTech.userAgent')}
        value={userAgent || empty}
        copyText={userAgent}
        onCopy={onCopy}
        color={color}
      />
      <TechRow
        label={t('settings.internalTech.databaseUrl')}
        value={dbDisplay || empty}
        copyText={dbDisplay}
        onCopy={onCopy}
        color={color}
      />
      <TechRow
        label={t('settings.internalTech.appEnv')}
        value={appEnv || empty}
        copyText={appEnv}
        onCopy={onCopy}
        color={color}
      />
      <View className="border-b py-3" style={{ borderBottomColor: color.border.default }}>
        <Text className="text-[11px] font-semibold uppercase" style={{ color: color.text.muted }}>
          {t('settings.internalTech.webApiSecret')}
        </Text>
        <Text
          className="mt-1 font-mono text-[13px] leading-5"
          style={{ color: color.text.primary }}
          selectable
        >
          {secretLabel}
        </Text>
      </View>
      <TechRow
        label={t('settings.internalTech.appVersion')}
        value={versionDisplay}
        copyText={versionCopyText}
        onCopy={onCopy}
        color={color}
        isLast
      />
    </View>
  );
};
