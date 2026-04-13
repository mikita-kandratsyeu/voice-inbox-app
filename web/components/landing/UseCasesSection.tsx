import { Briefcase, GraduationCap, ListTodo } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll';

const USE_CASES = [
  { id: 'founders', icon: Briefcase },
  { id: 'students', icon: GraduationCap },
  { id: 'busy', icon: ListTodo },
] as const;

export function UseCasesSection(): React.ReactElement {
  const t = useTranslations('useCases');

  return (
    <section className="px-4 py-15 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AnimateOnScroll>
          <div className="mb-8 text-center sm:mb-10">
            <h2 className="mb-3 text-3xl font-semibold tracking-tight text-black sm:text-4xl dark:text-white">
              {t('title')}
            </h2>
            <p className="mx-auto max-w-2xl text-base text-black/62 dark:text-white/62">
              {t('subtitle')}
            </p>
          </div>
        </AnimateOnScroll>

        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {USE_CASES.map(({ id, icon: Icon }, index) => (
            <AnimateOnScroll key={id} delay={index * 80}>
              <article className="h-full rounded-3xl border border-black/10 bg-white/82 p-6 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(15,23,42,0.11)] dark:border-white/12 dark:bg-white/5 dark:shadow-[0_14px_40px_rgba(0,0,0,0.32)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.38)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/16 dark:text-blue-300">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mb-2 text-xl font-semibold tracking-tight text-black dark:text-white">
                  {t(`${id}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-black/72 sm:text-base dark:text-white/72">
                  {t(`${id}.description`)}
                </p>
              </article>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
