import { isSubtitleImportFileName } from './isSubtitleImportFile';

const AUDIO_EXT = /\.(m4a|mp4|mp3|wav|aac|caf|flac|ogg|opus|webm|aiff|aif|wma|3gp|amr)(\?.*)?$/i;

/** True when the picked name looks like an audio file we can import. */
export function isAudioImportFileName(name: string | null | undefined): boolean {
  if (isSubtitleImportFileName(name)) return false;
  if (!name?.trim()) return true;
  return AUDIO_EXT.test(name.trim());
}
