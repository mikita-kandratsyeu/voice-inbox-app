import { NativeModules, Platform } from 'react-native';

type SharedAudioImportNative = {
  getPendingImportPath: () => Promise<string | null>;
};

const native: SharedAudioImportNative | undefined =
  Platform.OS === 'android'
    ? (NativeModules.SharedAudioImport as SharedAudioImportNative | undefined)
    : undefined;

/** Android: path written by MainActivity when the app receives Share / View audio intent. */
export async function consumeAndroidPendingSharedAudioPath(): Promise<string | null> {
  if (!native?.getPendingImportPath) {
    return null;
  }
  try {
    const path = await native.getPendingImportPath();
    if (typeof path !== 'string' || path.trim().length === 0) {
      return null;
    }
    return path.trim();
  } catch {
    return null;
  }
}
