import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll';

const BENEFIT_KEYS = ['item0', 'item2', 'item3', 'item4'] as const;

export function Benefits(): React.ReactElement {
  const t = useTranslations('benefits');

  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <AnimateOnScroll>
          <div className="rounded-3xl border border-black/8 bg-white/80 p-12 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <h2 className="mb-8 text-center text-3xl font-black text-black dark:text-white sm:text-4xl">
              {t('title')}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {BENEFIT_KEYS.map((key) => (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-2xl bg-black/2 p-4 transition-colors dark:bg-white/3"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-purple-500 to-pink-500">
                    <Check className="h-4 w-4 text-white" strokeWidth={3} aria-hidden />
                  </div>
                  <span className="font-medium text-black dark:text-white">{t(key)}</span>
                </div>
              ))}
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
