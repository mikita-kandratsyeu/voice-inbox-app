import { types } from '@react-native-documents/picker';

import { IS_IOS } from '@/shared/lib/platform';

/**
 * Document picker `type` values for import (audio + subtitles).
 *
 * iOS uses UTType identifiers only — MIME strings like `text/vtt` are ignored by
 * `UTType(_:)` and never reach UIDocumentPicker. Include broad text/content types
 * and `public.item` so `.vtt` / `.srt` are selectable on iPad.
 */
export function getImportMediaPickerTypes(): string[] {
  if (IS_IOS) {
    return [
      types.audio,
      types.plainText,
      'public.text',
      'public.content',
      'public.data',
      types.allFiles,
    ];
  }

  return [
    types.audio,
    'audio/mpeg',
    'audio/mp3',
    'public.mp3',
    'audio/mp4',
    'audio/x-m4a',
    'audio/wav',
    'audio/x-wav',
    types.plainText,
    'text/vtt',
    'text/plain',
    'text/*',
    'application/x-subrip',
  ];
}
