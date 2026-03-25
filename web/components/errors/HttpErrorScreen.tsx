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
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="relative flex-1">
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.2)_0%,transparent_50%),radial-gradient(circle_at_80%_80%,rgba(37,99,235,0.15)_0%,transparent_50%)]" />
        </div>
        <div className="mx-auto flex max-w-6xl flex-1 flex-col items-center justify-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="w-full max-w-lg rounded-3xl border border-black/8 bg-white/80 p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] sm:p-12">
            <p className="mb-6 inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400">
              {badge}
            </p>
            <div className="mb-4 text-6xl font-black tracking-tight sm:text-7xl">
              <span
                className="bg-linear-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent"
                aria-hidden
              >
                {code}
              </span>
            </div>
            <h1 className="mb-3 text-2xl font-bold text-black dark:text-white sm:text-3xl">
              {title}
            </h1>
            <p className="mb-8 text-base leading-relaxed text-black/70 dark:text-white/70">
              {description}
            </p>
            {actions ? (
              <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                {actions}
              </div>
            ) : null}
            <Link
              href="/"
              className="inline-block font-medium text-blue-500 underline hover:opacity-90 hover:underline-offset-4"
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
