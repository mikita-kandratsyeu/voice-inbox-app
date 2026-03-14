import { Linking, PermissionsAndroid, Platform } from 'react-native';

export type MicPermissionStatus = 'granted' | 'denied' | 'not-determined';

export async function checkMicPermission(): Promise<MicPermissionStatus> {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    return result ? 'granted' : 'not-determined';
  }

  // iOS: we rely on the NativeModules exposed by react-native-audio-recorder-player.
  // The library requests mic access when startRecorder is called.
  // Without react-native-permissions we cannot check status silently,
  // so we return 'not-determined' as the initial unknown state.
  return 'not-determined';
}

export async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
      title: 'Microphone permission',
      message: 'Voice Inbox needs microphone access for voice recording.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  // iOS: the microphone dialog is shown by the OS when startRecorder is called.
  // Returning true here allows the caller to proceed; the OS will prompt if needed.
  return true;
}

export async function openAppSettings(): Promise<void> {
  await Linking.openSettings();
}
