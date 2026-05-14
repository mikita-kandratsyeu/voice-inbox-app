import type { ReactNode } from 'react';
import { AlertCircle, CalendarClock, Crown, KeyRound, ShieldCheck, Store } from 'lucide-react';

import type { ProActivationKind } from '@/lib/pro-entitlement';

export type { ProActivationKind };

export type AccountProSuccessCopy = {
  planLabel: string;
  title: string;
  activationType: string;
  typeLicense: string;
  typeStore: string;
  status: string;
  statusActive: string;
  renewsOrExpires: string;
  validThrough: string;
  lifetimeValue: string;
  footerNote: string;
};

export type ProAccountAlertTone = 'neutral' | 'caution' | 'danger' | 'warning';

const ALERT_TONE: Record<ProAccountAlertTone, { wrap: string; title: string; iconWrap: string }> = {
  neutral: {
    wrap: 'border-slate-400/25 bg-slate-500/[0.08]',
    title: 'text-slate-800 dark:text-slate-200',
    iconWrap: 'text-slate-600 dark:text-slate-300',
  },
  caution: {
    wrap: 'border-amber-500/25 bg-amber-500/10',
    title: 'text-amber-800 dark:text-amber-200',
    iconWrap: 'text-amber-700 dark:text-amber-300',
  },
  danger: {
    wrap: 'border-rose-500/25 bg-rose-500/[0.09]',
    title: 'text-rose-900 dark:text-rose-100',
    iconWrap: 'text-rose-700 dark:text-rose-300',
  },
  warning: {
    wrap: 'border-orange-500/25 bg-orange-500/[0.09]',
    title: 'text-orange-900 dark:text-orange-100',
    iconWrap: 'text-orange-700 dark:text-orange-300',
  },
};

export function ProAccountBackground(): ReactNode {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_12%_0%,rgba(148,163,184,0.22),transparent_52%),radial-gradient(circle_at_88%_8%,rgba(59,130,246,0.14),transparent_42%),radial-gradient(circle_at_50%_100%,rgba(99,102,241,0.08),transparent_55%)] dark:bg-[radial-gradient(circle_at_12%_0%,rgba(59,130,246,0.22),transparent_52%),radial-gradient(circle_at_88%_8%,rgba(129,140,248,0.18),transparent_45%),radial-gradient(circle_at_50%_100%,rgba(30,41,59,0.5),transparent_50%)]"
      aria-hidden
    />
  );
}

export function ProAccountPageRoot({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[#f4f7fb] text-black dark:bg-[#07080b] dark:text-white">
      <ProAccountBackground />
      {children}
    </div>
  );
}

export function ProAccountMain({ children }: { children: ReactNode }): ReactNode {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-16 lg:max-w-xl lg:px-8 lg:py-20">
        {children}
      </div>
    </main>
  );
}

export function ProAccountCard({ children }: { children: ReactNode }): ReactNode {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-black/[0.09] bg-white/90 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.04] backdrop-blur-md dark:border-white/[0.1] dark:bg-[rgba(255,255,255,0.05)] dark:shadow-[0_24px_60px_-8px_rgba(0,0,0,0.45)] dark:ring-white/[0.06]">
      <div className="p-6 sm:p-9">
        <div className="relative">
          <div
            className="pointer-events-none absolute -left-6 -top-6 h-32 w-32 rounded-full bg-blue-500/[0.07] blur-2xl dark:bg-blue-400/[0.08]"
            aria-hidden
          />
          <div className="relative">{children}</div>
        </div>
      </div>
    </article>
  );
}

export function ProAccountAlert({
  title,
  description,
  tone,
}: {
  title: string;
  description: string;
  tone: ProAccountAlertTone;
}): ReactNode {
  const s = ALERT_TONE[tone];

  return (
    <div className={`rounded-2xl border p-5 sm:p-6 ${s.wrap}`}>
      <div className={`mb-2 flex items-start gap-3 ${s.title}`}>
        <span className={`mt-0.5 shrink-0 ${s.iconWrap}`}>
          <AlertCircle className="h-5 w-5" aria-hidden />
        </span>
        <p className="text-base font-semibold leading-snug">{title}</p>
      </div>
      <p className="pl-8 text-sm leading-relaxed text-black/72 dark:text-white/72">{description}</p>
    </div>
  );
}

export function ProAccountSuccess({
  copy,
  kind,
  isLifetime,
  dateLabel,
}: {
  copy: AccountProSuccessCopy;
  kind: ProActivationKind;
  isLifetime: boolean;
  dateLabel: string | null;
}): ReactNode {
  const activationLabel = kind === 'license' ? copy.typeLicense : copy.typeStore;
  const dateHeading = isLifetime ? copy.validThrough : copy.renewsOrExpires;
  const dateValue = isLifetime ? copy.lifetimeValue : (dateLabel ?? '—');

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/22 bg-gradient-to-r from-blue-500/12 to-indigo-500/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-blue-800 shadow-sm shadow-blue-500/10 dark:border-blue-400/28 dark:from-blue-500/16 dark:to-indigo-500/12 dark:text-blue-200">
          <Crown className="h-3.5 w-3.5" aria-hidden />
          {copy.planLabel}
        </span>
        <div className="space-y-2">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-black dark:text-white sm:text-[2rem] sm:leading-tight">
            {copy.title}
          </h1>
          <p className="max-w-prose text-sm leading-relaxed text-black/60 dark:text-white/58">
            {copy.footerNote}
          </p>
        </div>
      </header>

      <section aria-label={copy.status}>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <li className="flex flex-col rounded-2xl border border-black/[0.07] bg-white/70 p-4 dark:border-white/[0.09] dark:bg-white/[0.04]">
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-black/45 dark:text-white/45">
              {copy.activationType}
            </span>
            <span className="mt-3 flex items-center gap-2 text-sm font-medium text-black dark:text-white">
              <span
                className="flex h-5 w-4 shrink-0 items-center justify-center text-blue-600 dark:text-blue-400"
                aria-hidden
              >
                {kind === 'license' ? (
                  <KeyRound className="h-4 w-4" aria-hidden />
                ) : (
                  <Store className="h-4 w-4" aria-hidden />
                )}
              </span>
              <span className="min-w-0 leading-snug">{activationLabel}</span>
            </span>
          </li>
          <li className="flex flex-col rounded-2xl border border-black/[0.07] bg-white/70 p-4 dark:border-white/[0.09] dark:bg-white/[0.04]">
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-black/45 dark:text-white/45">
              {copy.status}
            </span>
            <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-500/28 bg-emerald-500/[0.11] px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              {copy.statusActive}
            </span>
          </li>
          <li className="flex flex-col rounded-2xl border border-black/[0.07] bg-white/70 p-4 dark:border-white/[0.09] dark:bg-white/[0.04] sm:col-span-1">
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-black/45 dark:text-white/45">
              {dateHeading}
            </span>
            <span className="mt-3 flex items-center gap-2 text-sm font-medium leading-snug text-black dark:text-white">
              <span
                className="flex h-5 w-4 shrink-0 items-center justify-center text-violet-600 dark:text-violet-400"
                aria-hidden
              >
                <CalendarClock className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">{dateValue}</span>
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
