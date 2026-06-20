import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import type { RootStackParamList } from '@/app/navigation/types';
import { fetchInAppEventPage } from '@/features/in-app-event/api/fetchInAppEventPage';
import type { InAppEventPagePayload } from '@/features/in-app-event/api/types';
import { IN_APP_EVENT_NATIVE_TOP_GAP } from '@/features/in-app-event/lib/eventContentMetrics';
import { getInAppEventSurfaceColor } from '@/features/in-app-event/lib/eventSurfaceColor';
import { useAppTheme, useColors } from '@/shared/config';
import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { hapticSelection, IS_ANDROID, useTabletContentMaxWidth } from '@/shared/lib';
import { Button } from '@/shared/ui';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; page: InAppEventPagePayload }
  | { kind: 'error' };

export const InAppEventDetailScreen = () => {
  const { t, i18n } = useTranslation();
  const color = useColors();
  const colorScheme = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'InAppEventDetail'>>();
  const contentMaxWidth = useTabletContentMaxWidth('wide');

  const { eventId } = route.params;
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [isWebViewLoading, setIsWebViewLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadState({ kind: 'loading' });
    setIsWebViewLoading(false);

    void (async () => {
      const result = await fetchInAppEventPage(eventId, {
        locale: i18n.language,
        theme: colorScheme,
      });
      if (cancelled) return;

      if (result.ok) {
        setIsWebViewLoading(true);
        setLoadState({ kind: 'ready', page: result.page });
        return;
      }

      setLoadState({ kind: 'error' });
    })();

    return () => {
      cancelled = true;
    };
  }, [colorScheme, eventId, i18n.language]);

  const handleClose = useCallback(() => {
    hapticSelection();
    navigation.goBack();
  }, [navigation]);

  const titleStyle = IS_ANDROID ? { includeFontPadding: false } : undefined;

  const ctaLabel = useMemo(() => {
    if (loadState.kind === 'ready' && loadState.page.ctaLabel) {
      return loadState.page.ctaLabel;
    }
    return t('inAppEvent.primaryCta');
  }, [loadState, t]);

  const webViewBaseUrl = useMemo(() => {
    const base = getWebApiUrl().trim();
    return base ? base.replace(/\/$/, '') : undefined;
  }, []);

  const isContentLoading = loadState.kind === 'loading' || isWebViewLoading;
  const eventSurfaceColor = getInAppEventSurfaceColor(colorScheme);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: eventSurfaceColor,
        paddingTop: insets.top + IN_APP_EVENT_NATIVE_TOP_GAP,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <View
        style={{
          flex: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth,
        }}
      >
        <View style={{ flex: 1 }}>
          {loadState.kind === 'error' ? (
            <View className="flex-1 justify-center px-6">
              <View className="mb-6 w-full flex-row items-center gap-3 self-stretch">
                <View
                  className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[18px]"
                  style={{
                    borderWidth: 1,
                    borderColor: `${color.accent.primary}40`,
                    backgroundColor: color.background.card,
                  }}
                >
                  <Image
                    source={require('@/shared/assets/app-icon.png')}
                    className="h-full w-full"
                    resizeMode="cover"
                    accessibilityRole="image"
                    accessibilityLabel={t('inAppEvent.unknown.title')}
                  />
                </View>
                <View className="min-w-0 flex-1 py-0.5">
                  <Text
                    className="text-left text-[20px] font-bold leading-6 tracking-tight"
                    style={[{ color: color.text.primary }, titleStyle]}
                    accessibilityRole="header"
                  >
                    {t('inAppEvent.unknown.title')}
                  </Text>
                  <Text
                    className="mt-2 text-left text-[14px] leading-5"
                    style={[{ color: color.text.secondary }, titleStyle]}
                  >
                    {t('inAppEvent.unknown.subtitle')}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {loadState.kind === 'ready' ? (
            <WebView
              style={{ flex: 1, backgroundColor: eventSurfaceColor }}
              containerStyle={{ backgroundColor: eventSurfaceColor }}
              source={{
                html: loadState.page.documentHtml,
                baseUrl: webViewBaseUrl,
              }}
              contentInsetAdjustmentBehavior="never"
              automaticallyAdjustsScrollIndicatorInsets={false}
              originWhitelist={['*']}
              javaScriptEnabled={false}
              domStorageEnabled={false}
              allowsInlineMediaPlayback={false}
              mediaPlaybackRequiresUserAction
              showsVerticalScrollIndicator={false}
              onLoadStart={() => setIsWebViewLoading(true)}
              onLoadEnd={() => setIsWebViewLoading(false)}
              onError={() => setIsWebViewLoading(false)}
              onShouldStartLoadWithRequest={(request) => {
                const url = request.url.trim();
                const base = webViewBaseUrl?.replace(/\/$/, '');
                return (
                  url === 'about:blank' ||
                  url.startsWith('about:srcdoc') ||
                  (base != null && (url === base || url === `${base}/`))
                );
              }}
            />
          ) : null}

          {isContentLoading ? (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: eventSurfaceColor,
                },
              ]}
            >
              <ActivityIndicator size="large" color={color.accent.primary} />
            </View>
          ) : null}
        </View>

        {!isContentLoading ? (
          <View
            style={{
              backgroundColor: eventSurfaceColor,
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: insets.bottom + 18,
            }}
          >
            <Button
              color={color}
              variant="primary"
              size="lg"
              fullWidth
              label={ctaLabel}
              onPress={handleClose}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
};
