import { CheckCircle2, Sparkles, Workflow } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export function Hero(): React.ReactElement {
  const t = useTranslations('hero');

  return (
    <section className="relative overflow-hidden px-3 pt-9 pb-7 sm:px-6 sm:pt-12 sm:pb-10 md:pt-24 md:pb-11 lg:px-8">
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_5%,rgba(99,102,241,0.2)_0%,transparent_45%),radial-gradient(circle_at_85%_0%,rgba(59,130,246,0.16)_0%,transparent_50%)]"
        aria-hidden
      />
      <div className="mx-auto grid max-w-6xl gap-6 sm:gap-8 md:min-h-[400px] md:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] md:items-start md:gap-6 lg:min-h-[480px] lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:gap-6 xl:gap-8">
        <div className="min-w-0 max-w-[540px] md:max-w-none lg:max-w-[540px]">
          <div className="animate-fade-in mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-[11px] font-medium tracking-wide text-blue-700 sm:mb-5 sm:px-3.5 sm:text-xs dark:border-blue-400/25 dark:bg-blue-500/14 dark:text-blue-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t('eyebrow')}
          </div>
          <h1 className="animate-fade-in mb-4 text-balance text-[1.65rem] leading-[1.08] font-semibold tracking-tight text-black min-[340px]:text-[1.75rem] min-[400px]:text-4xl sm:mb-5 sm:text-5xl sm:leading-[1.03] md:text-[2.8rem] xl:text-[3.05rem] dark:text-white">
            {t('headline')}
          </h1>
          <p className="animate-fade-in-delay-1 mb-6 max-w-lg text-pretty text-[0.9375rem] leading-relaxed text-black/68 sm:mb-7 sm:text-lg md:max-w-none lg:max-w-lg dark:text-white/68">
            {t('subtitle')}
          </p>
          <ul className="animate-fade-in-delay-2 mb-7 space-y-2.5 sm:mb-8 sm:space-y-3">
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
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-black px-6 py-3 text-base font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.28)] ring-1 ring-black/8 transition-all duration-250 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.32)] dark:bg-white dark:text-black dark:ring-white/15"
            >
              {t('downloadApp')}
            </a>
            <a
              href="#how-it-works"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-black/12 bg-white/88 px-6 py-3 text-base font-medium text-black transition-all duration-250 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_26px_rgba(15,23,42,0.08)] dark:border-white/15 dark:bg-white/7 dark:text-white dark:hover:bg-white/10 dark:hover:shadow-[0_16px_30px_rgba(0,0,0,0.28)]"
            >
              <Workflow className="h-4 w-4 shrink-0" aria-hidden strokeWidth={2.25} />
              {t('howItWorks')}
            </a>
          </div>
        </div>
        <div className="animate-fade-in-delay-2 relative mx-auto w-full max-w-[min(100%,18rem)] min-[360px]:max-w-82 sm:max-w-[350px] md:mx-0 md:max-w-full md:justify-self-center lg:justify-self-center">
          <div
            className="pointer-events-none absolute inset-x-10 bottom-2 hidden h-12 rounded-full bg-black/45 blur-2xl dark:block"
            aria-hidden
          />
          <div className="relative animate-card-float transition-transform duration-300 lg:hover:scale-[1.015]">
            <Image
              src="/hero-note-screen.png"
              alt="Voice Inbox AI note screen"
              width={470}
              height={831}
              sizes="(max-width: 360px) 72vw, (max-width: 640px) 80vw, (max-width: 767px) 86vw, (max-width: 1024px) 32vw, 350px"
              priority
              className="h-auto w-full object-contain drop-shadow-[0_18px_24px_rgba(15,23,42,0.08)] dark:drop-shadow-[0_32px_48px_rgba(0,0,0,0.52)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
