import { NativeModules } from 'react-native';

import { getAutoTitle } from '@/screens/record/lib/getAutoTitle';
import { IS_IOS } from '@/shared/lib/platform';

const { RecordingActivityModule } = NativeModules;
console.log('RecordingActivityModule ==>', RecordingActivityModule);

const defaultTitle = getAutoTitle(false);

export const isLiveActivityAvailable = (): boolean => {
  return IS_IOS && Boolean(RecordingActivityModule);
};

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

export const endRecordingLiveActivitySuccessfully = (totalSeconds: number, title: string) => {
  if (!isLiveActivityAvailable()) {
    return;
  }

  return RecordingActivityModule.endSuccessfully(totalSeconds, title);
};
