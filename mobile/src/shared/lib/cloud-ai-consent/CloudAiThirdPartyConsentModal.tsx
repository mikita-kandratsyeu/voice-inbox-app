import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettingsStore } from '@/entities/settings';
import { openInAppBrowser } from '@/features/in-app-browser';
import { getWebsiteUrl, useAppTheme, useColors } from '@/shared/config';
import { IS_ANDROID } from '@/shared/lib/platform';
import { SheetFooterButtons } from '@/shared/ui';

import { useCloudAiConsentUiStore } from './cloudAiConsentUiStore';

export function CloudAiThirdPartyConsentModal() {
  const { t } = useTranslation();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const browserScheme = useAppTheme();
  const sheetVisible = useCloudAiConsentUiStore((s) => s.sheetVisible);
  const submit = useCloudAiConsentUiStore((s) => s.submit);
  const setConsent = useSettingsStore((s) => s.setCloudAiThirdPartyConsentAccepted);

  const baseUrl = getWebsiteUrl().trim();

  return (
    <Modal visible={sheetVisible} animationType="fade" transparent>
      <View
        className="flex-1 justify-end px-4"
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 16),
          backgroundColor: 'rgba(0,0,0,0.45)',
        }}
      >
        <View
          className="max-h-[88%] overflow-hidden rounded-2xl"
          style={{
            backgroundColor: c.background.primary,
            borderWidth: 1,
            borderColor: c.border.default,
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}
          >
            <Text
              className="text-[20px] font-bold leading-7"
              style={{
                color: c.text.primary,
                ...(IS_ANDROID ? { includeFontPadding: false } : {}),
              }}
            >
              {t('cloudAiConsent.title')}
            </Text>
            <Text
              className="mt-3 text-[15px] leading-[22px]"
              style={{
                color: c.text.secondary,
                ...(IS_ANDROID ? { includeFontPadding: false } : {}),
              }}
            >
              {t('cloudAiConsent.body')}
            </Text>
            {baseUrl.length > 0 && (
              <Pressable
                className="mt-4 self-start py-1"
                accessibilityRole="link"
                onPress={() => void openInAppBrowser(`${baseUrl}/privacy`, browserScheme)}
              >
                <Text
                  className="text-[15px] font-semibold underline"
                  style={{ color: c.accent.primary }}
                >
                  {t('cloudAiConsent.privacyLink')}
                </Text>
              </Pressable>
            )}
          </ScrollView>
          <View className="px-5 pb-5 pt-2">
            <SheetFooterButtons
              color={c}
              primaryLabel={t('cloudAiConsent.agree')}
              onPrimaryPress={() => {
                setConsent(true);
                submit(true);
              }}
              secondaryLabel={t('cloudAiConsent.notNow')}
              onSecondaryPress={() => submit(false)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
