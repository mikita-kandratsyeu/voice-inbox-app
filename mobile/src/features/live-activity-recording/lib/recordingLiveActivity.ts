import { NativeModules, Platform } from 'react-native';

const { RecordingLiveActivityModule } = NativeModules;

export const startRecordingLiveActivity = async (): Promise<void> => {
  if (Platform.OS !== 'ios' || !RecordingLiveActivityModule) return;
  try {
    await RecordingLiveActivityModule.startActivity();
  } catch {
    // Live Activity not available (e.g. iOS < 16.1)
  }
};

export const updateRecordingLiveActivity = async (elapsedSeconds: number): Promise<void> => {
  if (Platform.OS !== 'ios' || !RecordingLiveActivityModule) return;
  try {
    await RecordingLiveActivityModule.updateActivity(elapsedSeconds);
  } catch {
    // Ignore
  }
};

export const endRecordingLiveActivity = async (): Promise<void> => {
  if (Platform.OS !== 'ios' || !RecordingLiveActivityModule) return;
  try {
    await RecordingLiveActivityModule.endActivity();
  } catch {
    // Ignore
  }
};

export const isLiveActivityAvailable = (): boolean => {
  return Platform.OS === 'ios' && Boolean(RecordingLiveActivityModule);
};
