import '../../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { NavigationContainer } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { usePrivateAiTaskQueueBridge } from '@/features/ai-task-queue';
import {
  AnimatedBootSplash,
  AppProcessingKeepAwake,
  type BootstrapCriticalError,
  useAndroidLayoutAnimation,
  useAppBootstrap,
  useAppForegroundLifecycle,
  usePushNotificationOpenedApp,
  useYandexMobileAdsInit,
} from '@/features/app-lifecycle';
import { AppLockGate, AppSwitcherPrivacyOverlay } from '@/features/app-lock';
import { AppRatingPromptRoot } from '@/features/app-review';
import { GithubSyncProgressOverlay } from '@/features/github-sync';
import { GitlabSyncProgressOverlay } from '@/features/gitlab-sync';
import { IcloudSyncProgressOverlay } from '@/features/icloud-sync';
import { flushPendingSharedAudioImport } from '@/features/import-audio-file/lib/sharedAudioImportRegistry';
import { OnboardingGate } from '@/features/onboarding';
import { PlanPaywallProvider } from '@/features/plan-paywall';
import {
  ProEntitlementProvider,
  useResetAccentWhenNotPro,
  useResetPrivateAiServerWhenNotPro,
  useResetProOnlyAiModelWhenNotPro,
} from '@/features/pro-license';
import { useShakeGestures } from '@/features/shake-to-record';
import { useTaskDeadlineNotificationHandlers } from '@/features/task-deadline-notifications/model/useTaskDeadlineNotificationHandlers';
import { TaskDeadlineActionSheet } from '@/features/task-deadline-notifications/ui/TaskDeadlineActionSheet';
import { TranscriptionResumePrompt } from '@/features/transcription';
import {
  BootSplashVisibleProvider,
  initReduceMotionCheck,
  useAppTheme,
  useBootSplashVisible,
  useColors,
} from '@/shared/config';
import { E2EReadyMarker } from '@/shared/e2e';
import { i18n, NetworkStatusProvider } from '@/shared/lib';
import { logAnalyticsScreenView } from '@/shared/lib/analytics';
import { logInfo, setupAppLogger } from '@/shared/lib/appLogger';
import { CloudAiThirdPartyConsentModal } from '@/shared/lib/cloud-ai-consent';
import {
  type PushNotificationData,
  PushNotificationSheet,
  usePushNotifications,
} from '@/shared/lib/push';
import { WarmupBottomSheet } from '@/shared/ui';

import { useInitDeepLinking } from './deep-linking';
import { handlePushNotification } from './model/pushNavigationHandler';
import { openTaskDeadlineRecord } from './model/taskDeadlineNavigationHandler';
import { flushDeferredNavigation } from './navigation/deferredNavigation';
import { navigationRef } from './navigation/navigationRef';
import { RootNavigator } from './navigation/RootNavigator';

const App = () => {
  const [bootSplashVisible, setBootSplashVisible] = useState(true);

  return (
    <BootSplashVisibleProvider value={bootSplashVisible}>
      <ProEntitlementProvider>
        <AppShell setBootSplashVisible={setBootSplashVisible} />
      </ProEntitlementProvider>
    </BootSplashVisibleProvider>
  );
};

type AppShellProps = {
  setBootSplashVisible: (visible: boolean) => void;
};

const AppShell = ({ setBootSplashVisible }: AppShellProps) => {
  const theme = useAppTheme();
  const color = useColors();
  const bootSplashVisible = useBootSplashVisible();

  const isDark = theme === 'dark';

  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [webApiReady, setWebApiReady] = useState(false);
  const routeNameRef = useRef<string | undefined>(undefined);

  const onPushData = useCallback((data: PushNotificationData) => {
    handlePushNotification(data);
  }, []);

  const onBootstrapReady = useCallback(() => {
    setBootstrapReady(true);
  }, []);

  const onWebApiReady = useCallback(() => {
    setWebApiReady(true);
  }, []);

  const onBootSplashAnimationEnd = useCallback(() => {
    setBootSplashVisible(false);
  }, [setBootSplashVisible]);

  const onCriticalError = useCallback((_kind: BootstrapCriticalError) => {
    Alert.alert(i18n.t('bootstrap.dbErrorTitle'), i18n.t('bootstrap.dbErrorMessage'), [
      { text: i18n.t('bootstrap.dbErrorRestart') },
    ]);
  }, []);

  useInitDeepLinking();
  usePushNotifications({ onNotification: onPushData });
  usePushNotificationOpenedApp(onPushData);
  useTaskDeadlineNotificationHandlers();
  useAndroidLayoutAnimation();
  useYandexMobileAdsInit();
  useAppBootstrap(onPushData, { onBootstrapReady, onWebApiReady, onCriticalError });
  useAppForegroundLifecycle(webApiReady);
  usePrivateAiTaskQueueBridge();
  useResetAccentWhenNotPro({ enabled: !bootSplashVisible });
  useResetProOnlyAiModelWhenNotPro({ enabled: !bootSplashVisible });
  useResetPrivateAiServerWhenNotPro({ enabled: !bootSplashVisible });
  useShakeGestures({ enabled: bootstrapReady && !bootSplashVisible });

  useEffect(() => {
    setupAppLogger();
    void initReduceMotionCheck();

    logInfo('App startup');
  }, []);

  const rootStyle = { flex: 1 };
  const safeAreaStyle = { backgroundColor: color.background.primary };

  return (
    <GestureHandlerRootView style={rootStyle}>
      <KeyboardProvider>
        <SafeAreaProvider style={safeAreaStyle}>
          <PlanPaywallProvider>
            <NetworkStatusProvider>
              <BottomSheetModalProvider>
                <StatusBar
                  barStyle={isDark ? 'light-content' : 'dark-content'}
                  backgroundColor={color.background.primary}
                />
                <NavigationContainer
                  ref={navigationRef}
                  onReady={() => {
                    routeNameRef.current = navigationRef.getCurrentRoute()?.name;
                    flushDeferredNavigation();
                    flushPendingSharedAudioImport();
                  }}
                  onStateChange={() => {
                    const previous = routeNameRef.current;
                    const current = navigationRef.getCurrentRoute()?.name;
                    if (current != null && current !== previous) {
                      routeNameRef.current = current;
                      void logAnalyticsScreenView(current);
                    }
                  }}
                >
                  <OnboardingGate>
                    <AppLockGate>
                      <AppProcessingKeepAwake />
                      <TranscriptionResumePrompt />
                      <RootNavigator />
                    </AppLockGate>
                  </OnboardingGate>
                </NavigationContainer>
                <WarmupBottomSheet />
                <CloudAiThirdPartyConsentModal />
                <PushNotificationSheet />
                <TaskDeadlineActionSheet onOpenNote={openTaskDeadlineRecord} />
                <AppRatingPromptRoot />
                <E2EReadyMarker />
                <GithubSyncProgressOverlay />
                <GitlabSyncProgressOverlay />
                <IcloudSyncProgressOverlay />
              </BottomSheetModalProvider>
              <AppSwitcherPrivacyOverlay />
            </NetworkStatusProvider>
          </PlanPaywallProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
      {bootSplashVisible && (
        <AnimatedBootSplash ready={bootstrapReady} onAnimationEnd={onBootSplashAnimationEnd} />
      )}
    </GestureHandlerRootView>
  );
};

export default App;
