import { NativeModules, Platform } from 'react-native';
import { PERMISSIONS, request, RESULTS } from 'react-native-permissions';

import { IS_ANDROID } from '@/shared/lib/platform';

type ReminderConfig = {
  title: string;
  note?: string;
  timestamp: number;
  priority?: number;
};

type VoiceInboxRemindersNative = {
  requestPermission(): Promise<boolean>;
  addReminder(config: ReminderConfig): Promise<unknown>;
};

const nativeModule = NativeModules.VoiceInboxReminders as VoiceInboxRemindersNative | undefined;

function getNativeModule(): VoiceInboxRemindersNative {
  if (!nativeModule?.requestPermission || !nativeModule?.addReminder) {
    throw new Error(`VoiceInboxReminders native module is unavailable on ${Platform.OS}`);
  }
  return nativeModule;
}

export async function requestReminderPermission(): Promise<boolean> {
  if (IS_ANDROID) {
    const result = await request(PERMISSIONS.ANDROID.WRITE_CALENDAR);
    return result === RESULTS.GRANTED || result === RESULTS.LIMITED;
  }

  return getNativeModule().requestPermission();
}

export async function addTaskReminder(config: ReminderConfig): Promise<void> {
  await getNativeModule().addReminder(config);
}
