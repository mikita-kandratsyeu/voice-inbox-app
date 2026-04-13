import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';
import { Link } from '@/lib/i18n';

type Props = {
  code: string;
  badge: string;
  title: string;
  description: string;
  homeLabel: string;
  actions?: React.ReactNode;
};

export function HttpErrorScreen({
  code,
  badge,
  title,
  description,
  homeLabel,
  actions,
}: Props): React.ReactElement {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[#f8fafc] text-black dark:bg-[#07080b] dark:text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-120 bg-[radial-gradient(circle_at_10%_0%,rgba(148,163,184,0.2),transparent_55%),radial-gradient(circle_at_90%_12%,rgba(59,130,246,0.12),transparent_45%)] dark:bg-[radial-gradient(circle_at_10%_0%,rgba(59,130,246,0.2),transparent_55%),radial-gradient(circle_at_90%_12%,rgba(99,102,241,0.2),transparent_45%)]"
        aria-hidden
      />
      <Header />
      <main className="flex-1">
        <div className="mx-auto flex max-w-6xl flex-1 flex-col items-center justify-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="w-full max-w-xl rounded-4xl border border-black/10 bg-white/85 p-8 text-center shadow-[0_16px_44px_rgba(15,23,42,0.1)] backdrop-blur-sm dark:border-white/12 dark:bg-white/6 dark:shadow-[0_22px_56px_rgba(0,0,0,0.35)] sm:p-12">
            <p className="mb-6 inline-flex items-center rounded-full border border-blue-500/25 bg-blue-500/10 px-4 py-1.5 text-sm font-medium tracking-wide text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/14 dark:text-blue-300">
              {badge}
            </p>
            <div className="mb-4 text-6xl font-semibold tracking-tight sm:text-7xl">
              <span
                className="bg-linear-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent"
                aria-hidden
              >
                {code}
              </span>
            </div>
            <h1 className="mb-3 text-2xl font-semibold tracking-tight text-black dark:text-white sm:text-3xl">
              {title}
            </h1>
            <p className="mb-8 text-base leading-relaxed text-black/72 dark:text-white/72">
              {description}
            </p>
            {actions ? (
              <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                {actions}
              </div>
            ) : null}
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center rounded-xl border border-black/12 bg-black/4 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-black/8 dark:border-white/15 dark:bg-white/6 dark:text-white dark:hover:bg-white/10"
            >
              {homeLabel}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
