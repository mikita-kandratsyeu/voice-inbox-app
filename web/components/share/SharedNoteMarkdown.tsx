'use client';

import { Check } from 'lucide-react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

import { splitShareNoteEmailTableBlocks } from '@/lib/shareNoteEmailMarkdownTables';

const bodyTextClass = 'text-[17px] leading-[1.75] text-slate-700 dark:text-slate-300';
const headingClass = 'font-semibold tracking-tight text-slate-900 dark:text-white';

function ShareNoteTaskCheckbox({ checked }: { checked?: boolean }): React.ReactElement {
  return (
    <span
      role="img"
      aria-label={checked ? 'Completed' : 'Open'}
      className={`col-start-1 row-start-1 mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 ${
        checked
          ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_1px_2px_rgba(16,185,129,0.35)] dark:border-emerald-400 dark:bg-emerald-500'
          : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800/60'
      }`}
    >
      {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
    </span>
  );
}

const shareNoteTableShellClass = 'share-note-table-wrap';

const shareNoteMarkdownComponents: Components = {
  h2: ({ children }) => (
    <h2
      className={`mb-4 mt-12 border-t border-slate-200/80 pt-8 text-[1.375rem] ${headingClass} first:mt-0 first:border-t-0 first:pt-0 dark:border-white/10`}
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => <h3 className={`mb-3 mt-10 text-xl ${headingClass}`}>{children}</h3>,
  h4: ({ children }) => <h4 className={`mb-2 mt-8 text-lg ${headingClass}`}>{children}</h4>,
  p: ({ children }) => <p className={`mb-5 ${bodyTextClass}`}>{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>
  ),
  em: ({ children }) => <em className="text-slate-600 italic dark:text-slate-400">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-blue-600 underline decoration-blue-600/35 underline-offset-[3px] transition-colors hover:text-blue-700 hover:decoration-blue-600/60 dark:text-blue-400 dark:decoration-blue-400/40 dark:hover:text-blue-300"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  ul: ({ className, children }) => {
    const isTaskList = className?.includes('contains-task-list');
    return (
      <ul
        className={
          isTaskList
            ? 'mb-5 list-none space-y-3 pl-0'
            : `mb-5 ml-6 list-disc space-y-2 marker:text-slate-400 dark:marker:text-slate-500 ${bodyTextClass}`
        }
      >
        {children}
      </ul>
    );
  },
  ol: ({ children }) => (
    <ol
      className={`mb-5 ml-6 list-decimal space-y-2 marker:font-medium marker:text-slate-500 dark:marker:text-slate-400 ${bodyTextClass}`}
    >
      {children}
    </ol>
  ),
  li: ({ className, children }) => {
    const isTask = className?.includes('task-list-item');
    if (isTask) {
      return (
        <li
          className={`grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1.5 ${bodyTextClass} [&>p]:col-start-2 [&>p]:row-start-1 [&>p]:mb-0 [&>p]:min-w-0 [&>p]:wrap-break-word [&>ul]:col-span-2 [&>ul]:mt-1.5 [&>ul]:ml-5 [&>ul]:list-disc [&>ul]:space-y-1 [&>ul]:pl-1`}
        >
          {children}
        </li>
      );
    }

    return <li className={bodyTextClass}>{children}</li>;
  },
  blockquote: ({ children }) => (
    <blockquote className="mb-5 border-l-[3px] border-blue-500/40 bg-slate-50/80 py-1 pl-5 text-[17px] leading-[1.75] text-slate-600 dark:border-blue-400/45 dark:bg-white/4 dark:text-slate-400">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-slate-200 dark:border-white/10" />,
  code: ({ className, children }) => {
    const isBlock = Boolean(className?.includes('language-'));
    if (isBlock) {
      return (
        <code className="font-mono text-[0.9em] text-slate-800 dark:text-slate-200">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded-md border border-slate-200/80 bg-slate-100 px-1.5 py-0.5 font-mono text-[0.88em] text-slate-800 dark:border-white/12 dark:bg-white/8 dark:text-slate-200">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-5 overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-50 p-4 text-sm leading-relaxed dark:border-white/12 dark:bg-slate-900/50">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className={`${shareNoteTableShellClass} share-note-markdown-table`}>
      <table>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => <th>{children}</th>,
  td: ({ children }) => <td>{children}</td>,
  input: ({ checked, type }) => {
    if (type !== 'checkbox') {
      return null;
    }

    return <ShareNoteTaskCheckbox checked={checked} />;
  },
};

type SharedNoteMarkdownProps = {
  markdown: string;
};

export function SharedNoteMarkdown({ markdown }: SharedNoteMarkdownProps): React.ReactElement {
  const segments = splitShareNoteEmailTableBlocks(markdown);
  let key = 0;

  return (
    <div className="shared-note-prose min-w-0 selection:bg-blue-500/20 dark:selection:bg-blue-400/25">
      {segments.map((segment) => {
        if (segment.type === 'table') {
          return (
            <div
              key={`table-${key++}`}
              className={`${shareNoteTableShellClass} share-note-transcript-table`}
              dangerouslySetInnerHTML={{ __html: segment.html }}
            />
          );
        }

        if (!segment.content.trim()) {
          return null;
        }

        return (
          <ReactMarkdown
            key={`md-${key++}`}
            remarkPlugins={[remarkGfm, remarkBreaks]}
            rehypePlugins={[rehypeSanitize]}
            components={shareNoteMarkdownComponents}
            skipHtml
          >
            {segment.content}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}
