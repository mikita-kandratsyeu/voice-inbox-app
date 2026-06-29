import { Presets } from 'react-native-pulsar';

import { devWarn } from '@/shared/lib/appLogger';
import { IS_ANDROID } from '@/shared/lib/platform';

import { canPlayHaptic, getEffectiveHapticsIntensity } from './gate';

type PlayFn = () => void;

let richPlayInFlight = false;

const safePlay = (fn: PlayFn, fallback?: PlayFn): void => {
  if (!canPlayHaptic()) {
    return;
  }
  try {
    fn();
  } catch {
    if (fallback) {
      try {
        fallback();
      } catch {
        devWarn('Haptic feedback failed');
      }
      return;
    }
    devWarn('Haptic feedback failed');
  }
};

const playForIntensity = (subtle: PlayFn, full: PlayFn): void => {
  const intensity = getEffectiveHapticsIntensity();
  if (intensity === 'off') {
    return;
  }
  if (intensity === 'subtle') {
    safePlay(subtle);
    return;
  }
  // Expressive: one rich preset at a time — concurrent CoreHaptics + UIKit calls crash Pulsar.
  if (richPlayInFlight) {
    safePlay(subtle);
    return;
  }
  richPlayInFlight = true;
  safePlay(
    () => {
      try {
        full();
      } finally {
        richPlayInFlight = false;
      }
    },
    () => {
      richPlayInFlight = false;
      subtle();
    },
  );
};

export type SemanticToken =
  | 'selection'
  | 'light'
  | 'medium'
  | 'successSubtle'
  | 'successMajor'
  | 'error'
  | 'warning';

/** Frequent UI taps — keep system haptics even in expressive mode (CoreHaptics chokes them). */
const EXPRESSIVE_SYSTEM_SEMANTIC = new Set<SemanticToken>(['selection', 'light', 'medium']);

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
  const subtle = SEMANTIC_SUBTLE[token];
  const full = SEMANTIC_FULL[token];
  const intensity = getEffectiveHapticsIntensity();
  if (intensity === 'off') {
    return;
  }
  if (intensity === 'subtle' || EXPRESSIVE_SYSTEM_SEMANTIC.has(token)) {
    safePlay(subtle);
    return;
  }
  playForIntensity(subtle, full);
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
  playbackMarkCrossed: () => (IS_ANDROID ? Presets.System.Android.segmentTick() : Presets.ping()),
  pinKey: () => Presets.keyboardMechanical(),
  pinSuccess: () => Presets.lock(),
  pinError: () => Presets.buzz(),
  shakeDetect: () => Presets.charge(),
  recordTabPress: () => Presets.charge(),
  swipeCommit: () => Presets.cleave(),
};

/** Frequent domain ticks — same rationale as EXPRESSIVE_SYSTEM_SEMANTIC. */
const EXPRESSIVE_SYSTEM_DOMAIN = new Set<DomainToken>([
  'pinKey',
  'transcriptionChunk',
  'playbackMarkCrossed',
]);

export const playDomain = (token: DomainToken): void => {
  const subtle = DOMAIN_SUBTLE[token];
  const full = DOMAIN_FULL[token];
  const intensity = getEffectiveHapticsIntensity();
  if (intensity === 'off') {
    return;
  }
  if (intensity === 'subtle' || EXPRESSIVE_SYSTEM_DOMAIN.has(token)) {
    safePlay(subtle);
    return;
  }
  playForIntensity(subtle, full);
};
