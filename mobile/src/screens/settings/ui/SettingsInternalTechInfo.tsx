import Clipboard from '@react-native-clipboard/clipboard';
import NetInfo from '@react-native-community/netinfo';
import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { DeviceInfoModule } from 'react-native-nitro-device-info';

import { getWebsiteUrl, useColors } from '@/shared/config';
import {
  getAppEnv,
  getDatabaseUrl,
  getMobileUserAgent,
  isTestflightInternalBuild,
} from '@/shared/config/buildEnv';
import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import {
  applyTestflightWebApiUrlOverride,
  getStoredTestflightWebApiUrlOverride,
  readTestflightWebApiUrlOverride,
  subscribeTestflightWebApiUrlOverride,
} from '@/shared/config/testflightWebApiOverride';
import { clearApiToken } from '@/shared/lib/api-auth';
import { diagWarn } from '@/shared/lib/appLogger';
import { getOrCreateDeviceId } from '@/shared/lib/device-id';
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

function readAppUsedMemoryBytes(): number | null {
  const d = DeviceInfoModule as unknown as { getUsedMemory?: () => unknown };
  if (typeof d.getUsedMemory === 'function') {
    try {
      const used = d.getUsedMemory();
      if (isNumber(used) && Number.isFinite(used) && used > 0) return used;
    } catch {
      diagWarn('[readAppUsedMemoryBytes] Failed to read used memory');
    }
  }

  const perfMem = (
    globalThis as unknown as { performance?: { memory?: { usedJSHeapSize?: unknown } } }
  ).performance?.memory?.usedJSHeapSize;
  if (isNumber(perfMem) && Number.isFinite(perfMem) && perfMem > 0) {
    return perfMem;
  }

  return null;
}

function formatMemoryDisplay(bytes: number | null): string {
  if (!isNumber(bytes) || bytes <= 0) return '—';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function readTotalMemoryBytes(): number | null {
  const total = (DeviceInfoModule as unknown as { totalMemory?: unknown }).totalMemory;
  if (isNumber(total) && Number.isFinite(total) && total > 0) return total;
  return null;
}

function resourceGaugeColor(
  value: number | null,
  okAtOrBelow: number,
  warnAtOrBelow: number,
  palette: { primary: string; ok: string; warn: string; danger: string },
): string {
  if (value == null) return palette.primary;
  if (value <= okAtOrBelow) return palette.ok;
  if (value <= warnAtOrBelow) return palette.warn;

  return palette.danger;
}

type TechRowProps = {
  label: string;
  value: string;
  copyText: string;
  onCopy: (text: string) => void;
  color: ReturnType<typeof useColors>;
  valueColor?: string;
  isLast?: boolean;
};

const TechRow = ({ label, value, copyText, onCopy, color, valueColor, isLast }: TechRowProps) => {
  const canCopy = copyText.trim().length > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !canCopy }}
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
        style={{ color: valueColor ?? color.text.primary }}
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
  const storedWebApiOverride = useSyncExternalStore(
    subscribeTestflightWebApiUrlOverride,
    getStoredTestflightWebApiUrlOverride,
    getStoredTestflightWebApiUrlOverride,
  );
  const [webApiOverrideDraft, setWebApiOverrideDraft] = useState(storedWebApiOverride);

  useEffect(() => {
    setWebApiOverrideDraft(storedWebApiOverride);
  }, [storedWebApiOverride]);

  const [memoryDisplay, setMemoryDisplay] = useState<string>('—');
  const [cpuDisplay, setCpuDisplay] = useState<string>('—');
  const [memoryMb, setMemoryMb] = useState<number | null>(null);
  const [cpuPercent, setCpuPercent] = useState<number | null>(null);
  const [networkType, setNetworkType] = useState<string>('—');
  const [networkStatus, setNetworkStatus] = useState<string>('—');
  const [cellularGeneration, setCellularGeneration] = useState<string>('—');
  const [deviceId, setDeviceId] = useState<string>('—');

  const onCopy = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      void Clipboard.setString(text);
      Alert.alert(t('settings.internalTech.copied'));
    },
    [t],
  );

  const onApplyWebApiOverride = useCallback(() => {
    const urlResult = applyTestflightWebApiUrlOverride(webApiOverrideDraft);
    if (urlResult === 'forbidden') {
      return;
    }
    if (urlResult === 'invalid') {
      Alert.alert(
        t('settings.internalTech.webApiOverrideInvalidTitle'),
        t('settings.internalTech.webApiOverrideInvalidBody'),
      );
      return;
    }

    clearApiToken();

    if (urlResult === 'cleared') {
      Alert.alert(t('settings.internalTech.webApiOverrideClearedTitle'));
    } else {
      Alert.alert(t('settings.internalTech.webApiOverrideAppliedTitle'));
    }
  }, [t, webApiOverrideDraft]);

  useEffect(() => {
    if (!(__DEV__ || isTestflightInternalBuild())) {
      return;
    }

    let cancelled = false;
    let prevTick = Date.now();
    const INTERVAL_MS = 2000;

    const update = () => {
      const now = Date.now();
      const lagMs = Math.max(0, now - prevTick - INTERVAL_MS);
      prevTick = now;

      const usedMemory = readAppUsedMemoryBytes();
      const totalMemory = readTotalMemoryBytes();
      const jsLoadPercent = Math.min(100, Math.round((lagMs / INTERVAL_MS) * 100));
      const usedMemoryMb = isNumber(usedMemory) ? usedMemory / (1024 * 1024) : null;
      const totalMemoryMb = isNumber(totalMemory) ? totalMemory / (1024 * 1024) : null;
      const memoryPercent =
        usedMemoryMb != null && totalMemoryMb != null && totalMemoryMb > 0
          ? Math.min(100, Math.round((usedMemoryMb / totalMemoryMb) * 100))
          : null;
      const memoryValue =
        usedMemoryMb != null && totalMemoryMb != null
          ? `${usedMemoryMb.toFixed(1)} / ${totalMemoryMb.toFixed(1)} MB (${memoryPercent ?? 0}%)`
          : formatMemoryDisplay(usedMemory);

      if (!cancelled) {
        setMemoryDisplay(memoryValue);
        setCpuDisplay(`${jsLoadPercent}% (JS)`);
        setMemoryMb(usedMemoryMb);
        setCpuPercent(jsLoadPercent);
      }
    };

    update();
    const id = setInterval(update, INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!isTestflightInternalBuild()) {
      return;
    }

    let cancelled = false;
    void getOrCreateDeviceId()
      .then((id) => {
        if (!cancelled) setDeviceId(id);
      })
      .catch(() => {
        if (!cancelled) setDeviceId('—');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isTestflightInternalBuild()) {
      return;
    }

    const updateNetwork = (state: {
      type: string;
      isConnected: boolean | null;
      details?: { cellularGeneration?: string | null } | null;
    }) => {
      setNetworkType(state.type || '—');
      setNetworkStatus(
        state.isConnected == null
          ? t('settings.internalTech.unknown')
          : state.isConnected
            ? t('settings.internalTech.online')
            : t('settings.internalTech.offline'),
      );
      setCellularGeneration(state.details?.cellularGeneration ?? '—');
    };

    void NetInfo.fetch().then((state) => {
      updateNetwork({
        type: String(state.type ?? 'unknown'),
        isConnected: state.isConnected ?? null,
        details:
          state.type === 'cellular'
            ? { cellularGeneration: state.details?.cellularGeneration ?? null }
            : null,
      });
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      updateNetwork({
        type: String(state.type ?? 'unknown'),
        isConnected: state.isConnected ?? null,
        details:
          state.type === 'cellular'
            ? { cellularGeneration: state.details?.cellularGeneration ?? null }
            : null,
      });
    });

    return unsubscribe;
  }, [t]);

  if (!isTestflightInternalBuild()) {
    return null;
  }

  const webApiUrl = getWebApiUrl().trim();
  const webApiOverrideActive = readTestflightWebApiUrlOverride() != null;
  const websiteUrl = getWebsiteUrl().trim();
  const userAgent = getMobileUserAgent().trim();
  const dbRaw = getDatabaseUrl().trim();
  const dbDisplay = dbRaw ? redactCredentialsInUrl(dbRaw) : '';
  const appEnv = getAppEnv().trim();

  const ver = String(DeviceInfoModule.version ?? '');
  const build = buildNumberDisplay();
  const versionCopyText =
    ver.length > 0 ? (build.length > 0 ? `${ver} (${build})` : ver) : build.length > 0 ? build : '';
  const systemName = String(DeviceInfoModule.systemName ?? '').trim();
  const systemVersion = String(DeviceInfoModule.systemVersion ?? '').trim();
  const osVersion = [systemName, systemVersion].filter(Boolean).join(' ');
  const brand = String(DeviceInfoModule.brand ?? '').trim();
  const model = String(DeviceInfoModule.model ?? '').trim();
  const deviceModel = [brand, model].filter(Boolean).join(' ');
  const deviceType = DeviceInfoModule.isTablet
    ? t('settings.internalTech.deviceTypeTablet')
    : t('settings.internalTech.deviceTypePhone');

  const empty = t('settings.internalTech.empty');
  const versionDisplay = versionCopyText || empty;
  const dangerColor = color.accent.delete;
  const warningColor = color.accent.cache;
  const okColor = color.accent.aiData;
  const gaugePalette = {
    primary: color.text.primary,
    ok: okColor,
    warn: warningColor,
    danger: dangerColor,
  };
  const cpuValueColor = resourceGaugeColor(cpuPercent, 20, 45, gaugePalette);
  const memoryValueColor = resourceGaugeColor(memoryMb, 250, 500, gaugePalette);

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
      <View className="mb-3 border-b pb-3" style={{ borderBottomColor: color.border.default }}>
        <Text className="text-[11px] font-semibold uppercase" style={{ color: color.text.muted }}>
          {t('settings.internalTech.webApiOverrideTitle')}
        </Text>
        <Text className="mt-1 text-xs leading-5" style={{ color: color.text.secondary }}>
          {t('settings.internalTech.webApiOverrideHint')}
        </Text>
        <TextInput
          value={webApiOverrideDraft}
          onChangeText={setWebApiOverrideDraft}
          placeholder={t('settings.internalTech.webApiOverridePlaceholder')}
          placeholderTextColor={color.text.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          className="mt-2 rounded-lg border px-3 py-2 font-mono text-[13px]"
          style={{
            borderColor: color.border.default,
            color: color.text.primary,
            backgroundColor: color.background.secondary,
          }}
        />
        <View className="mt-2 flex-row flex-wrap gap-2">
          <Pressable
            accessibilityRole="button"
            onPress={onApplyWebApiOverride}
            className="rounded-lg px-3 py-2"
            style={{ backgroundColor: color.accent.aiData }}
          >
            <Text className="text-sm font-semibold text-white">
              {t('settings.internalTech.webApiOverrideApply')}
            </Text>
          </Pressable>
          {storedWebApiOverride.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setWebApiOverrideDraft('');
                applyTestflightWebApiUrlOverride('');
                clearApiToken();
                Alert.alert(t('settings.internalTech.webApiOverrideClearedTitle'));
              }}
              className="rounded-lg border px-3 py-2"
              style={{ borderColor: color.border.default }}
            >
              <Text className="text-sm font-semibold" style={{ color: color.text.primary }}>
                {t('settings.internalTech.webApiOverrideClear')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <TechRow
        label={t('settings.internalTech.webApiUrl')}
        value={webApiUrl || empty}
        copyText={webApiUrl}
        onCopy={onCopy}
        color={color}
        valueColor={webApiOverrideActive ? color.accent.aiData : undefined}
      />
      {webApiOverrideActive ? (
        <Text className="mb-2 text-xs" style={{ color: color.text.secondary }}>
          {t('settings.internalTech.webApiOverrideActiveNote')}
        </Text>
      ) : null}
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
      <TechRow
        label={t('settings.internalTech.appVersion')}
        value={versionDisplay}
        copyText={versionCopyText}
        onCopy={onCopy}
        color={color}
      />
      <TechRow
        label={t('settings.internalTech.deviceModel')}
        value={deviceModel || empty}
        copyText={deviceModel}
        onCopy={onCopy}
        color={color}
      />
      <TechRow
        label={t('settings.internalTech.deviceId')}
        value={deviceId || empty}
        copyText={deviceId !== '—' ? deviceId : ''}
        onCopy={onCopy}
        color={color}
      />
      <TechRow
        label={t('settings.internalTech.osVersion')}
        value={osVersion || empty}
        copyText={osVersion}
        onCopy={onCopy}
        color={color}
      />
      <TechRow
        label={t('settings.internalTech.deviceType')}
        value={deviceType}
        copyText={deviceType}
        onCopy={onCopy}
        color={color}
      />
      <TechRow
        label={t('settings.internalTech.networkType')}
        value={networkType || empty}
        copyText={networkType}
        onCopy={onCopy}
        color={color}
      />
      <TechRow
        label={t('settings.internalTech.networkStatus')}
        value={networkStatus || empty}
        copyText={networkStatus}
        onCopy={onCopy}
        color={color}
      />
      <TechRow
        label={t('settings.internalTech.cellularGeneration')}
        value={cellularGeneration || empty}
        copyText={cellularGeneration}
        onCopy={onCopy}
        color={color}
      />
      <TechRow
        label={t('settings.internalTech.cpuUsage')}
        value={cpuDisplay}
        copyText={cpuDisplay}
        onCopy={onCopy}
        color={color}
        valueColor={cpuValueColor}
      />
      <TechRow
        label={t('settings.internalTech.memoryUsage')}
        value={memoryDisplay}
        copyText={memoryDisplay}
        onCopy={onCopy}
        color={color}
        valueColor={memoryValueColor}
        isLast
      />
    </View>
  );
};
