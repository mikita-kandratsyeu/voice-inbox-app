import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll';

const STEPS = [{ id: 'step1' }, { id: 'step2' }, { id: 'step3' }] as const;

export function HowItWorks(): React.ReactElement {
  const t = useTranslations();

  return (
    <section className="px-4 py-24 sm:px-6 md:px-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AnimateOnScroll>
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-black text-black dark:text-white sm:text-5xl md:text-5xl">
              {t('howItWorks.title')}
            </h2>
            <p className="text-lg text-black/60 dark:text-white/60">{t('howItWorks.subtitle')}</p>
          </div>
        </AnimateOnScroll>

        <div className="flex flex-col items-center justify-center gap-12 md:flex-row">
          {STEPS.map(({ id }, index) => (
            <AnimateOnScroll key={id} delay={index * 100}>
              <div className="flex items-center">
                <div className="text-center">
                  <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-3xl bg-linear-to-br from-blue-500 to-blue-600 shadow-2xl transition-transform duration-200 hover:scale-105">
                    <span className="text-4xl font-black text-white">{index + 1}</span>
                  </div>
                  <h3 className="mb-2 text-2xl font-bold text-black dark:text-white">
                    {t(`howItWorks.${id}.title`)}
                  </h3>
                  <p className="text-black/70 dark:text-white/70">
                    {t(`howItWorks.${id}.description`)}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <ArrowRight className="mx-6 hidden h-10 w-10 opacity-30 md:block" aria-hidden />
                )}
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
