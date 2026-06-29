import { Presets } from 'react-native-pulsar';

import { devWarn } from '@/shared/lib/appLogger';
import { IS_ANDROID } from '@/shared/lib/platform';

import { canPlayHaptic, getEffectiveHapticsIntensity } from './gate';

type PlayFn = () => void;

const safePlay = (fn: PlayFn): void => {
  if (!canPlayHaptic()) {
    return;
  }
  try {
    fn();
  } catch {
    devWarn('Haptic feedback failed');
  }
};

const playForIntensity = (subtle: PlayFn, full: PlayFn): void => {
  const intensity = getEffectiveHapticsIntensity();
  if (intensity === 'off') {
    return;
  }
  safePlay(intensity === 'subtle' ? subtle : full);
};

export type SemanticToken =
  | 'selection'
  | 'light'
  | 'medium'
  | 'successSubtle'
  | 'successMajor'
  | 'error'
  | 'warning';

const SEMANTIC_SUBTLE: Record<SemanticToken, PlayFn> = {
  selection: () => Presets.System.selection(),
  light: () => Presets.System.impactLight(),
  medium: () => Presets.System.impactMedium(),
  successSubtle: () => Presets.System.notificationSuccess(),
  successMajor: () => Presets.System.notificationSuccess(),
  error: () => Presets.System.notificationError(),
  warning: () => Presets.System.notificationWarning(),
};

const SEMANTIC_FULL: Record<SemanticToken, PlayFn> = {
  selection: () => Presets.ping(),
  light: () => Presets.feather(),
  medium: () => Presets.snap(),
  successSubtle: () => Presets.bloom(),
  successMajor: () => Presets.triumph(),
  error: () => Presets.buzz(),
  warning: () => Presets.blip(),
};

export const playSemantic = (token: SemanticToken): void => {
  playForIntensity(SEMANTIC_SUBTLE[token], SEMANTIC_FULL[token]);
};

export type DomainToken =
  | 'recordingStart'
  | 'recordingPause'
  | 'recordingResume'
  | 'recordingLimitWarning'
  | 'recordingLimitFinal'
  | 'recordingControl'
  | 'recordingFinishIntent'
  | 'transcriptionProcessingStart'
  | 'transcriptionChunk'
  | 'transcriptionComplete'
  | 'transcriptionFailed'
  | 'playbackMarkCrossed'
  | 'pinKey'
  | 'pinSuccess'
  | 'pinError'
  | 'shakeDetect'
  | 'recordTabPress'
  | 'swipeCommit';

const DOMAIN_SUBTLE: Record<DomainToken, PlayFn> = {
  recordingStart: () => Presets.System.impactMedium(),
  recordingPause: () => Presets.System.impactLight(),
  recordingResume: () => Presets.System.selection(),
  recordingLimitWarning: () => Presets.System.impactLight(),
  recordingLimitFinal: () => Presets.System.impactMedium(),
  recordingControl: () => Presets.System.impactMedium(),
  recordingFinishIntent: () => Presets.System.impactLight(),
  transcriptionProcessingStart: () => Presets.System.impactLight(),
  transcriptionChunk: () => Presets.System.selection(),
  transcriptionComplete: () => Presets.System.notificationSuccess(),
  transcriptionFailed: () => Presets.System.notificationError(),
  playbackMarkCrossed: () =>
    IS_ANDROID ? Presets.System.Android.segmentTick() : Presets.System.selection(),
  pinKey: () => Presets.System.impactLight(),
  pinSuccess: () => Presets.System.notificationSuccess(),
  pinError: () => Presets.System.notificationError(),
  shakeDetect: () => Presets.System.impactMedium(),
  recordTabPress: () => Presets.System.impactLight(),
  swipeCommit: () => Presets.System.impactMedium(),
};

const DOMAIN_FULL: Record<DomainToken, PlayFn> = {
  recordingStart: () => Presets.charge(),
  recordingPause: () => Presets.latch(),
  recordingResume: () => Presets.ping(),
  recordingLimitWarning: () => Presets.swell(),
  recordingLimitFinal: () => Presets.finale(),
  recordingControl: () => Presets.strike(),
  recordingFinishIntent: () => Presets.bloom(),
  transcriptionProcessingStart: () => Presets.breath(),
  transcriptionChunk: () => Presets.pip(),
  transcriptionComplete: () => Presets.triumph(),
  transcriptionFailed: () => Presets.buzz(),
  playbackMarkCrossed: () =>
    IS_ANDROID ? Presets.System.Android.segmentTick() : Presets.ping(),
  pinKey: () => Presets.keyboardMechanical(),
  pinSuccess: () => Presets.lock(),
  pinError: () => Presets.buzz(),
  shakeDetect: () => Presets.charge(),
  recordTabPress: () => Presets.charge(),
  swipeCommit: () => Presets.cleave(),
};

export const playDomain = (token: DomainToken): void => {
  playForIntensity(DOMAIN_SUBTLE[token], DOMAIN_FULL[token]);
};
