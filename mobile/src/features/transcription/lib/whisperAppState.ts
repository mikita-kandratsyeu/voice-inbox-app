import { AppState } from 'react-native';

/** Whisper Metal must not run while the app is inactive or in the background (iOS kills GPU work). */
export function canRunWhisperGpuWork(): boolean {
  return AppState.currentState === 'active';
}
