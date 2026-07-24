import { BASE_URL_OR_FALLBACK } from '@/config/constants';

export type ShareNoteEmailLocale = 'en' | 'ru';

export type ShareNoteEmailAttachmentKind = 'markdown' | 'pdf' | 'zip';

export function normalizeShareNoteEmailLocale(raw: unknown): ShareNoteEmailLocale {
  return raw === 'ru' ? 'ru' : 'en';
}

function noteIntro(locale: ShareNoteEmailLocale): string {
  return locale === 'ru'
    ? 'Пользователь Voice Inbox AI поделился с вами этой заметкой.'
    : 'A Voice Inbox AI user shared this note with you.';
}

function exportIntro(locale: ShareNoteEmailLocale): string {
  return locale === 'ru'
    ? 'Пользователь Voice Inbox AI поделился с вами экспортом.'
    : 'A Voice Inbox AI user shared an export with you.';
}

function footerLine(locale: ShareNoteEmailLocale): string {
  return locale === 'ru'
    ? 'Это письмо отправлено из Voice Inbox AI пользователем приложения.'
    : 'This email was sent from Voice Inbox AI by an app user.';
}

function attachmentPrefix(locale: ShareNoteEmailLocale): string {
  return locale === 'ru' ? 'Вложение:' : 'Attachment:';
}

function attachmentKindLabel(
  locale: ShareNoteEmailLocale,
  kind: ShareNoteEmailAttachmentKind,
): string {
  if (locale === 'ru') {
    switch (kind) {
      case 'markdown':
        return 'Экспорт Markdown';
      case 'pdf':
        return 'Экспорт PDF';
      case 'zip':
        return 'Экспорт ZIP';
    }
  }

  switch (kind) {
    case 'markdown':
      return 'Markdown export';
    case 'pdf':
      return 'PDF export';
    case 'zip':
      return 'ZIP export';
  }
}

function notePreheader(locale: ShareNoteEmailLocale, title: string): string {
  const text =
    locale === 'ru'
      ? `Заметка из Voice Inbox AI: ${title}`
      : `Shared note from Voice Inbox AI: ${title}`;
  return text.slice(0, 160);
}

function exportPreheader(
  locale: ShareNoteEmailLocale,
  title: string,
  attachmentKind: ShareNoteEmailAttachmentKind,
): string {
  const kindLabel = attachmentKindLabel(locale, attachmentKind);
  const text =
    locale === 'ru'
      ? `${kindLabel} из Voice Inbox AI: ${title}`
      : `${kindLabel} from Voice Inbox AI: ${title}`;
  return text.slice(0, 160);
}

function defaultExportBody(locale: ShareNoteEmailLocale): string {
  return locale === 'ru'
    ? 'Экспорт Voice Inbox прикреплён к письму.'
    : 'Your Voice Inbox export is attached.';
}

export function buildShareNoteEmailPlainText(params: {
  locale: ShareNoteEmailLocale;
  title: string;
  body: string;
  attachmentKind?: ShareNoteEmailAttachmentKind;
  attachmentFilename?: string;
  kind?: 'note' | 'export';
}): string {
  const kind = params.kind ?? 'note';
  const intro = kind === 'export' ? exportIntro(params.locale) : noteIntro(params.locale);
  const attachmentLabel =
    params.attachmentKind != null
      ? params.attachmentFilename?.trim() ||
        attachmentKindLabel(params.locale, params.attachmentKind)
      : undefined;

  return [
    params.title,
    '',
    intro,
    attachmentLabel ? `${attachmentPrefix(params.locale)} ${attachmentLabel}` : null,
    '',
    params.body.trim(),
    '',
    footerLine(params.locale),
    BASE_URL_OR_FALLBACK,
  ]
    .filter((line): line is string => line != null)
    .join('\n');
}

export function buildShareNoteEmailShellStrings(params: {
  locale: ShareNoteEmailLocale;
  title: string;
  kind?: 'note' | 'export';
  attachmentKind?: ShareNoteEmailAttachmentKind;
  attachmentFilename?: string;
}): {
  intro: string;
  preheader: string;
  attachmentPrefix: string;
  attachmentLabel?: string;
  footerLine: string;
} {
  const kind = params.kind ?? 'note';
  const attachmentLabel =
    params.attachmentFilename?.trim() ||
    (params.attachmentKind != null
      ? attachmentKindLabel(params.locale, params.attachmentKind)
      : undefined);

  return {
    intro: kind === 'export' ? exportIntro(params.locale) : noteIntro(params.locale),
    preheader:
      kind === 'export' && params.attachmentKind != null
        ? exportPreheader(params.locale, params.title, params.attachmentKind)
        : notePreheader(params.locale, params.title),
    attachmentPrefix: attachmentPrefix(params.locale),
    attachmentLabel,
    footerLine: footerLine(params.locale),
  };
}

export { defaultExportBody };
