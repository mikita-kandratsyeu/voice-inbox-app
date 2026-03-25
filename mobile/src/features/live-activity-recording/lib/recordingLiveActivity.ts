import { NativeModules } from 'react-native';

import { getAutoTitle } from '@/screens/record/lib/getAutoTitle';
import { IS_IOS } from '@/shared/lib/platform';

const { RecordingActivityModule } = NativeModules;

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
  title?: string,
  isRecording = true,
): Promise<void> {
  if (!isLiveActivityAvailable()) {
    return;
  }

  const resolvedTitle = title ?? defaultTitle;
  return RecordingActivityModule.update(isRecording, elapsedSeconds, resolvedTitle);
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
