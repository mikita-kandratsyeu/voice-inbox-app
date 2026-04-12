import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll';

const BENEFIT_KEYS = ['item0', 'item2', 'item3', 'item4'] as const;

export function Benefits(): React.ReactElement {
  const t = useTranslations('benefits');

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <AnimateOnScroll>
          <div className="rounded-3xl border border-black/10 bg-white/85 p-6 shadow-[0_10px_35px_rgba(15,23,42,0.08)] dark:border-white/12 dark:bg-white/5 dark:shadow-[0_14px_45px_rgba(0,0,0,0.35)] sm:p-10">
            <h2 className="mb-6 text-center text-3xl font-semibold tracking-tight text-black dark:text-white sm:text-4xl">
              {t('title')}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {BENEFIT_KEYS.map((key) => (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-2xl border border-black/8 bg-black/1.5 p-4 transition-colors dark:border-white/10 dark:bg-white/3"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-blue-600">
                    <Check className="h-4 w-4 text-white" strokeWidth={2.7} aria-hidden />
                  </div>
                  <span className="text-sm font-medium text-black sm:text-base dark:text-white">{t(key)}</span>
                </div>
              ))}
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
