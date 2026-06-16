import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import { prepareShareNoteEmailMarkdown } from '@/lib/prepareShareNoteEmailMarkdown';
import { prisma } from '@/lib/prisma';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

type Props = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return {
    title: 'Shared note',
    description: 'Published from Voice Inbox',
    robots: { index: false, follow: false },
    alternates: { canonical: `${BASE_URL_OR_FALLBACK.replace(/\/$/, '')}/s/${token}` },
  };
}

export default async function SharedNotePage({ params }: Props) {
  const { token } = await params;
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    notFound();
  }

  const note = await prisma.publishedNote.findUnique({
    where: { token: normalizedToken },
    select: {
      title: true,
      markdown: true,
      publishedAt: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  if (!note || note.revokedAt || (note.expiresAt && note.expiresAt.getTime() <= Date.now())) {
    notFound();
  }

  const markdown = prepareShareNoteEmailMarkdown(note.markdown);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10">
      <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <header className="mb-6 border-b border-gray-100 pb-4">
          <h1 className="text-xl font-semibold text-gray-900">{note.title}</h1>
          <p className="mt-2 text-sm text-gray-500">
            Published {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(note.publishedAt)}
          </p>
        </header>
        <div className="prose prose-gray max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeSanitize]}>
            {markdown}
          </ReactMarkdown>
        </div>
      </article>
    </main>
  );
}
