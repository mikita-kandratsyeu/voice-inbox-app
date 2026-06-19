import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RefreshCcwIcon, ShareIcon, TrashIcon } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { SettingsStackParamList } from '@/app/navigation/types';
import { useColors } from '@/shared/config';
import { formatFileSize } from '@/shared/lib';
import { clearAppLogs, getAppLogSize, readAppLogTail } from '@/shared/lib/appLogger';
import { Button, FrostedHeaderIconButton, ScreenHeader } from '@/shared/ui';

const MAX_TAIL_BYTES = 200 * 1024;

export const DiagnosticLogsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const [logText, setLogText] = useState('');
  const [logSize, setLogSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [text, size] = await Promise.all([readAppLogTail(MAX_TAIL_BYTES), getAppLogSize()]);
      setLogText(text);
      setLogSize(size);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClearLogs = useCallback(async () => {
    setActionLoading(true);
    try {
      await clearAppLogs();
      await loadLogs();
    } finally {
      setActionLoading(false);
    }
  }, [loadLogs]);

  const handleShareLogs = useCallback(async () => {
    await Share.share({
      title: t('diagnosticLogs.shareTitle'),
      message: logText || t('diagnosticLogs.shareEmpty'),
    });
  }, [logText, t]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('diagnosticLogs.title')}
        onBack={() => navigation.goBack()}
        rightSlot={
          <FrostedHeaderIconButton
            iconOnly
            variant="icon"
            size="md"
            icon={<ShareIcon size={20} color={color.text.primary} strokeWidth={2} />}
            color={color}
            onPress={handleShareLogs}
            accessibilityLabel={t('diagnosticLogs.share')}
          />
        }
      />
      <View style={{ flex: 1, width: '100%', alignSelf: 'center' }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, false),
            minHeight: '100%',
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="mb-4 text-[14px] leading-6" style={{ color: color.text.secondary }}>
            {t('diagnosticLogs.description')}
          </Text>

          <View
            className="mb-4 rounded-3xl border px-4 py-4"
            style={{
              borderColor: color.border.default,
              backgroundColor: color.background.tertiary,
            }}
          >
            <View className="mb-3 flex-row items-center justify-between gap-2">
              <Text className="text-[14px] font-semibold" style={{ color: color.text.primary }}>
                {t('diagnosticLogs.size', { size: formatFileSize(logSize) })}
              </Text>
              <View className="flex-row items-center gap-1.5">
                <Button
                  accessibilityLabel={t('diagnosticLogs.refresh')}
                  color={color}
                  icon={<RefreshCcwIcon size={20} color={color.text.primary} strokeWidth={2} />}
                  iconOnly
                  onPress={loadLogs}
                  variant="icon"
                />
                <Button
                  accessibilityLabel={t('diagnosticLogs.clear')}
                  color={color}
                  icon={<TrashIcon size={20} color={color.accent.delete} strokeWidth={2} />}
                  iconOnly
                  loading={actionLoading}
                  onPress={handleClearLogs}
                  variant="icon"
                />
              </View>
            </View>
            <Text className="text-[13px] leading-5" style={{ color: color.text.secondary }}>
              {t('diagnosticLogs.widgetHint')}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={color.accent.primary} />
          ) : logText ? (
            <View
              className="rounded-2xl border px-4 py-4"
              style={{
                borderColor: color.border.default,
                backgroundColor: color.background.tertiary,
              }}
            >
              <Text
                className="text-[12px] leading-5"
                style={{ color: color.text.secondary, fontFamily: 'Menlo' as const }}
              >
                {logText}
              </Text>
              {logSize > MAX_TAIL_BYTES ? (
                <Text className="mt-3 text-[12px]" style={{ color: color.text.secondary }}>
                  {t('diagnosticLogs.truncated')}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text className="text-[14px] leading-6" style={{ color: color.text.secondary }}>
              {t('diagnosticLogs.empty')}
            </Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
};
