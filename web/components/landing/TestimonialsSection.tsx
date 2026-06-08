import { Star } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { marketingContentClass, marketingGutterClass } from '@/components/landing/marketing-layout';
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll';
import { APP_STORE_URL } from '@/config/constants';
import type { LandingSocialProofConfig } from '@/lib/landing-social-proof-defaults';

type TestimonialsSectionProps = {
  config: LandingSocialProofConfig;
};

export function TestimonialsSection({
  config,
}: TestimonialsSectionProps): React.ReactElement | null {
  const locale = useLocale();
  const t = useTranslations('testimonials');

  if (!config.testimonialsEnabled || config.testimonials.length === 0) {
    return null;
  }

  const columnClass =
    config.testimonials.length === 1
      ? 'mx-auto max-w-xl'
      : config.testimonials.length === 2
        ? 'grid gap-4 md:grid-cols-2 md:gap-5'
        : 'grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-5';

  return (
    <section className={`py-15 sm:py-20 ${marketingGutterClass}`}>
      <div className={marketingContentClass}>
        <AnimateOnScroll>
          <div className="mb-8 text-center sm:mb-10">
            <h2 className="mb-3 text-3xl font-semibold tracking-tight text-black sm:text-4xl dark:text-white">
              {t('title')}
            </h2>
            <p className="mx-auto max-w-2xl text-base text-black/62 sm:text-lg dark:text-white/62">
              {t('subtitle')}
            </p>
          </div>
        </AnimateOnScroll>

        <div className={columnClass}>
          {config.testimonials.map((item, index) => {
            const quote = locale === 'ru' ? item.quoteRu : item.quoteEn;
            const source = locale === 'ru' ? item.sourceRu : item.sourceEn;

            return (
              <AnimateOnScroll key={`${quote}-${index}`} delay={index * 80}>
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-full flex-col rounded-3xl border border-black/10 bg-white/82 p-6 shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-black/14 hover:shadow-[0_16px_38px_rgba(15,23,42,0.11)] dark:border-white/12 dark:bg-white/5 dark:shadow-[0_14px_40px_rgba(0,0,0,0.32)] dark:hover:border-white/16 dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.38)]"
                >
                  <div className="mb-4 flex items-center gap-0.5" aria-hidden>
                    {Array.from({ length: 5 }, (_, starIndex) => (
                      <Star
                        key={starIndex}
                        className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                        strokeWidth={1.75}
                      />
                    ))}
                  </div>
                  <blockquote className="flex flex-1 flex-col">
                    <p className="text-base leading-relaxed text-black/78 transition-colors group-hover:text-black dark:text-white/78 dark:group-hover:text-white">
                      <span className="text-black/25 dark:text-white/25" aria-hidden>
                        &ldquo;
                      </span>
                      {quote}
                      <span className="text-black/25 dark:text-white/25" aria-hidden>
                        &rdquo;
                      </span>
                    </p>
                    <footer className="mt-4 text-sm text-black/45 dark:text-white/45">
                      {source}
                    </footer>
                  </blockquote>
                </a>
              </AnimateOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
