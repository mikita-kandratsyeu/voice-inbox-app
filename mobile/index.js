import '@/features/model-manager/lib/recoverInterruptedWhisperDownloads';

import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import { AppRegistry } from 'react-native';

import App from '@/app/App';
import { initAnalytics } from '@/shared/lib/analytics';
import { initCrashlytics } from '@/shared/lib/crashlytics';
import { initI18n } from '@/shared/lib/i18n';

import { name as appName } from './app.json';

initI18n();
void initCrashlytics();
void initAnalytics();

const messaging = getMessaging();
setBackgroundMessageHandler(messaging, async () => {});

AppRegistry.registerComponent(appName, () => App);
