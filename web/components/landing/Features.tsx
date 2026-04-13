import { Brain, CheckSquare, Lightbulb, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll';

const FEATURES = [
  { id: 'record', icon: Lightbulb },
  { id: 'transcribe', icon: Brain },
  { id: 'ai', icon: CheckSquare },
  { id: 'ready', icon: Search },
] as const;

export function Features(): React.ReactElement {
  const t = useTranslations();

  return (
    <section className="px-4 py-14 sm:px-6 sm:py-18 md:px-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AnimateOnScroll>
          <div className="mb-10 text-center sm:mb-12">
            <h2 className="mb-3 text-3xl font-semibold tracking-tight text-black sm:text-4xl dark:text-white">
              {t('features.title')}
            </h2>
            <p className="mx-auto max-w-2xl text-base text-black/62 sm:text-lg dark:text-white/62">
              {t('features.subtitle')}
            </p>
          </div>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {FEATURES.map(({ id, icon: Icon }, index) => (
            <AnimateOnScroll key={id} delay={index * 80} className="h-full">
              <div className="group flex h-full min-h-[230px] flex-col rounded-3xl border border-black/10 bg-white/80 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(15,23,42,0.1)] dark:border-white/12 dark:bg-white/5 dark:shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg transition-transform duration-200 group-hover:scale-105">
                  <Icon className="h-5 w-5 text-white" aria-hidden />
                </div>
                <h3 className="mb-2 text-xl font-semibold tracking-tight text-black dark:text-white">
                  {t(`features.${id}.title`)}
                </h3>
                <p className="flex-1 text-sm leading-relaxed text-black/70 sm:text-base dark:text-white/70">
                  {t(`features.${id}.description`)}
                </p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
