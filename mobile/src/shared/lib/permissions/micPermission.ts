import { Linking, PermissionsAndroid } from 'react-native';
import type { AudioSet } from 'react-native-nitro-sound';
import AudioRecorderPlayer, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  OutputFormatAndroidType,
} from 'react-native-nitro-sound';

import { IS_ANDROID } from '@/shared/lib/platform';

export type MicPermissionStatus = 'granted' | 'denied' | 'not-determined';

type RecorderInstance = {
  startRecorder: (uri?: string, audioSets?: AudioSet, meteringEnabled?: boolean) => Promise<string>;
  stopRecorder: () => Promise<string>;
};

const iosRecorder = AudioRecorderPlayer as unknown as RecorderInstance;

const IOS_AUDIO_SET: AudioSet = {
  AVModeIOS: 'measurement',
  AVFormatIDKeyIOS: 'lpcm',
  AVSampleRateKeyIOS: 16000,
  AVNumberOfChannelsKeyIOS: 1,
  AudioSourceAndroid: AudioSourceAndroidType.VOICE_RECOGNITION,
  OutputFormatAndroid: OutputFormatAndroidType.DEFAULT,
  AudioEncoderAndroid: AudioEncoderAndroidType.DEFAULT,
  AudioSamplingRate: 16000,
  AudioChannels: 1,
  AudioEncodingBitRate: 256000,
};

export async function checkMicPermission(): Promise<MicPermissionStatus> {
  if (IS_ANDROID) {
    const result = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    return result ? 'granted' : 'not-determined';
  }

  try {
    const { check, PERMISSIONS } = await import('react-native-permissions');
    const status = await check(PERMISSIONS.IOS.MICROPHONE);

    if (status === 'granted') return 'granted';
    if (status === 'blocked') return 'denied';

    return 'not-determined';
  } catch {
    return 'not-determined';
  }
}

export type RequestMicPermissionOptions = {
  title?: string;
  message?: string;
  buttonPositive?: string;
  buttonNegative?: string;
};

export async function requestMicPermission(
  _options?: RequestMicPermissionOptions,
): Promise<boolean> {
  if (IS_ANDROID) {
    try {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  try {
    const { request, PERMISSIONS } = await import('react-native-permissions');
    const status = await request(PERMISSIONS.IOS.MICROPHONE);

    if (status === 'granted') return true;
    if (status === 'denied' || status === 'blocked') {
      await Linking.openSettings();
      return false;
    }
    return false;
  } catch {
    try {
      await iosRecorder.startRecorder(undefined, IOS_AUDIO_SET, false);
      await iosRecorder.stopRecorder();
      return true;
    } catch {
      await Linking.openSettings();
      return false;
    }
  }
}

export async function openAppSettings(): Promise<void> {
  await Linking.openSettings();
}
