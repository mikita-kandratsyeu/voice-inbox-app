import { NativeModules } from 'react-native';

import { getAutoTitle } from '@/screens/record/lib/getAutoTitle';
import { IS_IOS } from '@/shared/lib/platform';

const { RecordingActivityModule } = NativeModules;

const defaultTitle = getAutoTitle(false);

export async function startRecordingLiveActivity(
  sessionId = `session-${Date.now()}`,
  title = defaultTitle,
): Promise<void> {
  if (!isLiveActivityAvailable()) {
    return;
  }

  return RecordingActivityModule.start(sessionId, title);
}

export async function updateRecordingLiveActivity(
  elapsedSeconds: number,
  title = defaultTitle,
): Promise<void> {
  if (!isLiveActivityAvailable()) {
    return;
  }

  return RecordingActivityModule.update(true, elapsedSeconds, title);
}

export async function endRecordingLiveActivity(): Promise<void> {
  if (!isLiveActivityAvailable()) {
    return;
  }

  return RecordingActivityModule.stop();
}
export const isLiveActivityAvailable = (): boolean => {
  return IS_IOS && Boolean(RecordingActivityModule);
};
