import { WEB_API_URL } from '@env';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SupportForm } from '@/features/tech-support';
import { getColors, useAppTheme } from '@/shared/config';
import { useIsTablet } from '@/shared/lib';
import { ScreenHeader } from '@/shared/ui';

export const SupportScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const color = getColors(useAppTheme());
  const isTablet = useIsTablet();
  const contentMaxWidth = isTablet ? 720 : undefined;
  const apiConfigured = Boolean(WEB_API_URL?.trim());

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('support.title')} onBack={() => navigation.goBack()} />
      <View style={{ flex: 1, alignSelf: 'center', width: '100%', maxWidth: contentMaxWidth }}>
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 16,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bottomOffset={16}
        >
          {!apiConfigured ? (
            <Text className="text-[15px] leading-6" style={{ color: color.text.secondary }}>
              {t('support.apiNotConfigured')}
            </Text>
          ) : (
            <SupportForm color={color} />
          )}
        </KeyboardAwareScrollView>
      </View>
    </View>
  );
};
