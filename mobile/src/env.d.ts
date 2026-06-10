declare module '@env' {
  export const ANALYTICS_DEBUG: string | undefined;
  export const CRASHLYTICS_DEBUG: string | undefined;
  export const APP_ENV: string;
  export const APP_STORE_URL: string | undefined;
  export const GOOGLE_PLAY_URL: string | undefined;
  export const WEBSITE_URL: string | undefined;
  export const DATABASE_URL: string | undefined;
  export const DB_LOG: string | undefined;
  export const WEB_API_URL: string | undefined;
  /** TEMPORARY: preview/staging API host; remove when folded into WEB_API_URL. */
  export const PREVIEW_WEB_API_URL: string | undefined;
  export const MOBILE_USER_AGENT: string | undefined;
  export const YANDEX_REWARDED_AD_UNIT_ID: string | undefined;
  export const YANDEX_BANNER_AD_UNIT_ID: string | undefined;
  export const YANDEX_INTERSTITIAL_AD_UNIT_ID: string | undefined;
  export const TESTFLIGHT_INTERNAL_BUILD: string | undefined;
  export const SUBSCRIPTIONS_PUBLICLY_AVAILABLE: string | undefined;
  export const PRO_LICENSE_KEY_ACTIVATION_ENABLED: string | undefined;
  export const FIREBASE_APP_CHECK_DEBUG_TOKEN: string | undefined;
  export const REVENUECAT_API_KEY_IOS: string | undefined;
  export const REVENUECAT_API_KEY_ANDROID: string | undefined;
  export const REVENUECAT_ENTITLEMENT_ID: string | undefined;
  export const REVENUECAT_PACKAGE_TYPE_PREFERRED: string | undefined;
  export const REVENUECAT_AI_RESET_PRODUCT_ID: string | undefined;
}
