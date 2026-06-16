import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';

import { SharedNoteArticle } from '@/components/share/SharedNoteArticle';
import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import { routing } from '@/lib/i18n';
import {
  buildSharedNotePublicPath,
  formatSharedNoteDateTime,
  loadSharedNoteByToken,
} from '@/lib/shared-note-public';

type Props = {
  params: Promise<{ locale: string; token: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, token } = await params;
  const note = await loadSharedNoteByToken(token);
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const base = BASE_URL_OR_FALLBACK.replace(/\/$/, '');

  if (!note) {
    return {
      title: t('sharedNoteMissingTitle'),
      description: t('sharedNoteMissingDescription'),
      robots: { index: false, follow: false },
    };
  }

  const canonicalPath = buildSharedNotePublicPath(token, locale);

  return {
    title: t('sharedNoteTitle', { title: note.title }),
    description: t('sharedNoteDescription'),
    robots: { index: false, follow: false },
    alternates: {
      canonical: `${base}${canonicalPath}`,
      languages: {
        en: `${base}${buildSharedNotePublicPath(token, 'en')}`,
        ru: `${base}${buildSharedNotePublicPath(token, 'ru')}`,
      },
    },
  };
}

export default async function SharedNotePage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const note = await loadSharedNoteByToken(token);
  if (!note) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'sharedNote' });
  const publishedOn = t('publishedOn', {
    date: formatSharedNoteDateTime(note.publishedAt, locale),
  });
  const expiresOn = note.expiresAt
    ? t('expiresOn', { date: formatSharedNoteDateTime(note.expiresAt, locale) })
    : null;

  return (
    <SharedNoteArticle
      title={note.title}
      markdown={note.markdown}
      publishedOn={publishedOn}
      expiresOn={expiresOn}
      visibilityHint={t('visibilityHint')}
      backHomeLabel={t('backHome')}
    />
  );
}
