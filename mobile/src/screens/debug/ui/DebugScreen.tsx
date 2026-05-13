import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/app/navigation/types';
import { useColors } from '@/shared/config';
import { isTestflightInternalBuild } from '@/shared/config/buildEnv';
import { SCREEN_PADDING, ScreenHeader } from '@/shared/ui';

import { SettingsDebugSection } from '../../settings/ui/sections/SettingsDebugSection';
import { SettingsInternalTechInfo } from '../../settings/ui/SettingsInternalTechInfo';
import { useDebugScreen } from '../lib/useDebugScreen';

export const DebugScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const color = useColors();
  const { handleHardReset, isHardResetting, showCrashlyticsButton } = useDebugScreen();
  const isTf = isTestflightInternalBuild();

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('settings.debugScreen.title')} onBack={() => navigation.goBack()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: 16,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <SettingsDebugSection
          color={color}
          onHardReset={handleHardReset}
          isHardResetting={isHardResetting}
          showCrashlyticsButton={showCrashlyticsButton}
        />
        {!isTf && __DEV__ ? (
          <Text
            className="mt-4 rounded-xl border px-4 py-3 text-sm leading-5"
            style={{
              borderColor: color.border.default,
              color: color.text.secondary,
              backgroundColor: color.background.primary,
            }}
          >
            {t('settings.debugScreen.localDevNotice')}
          </Text>
        ) : null}
        {isTf ? <SettingsInternalTechInfo /> : null}
      </ScrollView>
    </View>
  );
};
