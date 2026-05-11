import { useTranslations } from 'next-intl';
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll';
import { CtaAndroidWaitlist } from './CtaAndroidWaitlist';
import { StoreButtons } from './StoreButtons';

export function CTASection(): React.ReactElement {
  const t = useTranslations('cta');

  return (
    <section
      className="scroll-mt-24 px-4 py-15 sm:scroll-mt-28 sm:px-6 sm:py-20 lg:px-8"
      id="download"
    >
      <div className="mx-auto max-w-5xl">
        <AnimateOnScroll>
          <div className="relative overflow-hidden rounded-[2.2rem] border border-black/10 bg-linear-to-br from-slate-950 via-slate-900 to-blue-950 text-center shadow-[0_26px_80px_rgba(15,23,42,0.38)] dark:border-white/10">
            <div
              className="absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl"
              aria-hidden
            />
            <div
              className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl"
              aria-hidden
            />
            <div className="relative z-10 p-8 text-center sm:p-12">
              <h2 className="mb-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {t('title')}
              </h2>
              <p className="mx-auto mb-4 max-w-2xl text-base text-white/85 sm:text-lg">
                {t('subtitle')}
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <StoreButtons />
              </div>
              <CtaAndroidWaitlist />
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
