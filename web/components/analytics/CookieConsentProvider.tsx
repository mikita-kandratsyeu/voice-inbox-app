'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useTranslations } from 'next-intl';

import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { YandexMetrika } from '@/components/analytics/YandexMetrika';
import { marketingGutterClass } from '@/components/landing/marketing-layout';
import { Link } from '@/lib/i18n';
import {
  readCookieConsent,
  writeCookieConsent,
  type CookieConsentChoice,
} from '@/lib/cookie-consent';

type CookieConsentContextValue = {
  consent: CookieConsentChoice | null;
  openPreferences: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function useCookieConsent(): CookieConsentContextValue {
  const value = useContext(CookieConsentContext);
  if (!value) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider');
  }
  return value;
}

type CookieConsentBannerProps = {
  onAccept: () => void;
  onReject: () => void;
};

function CookieConsentBanner({ onAccept, onReject }: CookieConsentBannerProps): ReactElement {
  const t = useTranslations('cookieConsent');

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-70 border-t border-black/8 bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/75 dark:border-white/10 dark:bg-[#0a0a0a]/88 dark:supports-[backdrop-filter]:bg-[#0a0a0a]/75"
      role="dialog"
      aria-label={t('bannerAria')}
    >
      <div
        className={`${marketingGutterClass} pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 sm:pt-3.5`}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <p className="max-w-2xl text-[13px] leading-relaxed text-black/65 sm:text-sm dark:text-white/65">
            {t.rich('message', {
              privacy: (chunks) => (
                <Link
                  href="/privacy"
                  className="font-medium text-black/80 underline decoration-black/25 underline-offset-2 transition-colors hover:text-black hover:decoration-black/50 dark:text-white/85 dark:decoration-white/30 dark:hover:text-white dark:hover:decoration-white/50"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
          <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onReject}
              className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg px-3.5 text-[13px] font-medium text-black/70 transition-colors hover:bg-black/5 hover:text-black sm:text-sm dark:text-white/70 dark:hover:bg-white/8 dark:hover:text-white"
            >
              {t('reject')}
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-black px-4 text-[13px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.1)_inset] transition-colors hover:bg-black/90 sm:text-sm dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              {t('accept')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type CookieConsentProviderProps = {
  children: ReactNode;
};

export function CookieConsentProvider({ children }: CookieConsentProviderProps): ReactElement {
  const [consent, setConsent] = useState<CookieConsentChoice | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readCookieConsent();
    setConsent(stored);
    setShowBanner(stored === null);
    setHydrated(true);
  }, []);

  const persistChoice = useCallback((choice: CookieConsentChoice) => {
    writeCookieConsent(choice);
    setConsent(choice);
    setShowBanner(false);
  }, []);

  const openPreferences = useCallback(() => {
    setShowBanner(true);
  }, []);

  const contextValue = useMemo(
    () => ({
      consent,
      openPreferences,
    }),
    [consent, openPreferences],
  );

  return (
    <CookieConsentContext.Provider value={contextValue}>
      {children}
      {hydrated && consent === 'accepted' ? (
        <>
          <GoogleAnalytics />
          <YandexMetrika />
        </>
      ) : null}
      {hydrated && showBanner ? (
        <CookieConsentBanner
          onAccept={() => persistChoice('accepted')}
          onReject={() => persistChoice('rejected')}
        />
      ) : null}
    </CookieConsentContext.Provider>
  );
}

export function CookieSettingsLink(): ReactElement {
  const t = useTranslations('cookieConsent');
  const { openPreferences } = useCookieConsent();

  return (
    <button
      type="button"
      onClick={openPreferences}
      className="font-medium text-black/65 transition-colors hover:text-black dark:text-white/75 dark:hover:text-white"
    >
      {t('settingsLink')}
    </button>
  );
}
