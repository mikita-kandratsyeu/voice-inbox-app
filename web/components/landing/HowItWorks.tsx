import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { marketingContentClass, marketingGutterClass } from '@/components/landing/marketing-layout';
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll';

const STEPS = [{ id: 'step1' }, { id: 'step2' }, { id: 'step3' }] as const;

export function HowItWorks(): React.ReactElement {
  const t = useTranslations();

  return (
    <section
      className={`scroll-mt-24 py-15 sm:scroll-mt-28 sm:py-20 ${marketingGutterClass}`}
      id="how-it-works"
    >
      <div className={marketingContentClass}>
        <AnimateOnScroll>
          <div className="mb-10 text-center sm:mb-12">
            <h2 className="mb-3 text-3xl font-semibold tracking-tight text-black sm:text-4xl dark:text-white">
              {t('howItWorks.title')}
            </h2>
            <p className="text-base text-black/62 sm:text-lg dark:text-white/62">
              {t('howItWorks.subtitle')}
            </p>
          </div>
        </AnimateOnScroll>

        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {STEPS.map(({ id }, index) => (
            <AnimateOnScroll key={id} delay={index * 100} className="h-full">
              <div className="relative h-full rounded-3xl border border-black/10 bg-white/82 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(15,23,42,0.1)] dark:border-white/12 dark:bg-white/5 dark:shadow-[0_12px_40px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_18px_46px_rgba(0,0,0,0.36)]">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-500 text-lg font-semibold text-white shadow-[0_8px_20px_rgba(59,130,246,0.35)]">
                  {index + 1}
                </div>
                <h3 className="mb-2 text-xl font-semibold tracking-tight text-black dark:text-white">
                  {t(`howItWorks.${id}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-black/72 sm:text-base dark:text-white/72">
                  {t(`howItWorks.${id}.description`)}
                </p>
                {index < STEPS.length - 1 && (
                  <ArrowRight
                    className="absolute right-4 top-4 hidden h-5 w-5 text-black/25 dark:text-white/25 md:block"
                    aria-hidden
                  />
                )}
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
