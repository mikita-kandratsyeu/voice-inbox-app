import { Linking, PermissionsAndroid } from 'react-native';
import type { AudioSet } from 'react-native-audio-recorder-player';
import AudioRecorderPlayer, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  OutputFormatAndroidType,
} from 'react-native-audio-recorder-player';

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

  // iOS: check via react-native-permissions if available (does not trigger dialog)
  // Note: check() can return 'denied' for "not determined" on first launch - we treat only
  // 'blocked' as true denied (user chose "Don't Allow" and must use Settings).
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

const DEFAULT_MIC_OPTIONS: Required<RequestMicPermissionOptions> = {
  title: 'Microphone permission',
  message: 'Voice Inbox needs microphone access for voice recording.',
  buttonPositive: 'Allow',
  buttonNegative: 'Deny',
};

export async function requestMicPermission(
  options?: RequestMicPermissionOptions,
): Promise<boolean> {
  const opts = { ...DEFAULT_MIC_OPTIONS, ...options };

  if (IS_ANDROID) {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
      title: opts.title ?? DEFAULT_MIC_OPTIONS.title,
      message: opts.message ?? DEFAULT_MIC_OPTIONS.message,
      buttonPositive: opts.buttonPositive ?? DEFAULT_MIC_OPTIONS.buttonPositive,
      buttonNegative: opts.buttonNegative ?? DEFAULT_MIC_OPTIONS.buttonNegative,
    });
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  // iOS: use react-native-permissions for proper request (no startRecorder errors)
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
    // Fallback: try startRecorder for older setup or if permissions lib unavailable
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
