import AudioRecorderPlayer, { type PlayBackType } from 'react-native-nitro-sound';

import { isNumber } from '@/shared/lib/type-guards';

import { getAudioDuration } from './getAudioDuration';

const player = AudioRecorderPlayer;

export const getAudioDurationMs = async (audioPath: string): Promise<number | null> => {
  const normalizedPath = audioPath.startsWith('file://') ? audioPath.slice(7) : audioPath;
  const lower = normalizedPath.toLowerCase();

  if (lower.endsWith('.wav')) {
    try {
      const seconds = await getAudioDuration(normalizedPath);
      return Math.round(seconds * 1000);
    } catch {
      return null;
    }
  }

  try {
    return await new Promise<number | null>((resolve) => {
      let resolved = false;
      let lastPositionMs = 0;
      const timeout = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        player.removePlayBackListener();
        player.removePlaybackEndListener();
        player.stopPlayer().catch(() => {});
        resolve(lastPositionMs > 0 ? lastPositionMs : null);
      }, 15000);

      const onPlayback = (e: PlayBackType) => {
        const ev = e as PlayBackType & { duration?: number };
        if (isNumber(ev.duration) && ev.duration > 0 && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          player.removePlayBackListener();
          player.removePlaybackEndListener();
          player.stopPlayer().catch(() => {});
          resolve(Math.round(ev.duration));
          return;
        }
        if (isNumber(ev.currentPosition)) {
          lastPositionMs = Math.max(lastPositionMs, ev.currentPosition);
        }
      };

      player.addPlayBackListener(onPlayback);
      player.addPlaybackEndListener(() => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        player.removePlayBackListener();
        player.removePlaybackEndListener();
        player.stopPlayer().catch(() => {});
        resolve(lastPositionMs > 0 ? lastPositionMs : null);
      });

      player
        .startPlayer(normalizedPath, {
          AVAudioSessionCategoryKey: 'AVAudioSessionCategoryPlayback',
          AVAudioSessionModeKey: 'AVAudioSessionModeDefault',
        })
        .then(() => {})
        .catch(() => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(null);
          }
        });
    });
  } catch {
    return null;
  }
};
