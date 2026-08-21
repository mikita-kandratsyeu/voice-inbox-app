import { ArrowUpRight, GitBranch } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { GITHUB_URL } from '@/config/constants';
import { Header } from '@/components/landing/Header';

type OpenSourceBannerProps = {
  href: string;
};

export function OpenSourceBanner({ href }: OpenSourceBannerProps): React.ReactElement {
  const t = useTranslations('openSourceBanner');

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('aria')}
      className="group flex min-h-10 items-center justify-center gap-2 bg-black px-3 py-2 text-center text-[13px] leading-tight text-white sm:min-h-11 sm:gap-2.5 sm:px-4 sm:text-sm dark:bg-white dark:text-black"
    >
      <GitBranch className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
      <span className="font-semibold tracking-tight">{t('badge')}</span>
      <span className="hidden text-white/75 sm:inline dark:text-black/65">{t('message')}</span>
      <span className="inline-flex items-center gap-0.5 font-medium text-white/90 underline-offset-2 group-hover:underline dark:text-black/80">
        {t('cta')}
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </span>
    </a>
  );
}

type LandingTopBarProps = {
  hideHeaderOnMobile?: boolean;
};

/** Sticky header; prepends the source-available strip when `NEXT_PUBLIC_GITHUB_URL` is set. */
export function LandingTopBar({
  hideHeaderOnMobile = false,
}: LandingTopBarProps): React.ReactElement {
  if (!GITHUB_URL) {
    return <Header hideOnMobile={hideHeaderOnMobile} />;
  }

  return (
    <div className="sticky top-0 z-50">
      <OpenSourceBanner href={GITHUB_URL} />
      <Header hideOnMobile={hideHeaderOnMobile} sticky={false} />
    </div>
  );
}
