import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';
import { SharedNoteMarkdown } from '@/components/share/SharedNoteMarkdown';
import { Link } from '@/lib/i18n';

type SharedNoteArticleProps = {
  title: string;
  markdown: string;
  publishedOn: string;
  expiresOn?: string | null;
  visibilityHint: string;
  backHomeLabel: string;
};

export function SharedNoteArticle({
  title,
  markdown,
  publishedOn,
  expiresOn,
  visibilityHint,
  backHomeLabel,
}: SharedNoteArticleProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[#f8fafc] text-black dark:bg-[#07080b] dark:text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-120 bg-[radial-gradient(circle_at_10%_0%,rgba(148,163,184,0.2),transparent_55%),radial-gradient(circle_at_90%_12%,rgba(59,130,246,0.12),transparent_45%)] dark:bg-[radial-gradient(circle_at_10%_0%,rgba(59,130,246,0.2),transparent_55%),radial-gradient(circle_at_90%_12%,rgba(99,102,241,0.2),transparent_45%)]"
        aria-hidden
      />
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="rounded-3xl border border-black/10 bg-white/85 p-8 shadow-[0_10px_36px_rgba(15,23,42,0.08)] dark:border-white/12 dark:bg-white/5 dark:shadow-[0_14px_44px_rgba(0,0,0,0.34)] sm:p-12">
            <header className="mb-8 border-b border-black/8 pb-6 dark:border-white/10">
              <span className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-400/25 dark:bg-blue-500/14 dark:text-blue-300">
                {visibilityHint}
              </span>

              <h1 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                {title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                <span>{publishedOn}</span>
                {expiresOn ? (
                  <>
                    <span className="text-slate-300 dark:text-slate-600" aria-hidden>
                      ·
                    </span>
                    <span>{expiresOn}</span>
                  </>
                ) : null}
              </div>
            </header>

            <SharedNoteMarkdown markdown={markdown} />

            <Link
              href="/"
              className="mt-10 inline-flex rounded-lg px-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-500 dark:text-blue-400"
            >
              {backHomeLabel}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
