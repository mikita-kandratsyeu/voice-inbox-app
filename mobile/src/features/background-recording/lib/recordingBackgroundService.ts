import { Platform } from 'react-native';
import BackgroundService from 'react-native-background-actions';

import { colors } from '@/shared/config';

const TASK_NAME = 'VoiceInboxRecording';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const getTaskOptions = (elapsedSeconds: number) => ({
  taskName: TASK_NAME,
  taskTitle: 'Voice Inbox AI',
  taskDesc: `Recording... ${formatDuration(elapsedSeconds)}`,
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap' as const,
  },
  color: colors.light.onboarding.setup.color,
});

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const startRecordingBackgroundService = async (
  onElapsedUpdate?: (elapsed: number) => void,
): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  let elapsed = 0;

  const taskWithTimer = async () => {
    while (BackgroundService.isRunning()) {
      await sleep(1000);
      elapsed += 1;
      onElapsedUpdate?.(elapsed);
      try {
        await BackgroundService.updateNotification({
          taskDesc: `Recording... ${formatDuration(elapsed)}`,
        });
      } catch {
        // Ignore update errors
      }
    }
  };

  await BackgroundService.start(taskWithTimer, getTaskOptions(0));
};

export const stopRecordingBackgroundService = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await BackgroundService.stop();
  } catch {
    if (__DEV__) console.warn('[background-recording] Failed to stop background service');
  }
};

export const isBackgroundServiceRunning = (): boolean => {
  return BackgroundService.isRunning();
};
