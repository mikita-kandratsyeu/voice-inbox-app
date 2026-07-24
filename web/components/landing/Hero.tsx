import { ChevronRight, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { HeroSocialProof } from '@/components/landing/HeroSocialProof';
import { marketingContentClass, marketingGutterClass } from '@/components/landing/marketing-layout';
import { CopyProtected } from '@/components/ui/CopyProtected';
import { GO_STORE_REDIRECT_PATH } from '@/config/constants';
import type { LandingSocialProofConfig } from '@/lib/landing-social-proof-defaults';

type HeroProps = {
  socialProof: LandingSocialProofConfig;
};

export function Hero({ socialProof }: HeroProps): React.ReactElement {
  const t = useTranslations('hero');

  return (
    <section
      className={`relative overflow-x-clip pt-12 pb-8 sm:pt-16 sm:pb-10 md:pt-24 md:pb-11 ${marketingGutterClass}`}
    >
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(99,102,241,0.16)_0%,transparent_55%)]"
        aria-hidden
      />
      <div className={`${marketingContentClass} mx-auto max-w-4xl text-center`}>
        <p className="animate-fade-in mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-[11px] font-medium tracking-wide text-blue-700 sm:mb-6 sm:px-3.5 sm:text-xs dark:border-blue-400/25 dark:bg-blue-500/14 dark:text-blue-300">
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {t('eyebrow')}
        </p>

        <h1 className="hero-headline-gradient animate-fade-in mb-4 text-balance text-[2rem] font-bold tracking-tight min-[400px]:text-[2.5rem] sm:mb-5 sm:text-5xl md:text-6xl lg:text-7xl">
          {t('headline')}
        </h1>

        <p className="animate-fade-in-delay-1 mx-auto mb-5 max-w-xl text-pretty text-base leading-relaxed text-black/65 sm:mb-6 sm:text-lg dark:text-white/65">
          {t('subtitle')}
        </p>

        <HeroSocialProof config={socialProof} />

        <div className="animate-fade-in-delay-3 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={GO_STORE_REDIRECT_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-black px-6 py-3 text-base font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.28)] ring-1 ring-black/8 transition-all duration-250 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.32)] sm:w-auto dark:bg-white dark:text-black dark:ring-white/15"
          >
            {t('downloadApp')}
          </a>
          <a
            href="#how-it-works"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-1 rounded-xl border border-black/12 bg-white/88 px-6 py-3 text-base font-medium text-black transition-all duration-250 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_26px_rgba(15,23,42,0.08)] sm:w-auto dark:border-white/15 dark:bg-white/7 dark:text-white dark:hover:bg-white/10 dark:hover:shadow-[0_16px_30px_rgba(0,0,0,0.28)]"
          >
            {t('howItWorks')}
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          </a>
        </div>

        <CopyProtected className="animate-fade-in-delay-4 mx-auto mt-5 max-w-xl select-none text-center text-xs leading-relaxed sm:mt-6">
          <span className="whitespace-nowrap font-semibold text-emerald-700 dark:text-emerald-300">
            {t('footnoteBadge')}
            <span className="font-normal text-black/40 dark:text-white/40" aria-hidden>
              {' '}
              —
            </span>
          </span>{' '}
          <span className="text-black/55 dark:text-white/55">{t('footnote')}</span>
        </CopyProtected>
      </div>
    </section>
  );
}
