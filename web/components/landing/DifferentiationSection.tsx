import { CheckCircle2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll';

const OTHERS = ['others1', 'others2', 'others3', 'others4'] as const;
const OURS = ['ours1', 'ours2', 'ours3', 'ours4'] as const;

export function DifferentiationSection(): React.ReactElement {
  const t = useTranslations('differentiation');

  return (
    <section className="px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AnimateOnScroll>
          <div className="mb-8 text-center sm:mb-11">
            <h2 className="text-3xl font-semibold tracking-tight text-black sm:text-4xl dark:text-white">
              {t('title')}
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          <AnimateOnScroll>
            <article className="h-full rounded-3xl border border-black/10 bg-white/80 p-6 shadow-[0_12px_32px_rgba(15,23,42,0.07)] dark:border-white/12 dark:bg-white/5 dark:shadow-[0_16px_45px_rgba(0,0,0,0.34)]">
              <p className="mb-4 text-sm font-semibold tracking-wide text-black/55 dark:text-white/55">
                {t('othersTitle')}
              </p>
              <ul className="space-y-3">
                {OTHERS.map((key) => (
                  <li
                    key={key}
                    className="flex items-start gap-2.5 text-sm text-black/75 sm:text-base dark:text-white/72"
                  >
                    <XCircle
                      className="mt-0.5 h-4.5 w-4.5 shrink-0 text-black/35 dark:text-white/35"
                      aria-hidden
                    />
                    {t(key)}
                  </li>
                ))}
              </ul>
            </article>
          </AnimateOnScroll>

          <AnimateOnScroll delay={80}>
            <article className="h-full rounded-3xl border border-blue-500/25 bg-linear-to-b from-blue-500/12 to-indigo-500/10 p-6 shadow-[0_16px_40px_rgba(59,130,246,0.15)] dark:border-blue-400/35 dark:from-blue-500/18 dark:to-indigo-500/16 dark:shadow-[0_22px_52px_rgba(30,64,175,0.3)]">
              <p className="mb-4 text-sm font-semibold tracking-wide text-blue-700 dark:text-blue-300">
                {t('oursTitle')}
              </p>
              <ul className="space-y-3">
                {OURS.map((key) => (
                  <li
                    key={key}
                    className="flex items-start gap-2.5 text-sm font-medium text-black sm:text-base dark:text-white"
                  >
                    <CheckCircle2
                      className="mt-0.5 h-4.5 w-4.5 shrink-0 text-blue-600 dark:text-blue-300"
                      aria-hidden
                    />
                    {t(key)}
                  </li>
                ))}
              </ul>
            </article>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}
