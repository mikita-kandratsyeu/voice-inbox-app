import { buildSharedNotePublicPath, buildSharedNotePublicUrl } from '@/lib/shared-note-public';

describe('shared-note-public', () => {
  test('buildSharedNotePublicPath omits en prefix', () => {
    expect(buildSharedNotePublicPath('abc123', 'en')).toBe('/s/abc123');
  });

  test('buildSharedNotePublicPath adds ru prefix', () => {
    expect(buildSharedNotePublicPath('abc123', 'ru')).toBe('/ru/s/abc123');
  });

  test('buildSharedNotePublicUrl uses base url', () => {
    expect(buildSharedNotePublicUrl('abc123', 'ru')).toMatch(/\/ru\/s\/abc123$/);
  });
});
