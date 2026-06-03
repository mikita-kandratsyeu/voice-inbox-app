import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { marketingContentClass, marketingGutterClass } from '@/components/landing/marketing-layout';
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll';
import { Link } from '@/lib/i18n';

const FAQ_ITEMS = [
  'offline',
  'privacy',
  'privateMode',
  'languages',
  'pricing',
  'backupViewer',
] as const;

export function FAQSection(): React.ReactElement {
  const t = useTranslations('faq');

  return (
    <section className={`py-15 sm:py-20 ${marketingGutterClass}`}>
      <div className={marketingContentClass}>
        <div className="mx-auto max-w-4xl">
          <AnimateOnScroll>
            <div className="mb-10 text-center sm:mb-12">
              <h2 className="mb-3 text-3xl font-semibold tracking-tight text-black sm:text-4xl dark:text-white">
                {t('title')}
              </h2>
              <p className="text-base text-black/60 sm:text-lg dark:text-white/60">
                {t('subtitle')}
              </p>
            </div>
          </AnimateOnScroll>

          <div className="space-y-3 sm:space-y-4">
            {FAQ_ITEMS.map((key, index) => (
              <AnimateOnScroll key={key} delay={index * 70}>
                <details
                  className="group rounded-2xl border border-black/10 bg-white/85 shadow-[0_8px_26px_rgba(15,23,42,0.05)] backdrop-blur-sm transition-all duration-300 hover:shadow-[0_14px_34px_rgba(15,23,42,0.09)] dark:border-white/12 dark:bg-white/5 dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_16px_38px_rgba(0,0,0,0.36)]"
                  open={index === 0}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5">
                    <span className="text-base font-semibold tracking-tight text-black sm:text-lg dark:text-white">
                      {t(`${key}.question`)}
                    </span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-black/3 text-black/55 transition-all duration-200 group-open:rotate-45 group-open:bg-blue-500/10 group-open:text-blue-600 dark:border-white/12 dark:bg-white/5 dark:text-white/60 dark:group-open:bg-blue-500/20 dark:group-open:text-blue-300">
                      <Plus className="h-4.5 w-4.5" strokeWidth={2.4} aria-hidden />
                    </span>
                  </summary>
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                    <p className="text-sm leading-relaxed text-black/70 sm:text-base dark:text-white/70">
                      {key === 'backupViewer'
                        ? t.rich(`${key}.answer`, {
                            link: (chunks) => (
                              <Link
                                href="/viewer"
                                className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-500 dark:text-blue-400"
                              >
                                {chunks}
                              </Link>
                            ),
                          })
                        : t(`${key}.answer`)}
                    </p>
                  </div>
                </details>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
