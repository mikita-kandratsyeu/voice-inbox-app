import type { TextStyle } from 'react-native';

import type { Colors } from '@/shared/config';

const BODY_FONT_SIZE = 17;
const BODY_LINE_HEIGHT = 28;

export const NOTE_DOCUMENT_BODY_FONT_SIZE = BODY_FONT_SIZE;
export const NOTE_DOCUMENT_BODY_LINE_HEIGHT = BODY_LINE_HEIGHT;

export function getDocumentSectionHeadingStyle(color: Colors): TextStyle {
  return {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    color: color.text.primary,
    letterSpacing: -0.3,
    marginTop: 28,
    marginBottom: 12,
  };
}
