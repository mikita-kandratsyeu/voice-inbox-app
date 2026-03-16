import { NativeModules } from 'react-native';

import { IS_IOS } from '@/shared/lib/platform';

const { RecordingLiveActivityModule } = NativeModules;

export const startRecordingLiveActivity = async (): Promise<void> => {
  if (!IS_IOS || !RecordingLiveActivityModule) return;
  try {
    await RecordingLiveActivityModule.startActivity();
  } catch {
    if (__DEV__) {
      console.warn('[startRecordingLiveActivity] Failed to start activity');
    }
  }
};

export const updateRecordingLiveActivity = async (elapsedSeconds: number): Promise<void> => {
  if (!IS_IOS || !RecordingLiveActivityModule) return;
  try {
    await RecordingLiveActivityModule.updateActivity(elapsedSeconds);
  } catch {
    if (__DEV__) {
      console.warn('[updateRecordingLiveActivity] Failed to update activity');
    }
  }
};

export const endRecordingLiveActivity = async (): Promise<void> => {
  if (!IS_IOS || !RecordingLiveActivityModule) return;
  try {
    await RecordingLiveActivityModule.endActivity();
  } catch {
    if (__DEV__) {
      console.warn('[endRecordingLiveActivity] Failed to end activity');
    }
  }
};

export const isLiveActivityAvailable = (): boolean => {
  return IS_IOS && Boolean(RecordingLiveActivityModule);
};
