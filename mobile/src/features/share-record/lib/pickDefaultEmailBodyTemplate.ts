import type { ShareBriefTemplate } from './buildShareText';

const EMAIL_BODY_TEMPLATE_PREFERENCE: ShareBriefTemplate[] = [
  'emailBrief',
  'noteBrief',
  'meetingBrief',
  'meetingSpeakerTurns',
];

/** Default body format when sending by email (brief summary first). */
export function pickDefaultEmailBodyTemplate(
  available: readonly ShareBriefTemplate[],
): ShareBriefTemplate | null {
  if (available.length === 0) return null;
  for (const tpl of EMAIL_BODY_TEMPLATE_PREFERENCE) {
    if (available.includes(tpl)) return tpl;
  }
  return available[0] ?? null;
}
