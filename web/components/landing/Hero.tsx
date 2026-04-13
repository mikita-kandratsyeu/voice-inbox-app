import { CheckCircle2, Sparkles, Workflow } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export function Hero(): React.ReactElement {
  const t = useTranslations('hero');

  return (
    <section className="relative overflow-hidden px-4 pt-10 pb-8 sm:px-6 sm:pt-12 sm:pb-10 md:pt-24 md:pb-11 lg:px-8">
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_5%,rgba(99,102,241,0.2)_0%,transparent_45%),radial-gradient(circle_at_85%_0%,rgba(59,130,246,0.16)_0%,transparent_50%)]"
        aria-hidden
      />
      <div className="mx-auto grid max-w-6xl gap-8 lg:min-h-[480px] lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-start lg:gap-6 xl:gap-8">
        <div className="max-w-[540px]">
          <div className="animate-fade-in mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-blue-700 dark:border-blue-400/25 dark:bg-blue-500/14 dark:text-blue-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t('eyebrow')}
          </div>
          <h1 className="animate-fade-in mb-5 text-balance text-4xl leading-[1.03] font-semibold tracking-tight text-black sm:text-5xl md:text-[2.8rem] xl:text-[3.05rem] dark:text-white">
            {t('headline')}
          </h1>
          <p className="animate-fade-in-delay-1 mb-7 max-w-lg text-pretty text-base leading-relaxed text-black/68 sm:text-lg dark:text-white/68">
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
        <div className="animate-fade-in-delay-2 relative mx-auto w-full max-w-[350px] lg:justify-self-center">
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
              sizes="(max-width: 1024px) 86vw, 350px"
              priority
              className="h-auto w-full object-contain drop-shadow-[0_18px_24px_rgba(15,23,42,0.08)] dark:drop-shadow-[0_32px_48px_rgba(0,0,0,0.52)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
