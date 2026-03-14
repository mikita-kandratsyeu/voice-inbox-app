import { Lock, Mic, Sparkles, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll';

const FEATURES = [
  { id: 'record', icon: Mic },
  { id: 'transcribe', icon: Lock },
  { id: 'ai', icon: Sparkles },
  { id: 'ready', icon: Zap },
] as const;

export function Features(): React.ReactElement {
  const t = useTranslations();

  return (
    <section className="px-4 py-24 sm:px-6 md:px-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AnimateOnScroll>
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-black text-black dark:text-white sm:text-5xl md:text-5xl">
              {t('features.title')}
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-black/60 dark:text-white/60">
              {t('features.subtitle')}
            </p>
          </div>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 gap-6 sm:min-h-[560px] sm:grid-cols-2 sm:grid-rows-[1fr_1fr] md:gap-8 lg:grid-cols-4 lg:grid-rows-1">
          {FEATURES.map(({ id, icon: Icon }, index) => (
            <AnimateOnScroll key={id} delay={index * 80} className="h-full">
              <div className="group flex min-h-[280px] flex-col cursor-pointer rounded-3xl border border-black/8 bg-white/80 p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-200 hover:scale-[1.02] hover:shadow-xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] lg:min-h-[340px] lg:p-6">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg transition-transform duration-200 group-hover:scale-105">
                  <Icon className="h-7 w-7 text-white" aria-hidden />
                </div>
                <h3 className="mb-3 text-2xl font-bold text-black dark:text-white">
                  {t(`features.${id}.title`)}
                </h3>
                <p className="flex-1 leading-relaxed text-black/70 dark:text-white/70">
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
