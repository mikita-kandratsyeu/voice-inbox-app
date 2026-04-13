'use client';

import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type MarkdownContentProps = {
  content: string;
  className?: string;
  /** Softer typography aligned with marketing sections (blog posts). */
  variant?: 'default' | 'blog';
};

const defaultComponents: Components = {
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

const blogComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 mt-10 wrap-break-word text-2xl font-semibold tracking-tight text-black first:mt-0 dark:text-white sm:text-3xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-10 text-xl font-semibold tracking-tight text-black dark:text-white">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-8 text-lg font-semibold tracking-tight text-black dark:text-white">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-4 text-base leading-relaxed text-black/70 dark:text-white/70">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-black dark:text-white">{children}</strong>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-blue-600 underline decoration-blue-600/30 underline-offset-4 transition-opacity hover:opacity-90 dark:text-blue-400 dark:decoration-blue-400/35"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 ml-6 list-disc space-y-2 text-black/70 dark:text-white/70">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 ml-6 list-decimal space-y-2 text-black/70 dark:text-white/70">{children}</ol>
  ),
  li: ({ children }) => <li className="text-base leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-4 border-l-2 border-blue-500/35 pl-4 text-black/65 italic dark:border-blue-400/40 dark:text-white/65">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded-md border border-black/10 bg-black/4 px-1.5 py-0.5 text-[0.9em] text-black/85 dark:border-white/12 dark:bg-white/8 dark:text-white/85">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-xl border border-black/10 bg-black/4 p-4 text-sm dark:border-white/12 dark:bg-white/6">
      {children}
    </pre>
  ),
};

export function MarkdownContent({ content, className = '', variant = 'default' }: MarkdownContentProps) {
  const components = variant === 'blog' ? blogComponents : defaultComponents;

  return (
    <div className={`min-w-0 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
