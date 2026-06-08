import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { LandingSocialProofConfig } from '@/lib/landing-social-proof-defaults';
import { GO_STORE_REDIRECT_PATH } from '@/config/constants';

type HeroSocialProofProps = {
  config: LandingSocialProofConfig;
};

function starFillState(starIndex: number, rating: number): 'full' | 'partial' | 'empty' {
  if (rating >= starIndex) return 'full';
  if (rating >= starIndex - 0.5) return 'partial';
  return 'empty';
}

export function HeroSocialProof({ config }: HeroSocialProofProps): React.ReactElement | null {
  const t = useTranslations('hero.socialProof');

  if (!config.enabled || config.ratingsCount <= 0) {
    return null;
  }

  return (
    <a
      href={GO_STORE_REDIRECT_PATH}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('appStoreAria', {
        rating: config.rating,
        count: config.ratingsCount,
      })}
      className="animate-fade-in-delay-2 group mx-auto mb-6 flex w-fit items-center gap-1.5 text-sm font-medium transition-colors sm:mb-8"
    >
      <span
        className="flex items-center gap-px text-black/75 group-hover:text-black/90 dark:text-white/75 dark:group-hover:text-white/90"
        aria-hidden
      >
        {Array.from({ length: 5 }, (_, index) => {
          const starIndex = index + 1;
          const state = starFillState(starIndex, config.rating);
          return (
            <Star
              key={starIndex}
              className={
                state === 'full'
                  ? 'h-3 w-3 fill-amber-400 text-amber-400'
                  : state === 'partial'
                    ? 'h-3 w-3 fill-amber-400/45 text-amber-400'
                    : 'h-3 w-3 text-black/12 dark:text-white/15'
              }
              strokeWidth={1.75}
            />
          );
        })}
      </span>
      <span className="tabular-nums text-black/75 group-hover:text-black/90 dark:text-white/75 dark:group-hover:text-white/90">
        {config.rating.toFixed(1)}
      </span>
      <span className="font-normal text-black/40 dark:text-white/40" aria-hidden>
        ·
      </span>
      <span className="font-normal text-black/55 group-hover:text-black/70 dark:text-white/55 dark:group-hover:text-white/70">
        {t('ratingsCount', { count: config.ratingsCount })}
      </span>
    </a>
  );
}
