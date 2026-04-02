export const SUPPORT_PRO_KEY_SUBJECT_MARKER = 'VI-PRO';

export function isSupportProKeyRequestSubject(subject: string | null | undefined): boolean {
  if (subject == null || !subject.trim()) return false;
  return subject.toLowerCase().includes(SUPPORT_PRO_KEY_SUBJECT_MARKER.toLowerCase());
}
