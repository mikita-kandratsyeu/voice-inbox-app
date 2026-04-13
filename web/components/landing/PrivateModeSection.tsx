import { Lock, ShieldCheck, Smartphone, WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll';

const ITEMS = [
  { key: 'item1', icon: Smartphone },
  { key: 'item2', icon: Lock },
  { key: 'item3', icon: ShieldCheck },
  { key: 'item4', icon: WifiOff },
] as const;

export function PrivateModeSection(): React.ReactElement {
  const t = useTranslations('privateMode');

  return (
    <section className="px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AnimateOnScroll>
          <div className="relative overflow-hidden rounded-4xl border border-white/12 bg-slate-950 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.4)] sm:p-10">
            <div
              className="pointer-events-none absolute -top-20 right-8 h-60 w-60 rounded-full bg-blue-500/20 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-24 left-2 h-60 w-60 rounded-full bg-indigo-500/20 blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <h2 className="mb-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">{t('title')}</h2>
              <p className="mb-7 max-w-2xl text-sm leading-relaxed text-white/74 sm:text-base">{t('subtitle')}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {ITEMS.map(({ key, icon: Icon }) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/6 p-4 text-sm font-medium text-white sm:text-base"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-200">
                      <Icon className="h-4.5 w-4.5" aria-hidden />
                    </div>
                    {t(key)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
