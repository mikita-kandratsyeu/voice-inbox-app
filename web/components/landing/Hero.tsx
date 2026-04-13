import { CheckCircle2, Play, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function Hero(): React.ReactElement {
  const t = useTranslations('hero');

  return (
    <section className="relative overflow-hidden px-4 pt-10 pb-14 sm:px-6 sm:pt-14 sm:pb-18 md:pt-18 md:pb-22 lg:px-8">
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_5%,rgba(99,102,241,0.2)_0%,transparent_45%),radial-gradient(circle_at_85%_0%,rgba(59,130,246,0.16)_0%,transparent_50%)]"
        aria-hidden
      />
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <div className="animate-fade-in mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-blue-700 dark:border-blue-400/25 dark:bg-blue-500/14 dark:text-blue-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t('eyebrow')}
          </div>
          <h1 className="animate-fade-in mb-5 text-balance text-4xl leading-[1.03] font-semibold tracking-tight text-black sm:text-5xl md:text-[3.45rem] dark:text-white">
            {t('headline')}
          </h1>
          <p className="animate-fade-in-delay-1 mb-7 max-w-2xl text-pretty text-base leading-relaxed text-black/68 sm:text-lg dark:text-white/68">
            {t('subtitle')}
          </p>
          <ul className="animate-fade-in-delay-2 mb-8 space-y-3">
            <li className="flex items-start gap-2.5 text-sm text-black/78 sm:text-base dark:text-white/78">
              <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-blue-500" aria-hidden />
              {t('bullet1')}
            </li>
            <li className="flex items-start gap-2.5 text-sm text-black/78 sm:text-base dark:text-white/78">
              <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-blue-500" aria-hidden />
              {t('bullet2')}
            </li>
            <li className="flex items-start gap-2.5 text-sm text-black/78 sm:text-base dark:text-white/78">
              <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-blue-500" aria-hidden />
              {t('bullet3')}
            </li>
          </ul>
          <div className="animate-fade-in-delay-3 flex flex-col gap-3 sm:flex-row">
            <a
              href="#download"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-black px-6 py-3 text-base font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.28)] transition-transform duration-200 hover:-translate-y-0.5 dark:bg-white dark:text-black"
            >
              {t('downloadApp')}
            </a>
            <a
              href="#how-it-works"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-black/12 bg-white/85 px-6 py-3 text-base font-medium text-black transition-colors hover:bg-white dark:border-white/15 dark:bg-white/7 dark:text-white dark:hover:bg-white/10"
            >
              <Play className="h-4 w-4" aria-hidden />
              {t('watchDemo')}
            </a>
          </div>
        </div>
        <div className="animate-fade-in-delay-2 mx-auto w-full max-w-sm rounded-4xl border border-black/10 bg-white/90 p-4 shadow-[0_24px_65px_rgba(15,23,42,0.18)] backdrop-blur-md dark:border-white/12 dark:bg-[#0f1218]/92 dark:shadow-[0_26px_70px_rgba(0,0,0,0.46)]">
          <div className="rounded-[1.65rem] border border-black/8 bg-linear-to-b from-slate-50 to-slate-100 p-4 dark:border-white/12 dark:from-[#131824] dark:to-[#0d121c]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wide text-black/60 dark:text-white/60">{t('recordingNow')}</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/12 px-2 py-1 text-[0.65rem] font-semibold text-red-600 dark:text-red-300">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                REC
              </span>
            </div>
            <div className="mb-4 rounded-xl border border-blue-500/15 bg-blue-500/8 p-3">
              <div className="flex h-10 items-end gap-1">
                {[22, 14, 33, 20, 31, 16, 28, 18, 30, 15, 26, 19].map((height, index) => (
                  <span
                    key={`${height}-${index}`}
                    className="block w-1.5 rounded-full bg-linear-to-b from-blue-500 to-indigo-500"
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>
            </div>
            <div className="mb-3 rounded-xl border border-black/8 bg-white/70 p-3 dark:border-white/12 dark:bg-white/4">
              <p className="mb-1 text-[0.7rem] font-semibold tracking-wide text-black/55 dark:text-white/50">
                {t('liveTranscript')}
              </p>
              <p className="text-sm leading-relaxed text-black/78 dark:text-white/78">
                Launch note: We should ship the onboarding flow this week and notify beta users.
              </p>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                <p className="mb-1 text-[0.7rem] font-semibold tracking-wide text-emerald-700 dark:text-emerald-300">
                  {t('summaryTitle')}
                </p>
                <p className="text-sm text-black/80 dark:text-white/82">
                  Prioritize onboarding release and user communication in one focused push.
                </p>
              </div>
              <div className="rounded-xl border border-black/8 bg-white/70 p-3 dark:border-white/12 dark:bg-white/4">
                <p className="mb-1 text-[0.7rem] font-semibold tracking-wide text-black/55 dark:text-white/50">
                  {t('taskTitle')}
                </p>
                <ul className="space-y-1.5 text-sm text-black/78 dark:text-white/78">
                  <li>- Finalize onboarding checklist</li>
                  <li>- Schedule beta announcement</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
