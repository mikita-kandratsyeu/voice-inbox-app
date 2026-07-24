import { ToastAndroid } from 'react-native';

import { IS_ANDROID } from '@/shared/lib';
import { i18n } from '@/shared/lib/i18n';

import { MIN_TRANSCRIBE_MS } from '../config/constants';

export function notifyAutoTranscriptionTooShort(): void {
  if (!IS_ANDROID) {
    return;
  }

  ToastAndroid.show(
    i18n.t('transcription.tooShortForAuto', { seconds: MIN_TRANSCRIBE_MS / 1000 }),
    ToastAndroid.SHORT,
  );
}
