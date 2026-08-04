import { FIREBASE_APP_CHECK_DEBUG_TOKEN } from '@env';
import { getApp } from '@react-native-firebase/app';
import { getToken, initializeAppCheck } from '@react-native-firebase/app-check';
// @ts-ignore
import ReactNativeFirebaseAppCheckProvider from '@react-native-firebase/app-check/dist/module/ReactNativeFirebaseAppCheckProvider';

import { isString } from '@/shared/lib/type-guards';

type AppCheckInstance = Awaited<ReturnType<typeof initializeAppCheck>>;

const APP_CHECK_INIT_TIMEOUT_MS = 5_000;

let appCheckInstance: AppCheckInstance | null = null;
let initPromise: Promise<AppCheckInstance> | null = null;

function buildAppCheckProvider(): ReactNativeFirebaseAppCheckProvider {
  const appCheckDebugToken =
    isString(FIREBASE_APP_CHECK_DEBUG_TOKEN) && FIREBASE_APP_CHECK_DEBUG_TOKEN.length > 0
      ? FIREBASE_APP_CHECK_DEBUG_TOKEN
      : undefined;

  const rnfbProvider = new ReactNativeFirebaseAppCheckProvider();
  rnfbProvider.configure({
    android: {
      provider: __DEV__ ? 'debug' : 'playIntegrity',
      ...(appCheckDebugToken != null ? { debugToken: appCheckDebugToken } : {}),
    },
    apple: {
      provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
      ...(appCheckDebugToken != null ? { debugToken: appCheckDebugToken } : {}),
    },
  });

  return rnfbProvider;
}

export function initFirebaseAppCheck(): Promise<AppCheckInstance> {
  if (appCheckInstance) {
    return Promise.resolve(appCheckInstance);
  }

  if (!initPromise) {
    initPromise = Promise.race([
      initializeAppCheck(getApp(), {
        provider: buildAppCheckProvider(),
        isTokenAutoRefreshEnabled: true,
      }).then((instance) => {
        appCheckInstance = instance;
        return instance;
      }),
      new Promise<AppCheckInstance>((_, reject) => {
        setTimeout(() => reject(new Error('app_check_init_timeout')), APP_CHECK_INIT_TIMEOUT_MS);
      }),
    ]).catch((err) => {
      initPromise = null;
      throw err;
    });
  }

  return initPromise;
}

export async function getFirebaseAppCheckToken(): Promise<string> {
  const instance = await initFirebaseAppCheck();
  const { token } = await getToken(instance, false);
  if (!token) {
    throw new Error('Firebase App Check token is empty');
  }

  return token;
}
