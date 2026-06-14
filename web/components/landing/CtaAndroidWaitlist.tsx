'use client';

import { useTranslations } from 'next-intl';

import { ANDROID_WAITLIST_URL, GOOGLE_PLAY_URL, isPublicHttpUrl } from '@/config/constants';

export function CtaAndroidWaitlist(): React.ReactElement | null {
  const t = useTranslations('cta');

  const show = !isPublicHttpUrl(GOOGLE_PLAY_URL) && isPublicHttpUrl(ANDROID_WAITLIST_URL);

  if (!show) {
    return null;
  }

  return (
    <div className="mt-4 w-full border-t border-white/10 pt-4">
      <section
        className="mx-auto flex flex-col items-center gap-0.5"
        role="region"
        aria-label={t('androidWaitlistAria')}
      >
        <p className="text-center text-sm font-semibold tracking-tight text-white/88">
          {t('androidSoonLabel')}
        </p>
        <a
          href={ANDROID_WAITLIST_URL}
          className={[
            'inline-flex min-h-[44px] items-center justify-center rounded-lg px-2 py-1.5 text-center text-sm font-medium text-white/80',
            'underline decoration-white/35 underline-offset-[5px]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
          ].join(' ')}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('androidWaitlistLink')}
        </a>
      </section>
    </div>
  );
}
