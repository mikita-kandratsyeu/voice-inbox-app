'use client';

import { Check } from 'lucide-react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

import { splitShareNoteEmailTableBlocks } from '@/lib/shareNoteEmailMarkdownTables';

function ShareNoteTaskCheckbox({ checked }: { checked?: boolean }): React.ReactElement {
  return (
    <span
      role="img"
      aria-label={checked ? 'Completed' : 'Open'}
      className={`col-start-1 row-start-1 mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 ${
        checked
          ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_1px_2px_rgba(16,185,129,0.35)] dark:border-emerald-400 dark:bg-emerald-500'
          : 'border-black/18 bg-white dark:border-white/22 dark:bg-white/6'
      }`}
    >
      {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
    </span>
  );
}

const shareNoteMarkdownComponents: Components = {
  h2: ({ children }) => (
    <h2 className="mb-4 mt-10 border-t border-black/10 pt-6 text-xl font-semibold tracking-tight text-black first:mt-0 first:border-t-0 first:pt-0 dark:border-white/10 dark:text-white">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-8 text-lg font-semibold tracking-tight text-black dark:text-white">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-6 text-base font-semibold text-black dark:text-white">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="mb-4 text-base leading-relaxed text-black/75 dark:text-white/75">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-black dark:text-white">{children}</strong>
  ),
  em: ({ children }) => <em className="text-black/65 italic dark:text-white/65">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-blue-600 underline decoration-blue-600/30 underline-offset-4 transition-opacity hover:opacity-90 dark:text-blue-400 dark:decoration-blue-400/35"
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
            ? 'mb-4 list-none space-y-3 pl-0'
            : 'mb-4 ml-6 list-disc space-y-2 text-black/75 dark:text-white/75'
        }
      >
        {children}
      </ul>
    );
  },
  ol: ({ children }) => (
    <ol className="mb-4 ml-6 list-decimal space-y-2 text-black/75 dark:text-white/75">
      {children}
    </ol>
  ),
  li: ({ className, children }) => {
    const isTask = className?.includes('task-list-item');
    if (isTask) {
      return (
        <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1.5 text-base leading-relaxed text-black/75 dark:text-white/75 [&>p]:col-start-2 [&>p]:row-start-1 [&>p]:mb-0 [&>p]:min-w-0 [&>p]:wrap-break-word [&>ul]:col-span-2 [&>ul]:mt-1.5 [&>ul]:ml-5 [&>ul]:list-disc [&>ul]:space-y-1 [&>ul]:pl-1">
          {children}
        </li>
      );
    }

    return <li className="text-base leading-relaxed">{children}</li>;
  },
  blockquote: ({ children }) => (
    <blockquote className="mb-4 border-l-2 border-blue-500/35 pl-4 text-black/65 dark:border-blue-400/40 dark:text-white/65">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-8 border-black/10 dark:border-white/10" />,
  code: ({ className, children }) => {
    const isBlock = Boolean(className?.includes('language-'));
    if (isBlock) {
      return <code className="font-mono text-sm text-black/85 dark:text-white/85">{children}</code>;
    }
    return (
      <code className="rounded-md border border-black/10 bg-black/4 px-1.5 py-0.5 font-mono text-[0.9em] text-black/85 dark:border-white/12 dark:bg-white/8 dark:text-white/85">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-xl border border-black/10 bg-black/4 p-4 text-sm dark:border-white/12 dark:bg-white/6">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-sm leading-relaxed text-black/75 dark:text-white/75">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-black/3 dark:bg-white/6">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-black/8 dark:border-white/10">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="border border-black/10 px-3 py-2 text-left font-semibold text-black dark:border-white/12 dark:text-white">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-black/10 px-3 py-2 align-top wrap-break-word dark:border-white/12">
      {children}
    </td>
  ),
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
    <div className="min-w-0">
      {segments.map((segment) => {
        if (segment.type === 'table') {
          return (
            <div
              key={`table-${key++}`}
              className="share-note-table my-5 overflow-x-auto rounded-xl border border-black/8 dark:border-white/10"
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
