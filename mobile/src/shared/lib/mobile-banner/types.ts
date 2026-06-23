export const MOBILE_BANNER_LOCALES = ['en', 'ru'] as const;
export type MobileBannerLocale = (typeof MOBILE_BANNER_LOCALES)[number];

export type MobileBannerPlatform = 'ios' | 'android';

export type MobileBannerLocaleContent = {
  title: string;
  body: string;
  ctaLabel: string | null;
};

export type MobileBannerConfig = {
  id: string;
  enabled: boolean;
  ctaUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  platforms: MobileBannerPlatform[];
  minAppVersion: string | null;
  dismissible: boolean;
  locales: Record<MobileBannerLocale, MobileBannerLocaleContent>;
};

export type MobileBannerManifest = {
  schemaVersion: 2;
  revision: number;
  banner: MobileBannerConfig | null;
};

/** Resolved banner copy for the active app locale. */
export type MobileBanner = {
  id: string;
  enabled: boolean;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  platforms: MobileBannerPlatform[];
  minAppVersion: string | null;
  dismissible: boolean;
};
