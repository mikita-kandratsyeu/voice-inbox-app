import { ShieldCheck, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { StoreButtons } from './StoreButtons';

export function Hero(): React.ReactElement {
  const t = useTranslations('hero');

  return (
    <section className="relative overflow-hidden px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-20 md:pt-20 md:pb-24 lg:px-8">
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.18)_0%,transparent_52%),radial-gradient(circle_at_20%_75%,rgba(59,130,246,0.12)_0%,transparent_40%)]"
        aria-hidden
      />
      <div
        className="animate-gradient-pulse absolute inset-x-0 -top-24 -z-10 mx-auto h-80 w-80 rounded-full bg-blue-500/22 blur-3xl"
        aria-hidden
      />
      <div
        className="animate-bg-drift absolute -bottom-24 right-8 -z-10 h-64 w-64 rounded-full bg-indigo-500/16 blur-3xl"
        aria-hidden
      />
      <div className="mx-auto max-w-6xl text-center">
        <div className="mx-auto max-w-4xl">
          <div className="animate-fade-in mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-blue-700 dark:border-blue-400/25 dark:bg-blue-500/12 dark:text-blue-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t('inDevelopment')}
          </div>

          <h1 className="animate-fade-in mb-5 text-balance text-4xl leading-[1.02] font-semibold tracking-tight text-black sm:text-5xl md:text-6xl dark:text-white">
            {t('headline1')}
            <span className="bg-linear-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
              {t('headline2')}
            </span>
          </h1>

          <p className="animate-fade-in-delay-1 mx-auto mb-8 max-w-2xl text-pretty text-base leading-relaxed text-black/65 sm:text-lg dark:text-white/65">
            {t('subtitle')}
          </p>

          <div className="animate-fade-in-delay-2 mb-2 flex justify-center">
            <StoreButtons />
          </div>

          <p className="animate-fade-in-delay-2 mb-8 inline-flex items-center gap-1.5 text-xs text-black/50 dark:text-white/50">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            {t('privateByDefault')}
          </p>

          <div className="animate-fade-in-delay-3 mx-auto grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <article className="rounded-[1.6rem] border border-black/10 bg-linear-to-b from-white/90 to-slate-100/75 p-6 text-left shadow-[0_8px_26px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-white/12 dark:from-white/8 dark:to-white/4 dark:shadow-[0_14px_36px_rgba(0,0,0,0.34)]">
              <div className="mb-5 inline-flex h-8 items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 text-xs font-medium tracking-wide text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/14 dark:text-blue-300">
                {t('stats.accuracy.label')}
              </div>
              <div className="text-balance text-4xl leading-[0.95] font-semibold tracking-tight sm:text-[2.55rem]">
                <span className="bg-linear-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                  {t('stats.accuracy.value')}
                </span>
              </div>
            </article>

            <article className="rounded-[1.6rem] border border-black/10 bg-linear-to-b from-white/90 to-slate-100/75 p-6 text-left shadow-[0_8px_26px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-white/12 dark:from-white/8 dark:to-white/4 dark:shadow-[0_14px_36px_rgba(0,0,0,0.34)]">
              <div className="mb-5 inline-flex h-8 items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 text-xs font-medium tracking-wide text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/14 dark:text-blue-300">
                {t('stats.private.label')}
              </div>
              <div className="text-balance text-4xl leading-[0.95] font-semibold tracking-tight sm:text-[2.55rem]">
                <span className="bg-linear-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                  {t('stats.private.value')}
                </span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
