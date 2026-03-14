import { NativeModules, Platform } from 'react-native';

const { RecordingLiveActivityModule } = NativeModules;

export const startRecordingLiveActivity = async (): Promise<void> => {
  if (Platform.OS !== 'ios' || !RecordingLiveActivityModule) return;
  try {
    await RecordingLiveActivityModule.startActivity();
  } catch {
    if (__DEV__) console.warn('[startRecordingLiveActivity] failed');
  }
};

export const updateRecordingLiveActivity = async (elapsedSeconds: number): Promise<void> => {
  if (Platform.OS !== 'ios' || !RecordingLiveActivityModule) return;
  try {
    await RecordingLiveActivityModule.updateActivity(elapsedSeconds);
  } catch {
    if (__DEV__) console.warn('[updateRecordingLiveActivity] failed');
  }
};

export const endRecordingLiveActivity = async (): Promise<void> => {
  if (Platform.OS !== 'ios' || !RecordingLiveActivityModule) return;
  try {
    await RecordingLiveActivityModule.endActivity();
  } catch {
    if (__DEV__) console.warn('[endRecordingLiveActivity] failed');
  }
};

export const isLiveActivityAvailable = (): boolean => {
  return Platform.OS === 'ios' && Boolean(RecordingLiveActivityModule);
};
