import { useTranslations } from 'next-intl';
import { marketingContentClass, marketingGutterClass } from '@/components/landing/marketing-layout';
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll';
import { CtaAndroidWaitlist } from './CtaAndroidWaitlist';
import { CtaStoreQr } from './CtaStoreQr';
import { StoreButtons } from './StoreButtons';

export function CTASection(): React.ReactElement {
  const t = useTranslations('cta');

  return (
    <section
      className={`scroll-mt-24 pt-15 pb-4 sm:scroll-mt-28 sm:py-20 ${marketingGutterClass}`}
      id="download"
    >
      <div className={marketingContentClass}>
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
              <p className="mx-auto mb-6 max-w-2xl text-base text-white/85 sm:mb-7 sm:text-lg">
                {t('subtitle')}
              </p>
              <div className="flex justify-center">
                <div className="flex w-fit max-w-full flex-col items-center md:flex-row md:items-center md:gap-7 lg:gap-8">
                  <div className="flex w-fit flex-col items-center">
                    <StoreButtons />
                    <CtaAndroidWaitlist />
                  </div>
                  <CtaStoreQr />
                </div>
              </div>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
