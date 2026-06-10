import {
  buildEventDocumentHtml,
  inAppEventEtag,
  isInAppEventContentType,
  isInAppEventLocale,
  parseInAppEventTheme,
  validateInAppEventId,
} from './in-app-event-page';

describe('validateInAppEventId', () => {
  it('accepts slug-style ids', () => {
    expect(validateInAppEventId('update_1-1-0')).toBeNull();
  });

  it('rejects invalid characters', () => {
    expect(validateInAppEventId('Bad ID')).not.toBeNull();
  });
});

describe('locale and content type guards', () => {
  it('recognizes supported locale', () => {
    expect(isInAppEventLocale('en')).toBe(true);
    expect(isInAppEventLocale('fr')).toBe(false);
  });

  it('recognizes supported content types', () => {
    expect(isInAppEventContentType('html')).toBe(true);
    expect(isInAppEventContentType('markdown')).toBe(true);
    expect(isInAppEventContentType('text')).toBe(false);
  });
});

describe('parseInAppEventTheme', () => {
  it('accepts light and dark', () => {
    expect(parseInAppEventTheme('light')).toBe('light');
    expect(parseInAppEventTheme('dark')).toBe('dark');
    expect(parseInAppEventTheme('auto')).toBeNull();
  });
});

describe('buildEventDocumentHtml', () => {
  it('wraps inner html in a document with theme attribute', () => {
    const doc = buildEventDocumentHtml('<p>Hi</p>', 'dark');
    expect(doc).toContain('<!DOCTYPE html>');
    expect(doc).toContain('data-theme="dark"');
    expect(doc).toContain('<p>Hi</p>');
  });
});

describe('inAppEventEtag', () => {
  it('includes event id locale and revision', () => {
    expect(inAppEventEtag('update_1-1-0', 'en', 3)).toBe('W/"event-update_1-1-0-en-3"');
  });
});
