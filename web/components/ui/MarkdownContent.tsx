'use client';

import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type MarkdownContentProps = {
  content: string;
  className?: string;
};

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-2 wrap-break-word text-2xl font-black text-black dark:text-white sm:text-4xl lg:text-5xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-8 text-xl font-bold text-black dark:text-white">{children}</h2>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-base leading-relaxed text-black/80 dark:text-white/80">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-black dark:text-white">{children}</strong>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-blue-500 underline transition-opacity hover:opacity-90 underline-offset-4"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 ml-6 list-disc space-y-1 text-black/80 dark:text-white/80">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 ml-6 list-decimal space-y-1 text-black/80 dark:text-white/80">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="text-base leading-relaxed">{children}</li>,
};

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`min-w-0 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
