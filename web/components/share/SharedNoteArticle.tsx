import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
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
      <header className="mx-auto flex w-full max-w-3xl items-center justify-end px-5 pt-6 sm:px-6">
        <LanguageSwitcher />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-6 sm:py-10">
        <article className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-[0_10px_36px_rgba(15,23,42,0.08)] dark:border-white/12 dark:bg-white/5 dark:shadow-[0_14px_44px_rgba(0,0,0,0.34)] sm:p-8">
          <header className="mb-6 border-b border-black/8 pb-5 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
              {visibilityHint}
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
              {title}
            </h1>
            <p className="mt-3 text-sm text-black/55 dark:text-white/55">{publishedOn}</p>
            {expiresOn ? (
              <p className="mt-1 text-sm text-black/55 dark:text-white/55">{expiresOn}</p>
            ) : null}
          </header>
          <div className="prose prose-gray max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              rehypePlugins={[rehypeSanitize]}
            >
              {markdown}
            </ReactMarkdown>
          </div>
          <Link
            href="/"
            className="mt-10 inline-flex rounded-lg px-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-500 dark:text-blue-400"
          >
            {backHomeLabel}
          </Link>
        </article>
      </main>
    </div>
  );
}
