import { useTranslations } from 'next-intl';
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll';
import { StoreButtons } from './StoreButtons';

export function CTASection(): React.ReactElement {
  const t = useTranslations('cta');

  return (
    <section className="scroll-mt-24 px-4 py-24 sm:px-6 sm:scroll-mt-28 lg:px-8" id="download">
      <div className="mx-auto max-w-5xl">
        <AnimateOnScroll>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-linear-to-br from-blue-500 to-blue-600 p-12 text-center shadow-[0_20px_60px_rgba(59,130,246,0.4)] sm:p-16">
            <div
              className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/10 blur-3xl"
              aria-hidden
            />
            <div
              className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white/10 blur-3xl"
              aria-hidden
            />
            <div className="relative z-10">
              <h2 className="mb-4 text-4xl font-black text-white sm:text-5xl">{t('title')}</h2>
              <p className="mx-auto mb-10 max-w-2xl text-xl text-white/90">{t('subtitle')}</p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <StoreButtons variant="cta" />
              </div>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
