import { useTranslations } from 'next-intl';
import { StoreButtons } from '@/components/landing/StoreButtons';

export function Hero(): React.ReactElement {
  const t = useTranslations('hero');

  return (
    <section className="relative overflow-hidden px-4 pt-16 pb-24 sm:px-6 sm:pt-24 sm:pb-32 lg:px-8">
      <div
        className="absolute inset-0 -z-10 animate-gradient-pulse bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.25)_0%,transparent_50%),radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.25)_0%,transparent_50%)] opacity-100"
        aria-hidden
      />
      <div className="mx-auto max-w-7xl text-center">
        <div className="mx-auto max-w-5xl">
          <h1 className="mb-6 text-5xl font-black leading-tight sm:text-6xl lg:text-8xl">
            {t('headline1')}
            <br />
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              {t('headline2')}
            </span>
          </h1>

          <p className="mx-auto mb-12 max-w-3xl text-lg leading-relaxed text-black/70 dark:text-white/70 sm:text-xl lg:text-2xl">
            {t('subtitle')}
          </p>

          <div className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <StoreButtons variant="hero" />
          </div>

          <div className="mx-auto grid max-w-2xl grid-cols-2 gap-8">
            <div className="text-center">
              <div className="mb-1 text-3xl font-black sm:text-4xl">
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                  {t('stats.accuracy.value')}
                </span>
              </div>
              <div className="text-sm text-black/60 dark:text-white/60">
                {t('stats.accuracy.label')}
              </div>
            </div>
            <div className="text-center">
              <div className="mb-1 text-3xl font-black sm:text-4xl">
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                  {t('stats.private.value')}
                </span>
              </div>
              <div className="text-sm text-black/60 dark:text-white/60">
                {t('stats.private.label')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
