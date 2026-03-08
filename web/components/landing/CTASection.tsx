import { useTranslations } from 'next-intl';
import { StoreButtons } from './StoreButtons';

export function CTASection(): React.ReactElement {
  const t = useTranslations('cta');

  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-linear-to-br from-purple-500 to-pink-500 p-12 text-center shadow-[0_20px_60px_rgba(168,85,247,0.4)] sm:p-16">
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
      </div>
    </section>
  );
}
