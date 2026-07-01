import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type SharedValue, useSharedValue } from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { hapticLight, hapticPlaybackMarkCrossed, hapticSelection } from '@/shared/lib';

import { AudioPlayerScrubHapticFeedback } from '../lib/audioPlayerScrubHaptics';
import { AudioPlayerTransport } from '../lib/audioPlayerTransport';
import { AudioPlayerChrome } from './AudioPlayerChrome';

const SKIP_SECONDS = 5;
const SKIP_REPEAT_MS = 220;
const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 2] as const;

type AudioPlayerProps = {
  duration: string;
  color: Colors;
  audioPath?: string;
  /** Sorted offsets for haptic ticks while playing forward. */
  playbackMarkOffsetsMs?: readonly number[];
  onPositionChange?: (positionMs: number) => void;
  surfaceBackgroundColor?: string;
  embedded?: boolean;
  onPlaybackStateChange?: (state: AudioPlaybackState) => void;
};

export type AudioPlaybackState = {
  isPlaying: boolean;
  elapsedSecs: number;
  totalSecs: number;
  playbackSpeed: number;
};

export type AudioPlayerRef = {
  seekToMs: (ms: number) => Promise<void>;
  togglePlayPause: () => void;
  skipBack: () => Promise<void>;
  skipForward: () => Promise<void>;
  restart: () => Promise<void>;
  cycleSpeed: () => void;
  beginSkipBackHold: () => void;
  beginSkipForwardHold: () => void;
  clearSkipHoldTimers: () => void;
  beginScrub: () => void;
  scrubToProgress: (progress: number) => void;
  endScrub: (progress: number) => void;
  progressValue: SharedValue<number>;
  trackWidthValue: SharedValue<number>;
  elapsedMsValue: SharedValue<number>;
};

const parseDuration = (d: string) => {
  const parts = d.split(':');

  if (parts.length !== 2) {
    return 0;
  }

  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(function AudioPlayer(
  {
    duration,
    color,
    audioPath,
    playbackMarkOffsetsMs,
    onPositionChange,
    surfaceBackgroundColor,
    embedded = false,
    onPlaybackStateChange,
  },
  ref,
) {
  const totalSeconds = parseDuration(duration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);

  const progressValue = useSharedValue(0);
  const trackWidthValue = useSharedValue(0);
  const elapsedMsValue = useSharedValue(0);
  const elapsedRef = useRef(0);
  const lastDisplayedSecsRef = useRef(0);
  const skipHoldIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const crossedMarkIndicesRef = useRef<Set<number>>(new Set());
  const lastPlaybackPositionMsRef = useRef(0);
  const isScrubbingRef = useRef(false);
  const wasPlayingBeforeScrubRef = useRef(false);
  const lastScrubMsRef = useRef(0);
  const isPlayingRef = useRef(false);
  const scrubHapticsRef = useRef<AudioPlayerScrubHapticFeedback | null>(null);
  const transportRef = useRef<AudioPlayerTransport | null>(null);
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;
  const onPlaybackStateChangeRef = useRef(onPlaybackStateChange);
  onPlaybackStateChangeRef.current = onPlaybackStateChange;
  const audioPathRef = useRef(audioPath);
  audioPathRef.current = audioPath;
  const totalSecondsRef = useRef(totalSeconds);
  totalSecondsRef.current = totalSeconds;
  const totalMs = totalSeconds * 1000;
  const playbackSpeed = PLAYBACK_SPEEDS[speedIndex];
  const playbackSpeedRef = useRef(playbackSpeed);
  playbackSpeedRef.current = playbackSpeed;

  const sortedMarkOffsetsMs = useMemo(
    () =>
      [...(playbackMarkOffsetsMs ?? [])]
        .map((offsetMs) => Math.max(0, Math.round(offsetMs)))
        .sort((a, b) => a - b),
    [playbackMarkOffsetsMs],
  );

  const clampElapsedSecs = useCallback(
    (secs: number) => (totalSeconds > 0 ? Math.min(totalSeconds, Math.max(0, secs)) : 0),
    [totalSeconds],
  );

  const progressFromMs = useCallback(
    (positionMs: number) => {
      if (totalMs <= 0) return 0;
      return Math.min(1, Math.max(0, positionMs / totalMs));
    },
    [totalMs],
  );

  const resetMarkCrossingsFrom = useCallback(
    (positionMs: number) => {
      for (let index = 0; index < sortedMarkOffsetsMs.length; index += 1) {
        if (sortedMarkOffsetsMs[index] >= positionMs) {
          crossedMarkIndicesRef.current.delete(index);
        }
      }
    },
    [sortedMarkOffsetsMs],
  );

  const notifyPlaybackPosition = useCallback(
    (positionMs: number) => {
      const prevPositionMs = lastPlaybackPositionMsRef.current;
      if (sortedMarkOffsetsMs.length > 0 && positionMs > prevPositionMs) {
        for (let index = 0; index < sortedMarkOffsetsMs.length; index += 1) {
          if (crossedMarkIndicesRef.current.has(index)) continue;
          const markMs = sortedMarkOffsetsMs[index];
          if (prevPositionMs < markMs && positionMs >= markMs) {
            crossedMarkIndicesRef.current.add(index);
            hapticPlaybackMarkCrossed();
          }
        }
      } else if (positionMs < prevPositionMs) {
        resetMarkCrossingsFrom(positionMs);
      }
      lastPlaybackPositionMsRef.current = positionMs;
      onPositionChangeRef.current?.(positionMs);
    },
    [resetMarkCrossingsFrom, sortedMarkOffsetsMs],
  );

  const applySeekUi = useCallback(
    (seekMs: number) => {
      const secs = clampElapsedSecs(Math.floor(seekMs / 1000));
      elapsedRef.current = secs;
      lastDisplayedSecsRef.current = secs;
      elapsedMsValue.value = seekMs;
      progressValue.value = progressFromMs(seekMs);
      resetMarkCrossingsFrom(seekMs);
      lastPlaybackPositionMsRef.current = seekMs;
    },
    [clampElapsedSecs, elapsedMsValue, progressFromMs, progressValue, resetMarkCrossingsFrom],
  );

  const resetPlaybackUi = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    elapsedRef.current = 0;
    lastDisplayedSecsRef.current = 0;
    elapsedMsValue.value = 0;
    progressValue.value = 0;
    crossedMarkIndicesRef.current.clear();
    lastPlaybackPositionMsRef.current = 0;
  }, [elapsedMsValue, progressValue]);

  const handlePlaybackTick = useCallback(
    (positionMs: number) => {
      const secs = clampElapsedSecs(Math.floor(positionMs / 1000));
      elapsedRef.current = secs;
      elapsedMsValue.value = positionMs;
      progressValue.value = progressFromMs(positionMs);
      notifyPlaybackPosition(positionMs);
      if (secs !== lastDisplayedSecsRef.current) {
        lastDisplayedSecsRef.current = secs;
      }
    },
    [clampElapsedSecs, elapsedMsValue, notifyPlaybackPosition, progressFromMs, progressValue],
  );

  const handlePlaybackEnded = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    elapsedRef.current = totalSeconds;
    lastDisplayedSecsRef.current = totalSeconds;
    elapsedMsValue.value = totalSeconds * 1000;
    progressValue.value = 1;
    notifyPlaybackPosition(totalSeconds * 1000);
  }, [elapsedMsValue, notifyPlaybackPosition, progressValue, totalSeconds]);

  const syncWantPlaying = useCallback((playing: boolean) => {
    isPlayingRef.current = playing;
    setIsPlaying(playing);
  }, []);

  const handlePlaybackTickRef = useRef(handlePlaybackTick);
  handlePlaybackTickRef.current = handlePlaybackTick;
  const handlePlaybackEndedRef = useRef(handlePlaybackEnded);
  handlePlaybackEndedRef.current = handlePlaybackEnded;
  const syncWantPlayingRef = useRef(syncWantPlaying);
  syncWantPlayingRef.current = syncWantPlaying;

  if (transportRef.current == null) {
    transportRef.current = new AudioPlayerTransport({
      getAudioPath: () => audioPathRef.current,
      getTotalSeconds: () => totalSecondsRef.current,
      getPlaybackSpeed: () => playbackSpeedRef.current,
      getElapsedSecs: () => elapsedRef.current,
      isScrubbing: () => isScrubbingRef.current,
      onPlaybackTick: (positionMs) => handlePlaybackTickRef.current(positionMs),
      onPlaybackEnded: () => handlePlaybackEndedRef.current(),
      onWantPlayingChanged: (playing) => syncWantPlayingRef.current(playing),
    });
  }

  const transport = transportRef.current;

  useEffect(() => {
    scrubHapticsRef.current = new AudioPlayerScrubHapticFeedback(sortedMarkOffsetsMs);
  }, [sortedMarkOffsetsMs]);

  const seekTo = useCallback(
    async (seekMs: number, updateUi = true) => {
      if (updateUi) applySeekUi(seekMs);
      await transport.seek(seekMs);
    },
    [applySeekUi, transport],
  );

  const handlePlayPause = useCallback(() => {
    if (!audioPath) return;

    hapticLight();

    const wantPlaying = !isPlayingRef.current;
    syncWantPlaying(wantPlaying);
    transport.setPlaying(wantPlaying);
  }, [audioPath, syncWantPlaying, transport]);

  const handleRestart = useCallback(async () => {
    hapticLight();
    await transport.stopAndReset();
    resetPlaybackUi();
  }, [resetPlaybackUi, transport]);

  const clearSkipHoldTimers = useCallback(() => {
    if (skipHoldIntervalRef.current) {
      clearInterval(skipHoldIntervalRef.current);
      skipHoldIntervalRef.current = null;
    }
  }, []);

  const performSkipBack = useCallback(
    async (withHaptic: boolean) => {
      if (!audioPath) return;
      if (withHaptic) hapticLight();
      const seekMs = Math.max(0, elapsedRef.current * 1000 - SKIP_SECONDS * 1000);
      applySeekUi(seekMs);
      if (transport.getIsLoaded()) {
        void transport.seek(seekMs);
      }
    },
    [applySeekUi, audioPath, transport],
  );

  const performSkipForward = useCallback(
    async (withHaptic: boolean) => {
      if (!audioPath) return;
      if (withHaptic) hapticLight();
      const seekMs = Math.min(totalMs, elapsedRef.current * 1000 + SKIP_SECONDS * 1000);
      applySeekUi(seekMs);
      if (transport.getIsLoaded()) {
        void transport.seek(seekMs);
      }
    },
    [applySeekUi, audioPath, totalMs, transport],
  );

  const beginSkipBackHold = useCallback(() => {
    if (!audioPath) return;
    clearSkipHoldTimers();
    skipHoldIntervalRef.current = setInterval(() => {
      void performSkipBack(false);
    }, SKIP_REPEAT_MS);
  }, [audioPath, clearSkipHoldTimers, performSkipBack]);

  const beginSkipForwardHold = useCallback(() => {
    if (!audioPath) return;
    clearSkipHoldTimers();
    skipHoldIntervalRef.current = setInterval(() => {
      void performSkipForward(false);
    }, SKIP_REPEAT_MS);
  }, [audioPath, clearSkipHoldTimers, performSkipForward]);

  const handleCycleSpeed = useCallback(() => {
    if (!audioPath) return;
    hapticSelection();
    setSpeedIndex((i) => (i + 1) % PLAYBACK_SPEEDS.length);
  }, [audioPath]);

  const applyScrubProgress = useCallback(
    (progress: number, finalize: boolean) => {
      const ms = Math.min(totalMs, Math.max(0, Math.round(progress * totalMs)));
      const secs = clampElapsedSecs(Math.floor(ms / 1000));
      elapsedRef.current = secs;
      elapsedMsValue.value = ms;
      if (finalize) {
        progressValue.value = Math.min(1, Math.max(0, progress));
        lastDisplayedSecsRef.current = secs;
        onPositionChangeRef.current?.(ms);
      }
      return ms;
    },
    [clampElapsedSecs, elapsedMsValue, progressValue, totalMs],
  );

  const handleScrubStart = useCallback(() => {
    if (!audioPath || totalSeconds <= 0) return;
    isScrubbingRef.current = true;
    wasPlayingBeforeScrubRef.current = isPlayingRef.current;
    const ms = elapsedRef.current * 1000;
    lastScrubMsRef.current = ms;
    scrubHapticsRef.current?.onStart(ms);
    if (isPlayingRef.current) {
      void transport.pauseForScrub().then(() => syncWantPlaying(false));
    }
  }, [audioPath, syncWantPlaying, totalSeconds, transport]);

  const handleScrubChange = useCallback(
    (progress: number) => {
      if (!isScrubbingRef.current) return;
      const prevMs = lastScrubMsRef.current;
      const ms = applyScrubProgress(progress, false);
      scrubHapticsRef.current?.onMove(ms, prevMs);
      lastScrubMsRef.current = ms;

      const secs = clampElapsedSecs(Math.floor(ms / 1000));
      if (secs !== lastDisplayedSecsRef.current) {
        lastDisplayedSecsRef.current = secs;
        onPositionChangeRef.current?.(ms);
      }
    },
    [applyScrubProgress, clampElapsedSecs],
  );

  const handleScrubEnd = useCallback(
    async (progress: number) => {
      if (!isScrubbingRef.current) return;
      const ms = applyScrubProgress(progress, true);
      scrubHapticsRef.current?.onEnd();
      isScrubbingRef.current = false;
      resetMarkCrossingsFrom(ms);
      lastPlaybackPositionMsRef.current = ms;
      if (transport.getIsLoaded()) {
        await transport.seek(ms);
      }
      if (wasPlayingBeforeScrubRef.current) {
        await transport.resumeAfterScrub();
        syncWantPlaying(true);
      }
    },
    [applyScrubProgress, resetMarkCrossingsFrom, syncWantPlaying, transport],
  );

  useImperativeHandle(
    ref,
    () => ({
      seekToMs: async (rawMs: number) => {
        if (!audioPath || totalSeconds <= 0) return;
        const ms = Math.max(0, Math.min(totalMs, rawMs));
        applySeekUi(ms);
        notifyPlaybackPosition(ms);
        if (!transport.getIsLoaded()) {
          await transport.startAtSecs(Math.floor(ms / 1000));
          syncWantPlaying(true);
        } else {
          await transport.seek(ms);
        }
      },
      togglePlayPause: handlePlayPause,
      skipBack: () => performSkipBack(true),
      skipForward: () => performSkipForward(true),
      restart: handleRestart,
      cycleSpeed: handleCycleSpeed,
      beginSkipBackHold,
      beginSkipForwardHold,
      clearSkipHoldTimers,
      beginScrub: handleScrubStart,
      scrubToProgress: handleScrubChange,
      endScrub: (progress: number) => void handleScrubEnd(progress),
      progressValue,
      trackWidthValue,
      elapsedMsValue,
    }),
    [
      applySeekUi,
      audioPath,
      beginSkipBackHold,
      beginSkipForwardHold,
      clearSkipHoldTimers,
      handleCycleSpeed,
      handlePlayPause,
      handleRestart,
      handleScrubChange,
      handleScrubEnd,
      handleScrubStart,
      notifyPlaybackPosition,
      performSkipBack,
      performSkipForward,
      elapsedMsValue,
      progressValue,
      syncWantPlaying,
      totalMs,
      totalSeconds,
      trackWidthValue,
      transport,
    ],
  );

  useEffect(() => {
    transport.setPlaybackSpeed(playbackSpeed);
  }, [playbackSpeed, isPlaying, transport]);

  useEffect(() => {
    return () => {
      clearSkipHoldTimers();
      transport.dispose();
    };
  }, [clearSkipHoldTimers, transport]);

  useEffect(() => {
    onPlaybackStateChangeRef.current?.({
      isPlaying,
      elapsedSecs: elapsedRef.current,
      totalSecs: totalSeconds,
      playbackSpeed,
    });
  }, [isPlaying, playbackSpeed, totalSeconds]);

  const hasAudio = Boolean(audioPath);

  return (
    <AudioPlayerChrome
      color={color}
      duration={duration}
      hasAudio={hasAudio}
      isPlaying={isPlaying}
      elapsedMsValue={elapsedMsValue}
      embedded={embedded}
      surfaceBackgroundColor={surfaceBackgroundColor}
      playbackSpeed={playbackSpeed}
      progressValue={progressValue}
      trackWidthValue={trackWidthValue}
      onPlayPause={handlePlayPause}
      onSkipBack={() => void performSkipBack(true)}
      onSkipForward={() => void performSkipForward(true)}
      onSkipBackHold={beginSkipBackHold}
      onSkipForwardHold={beginSkipForwardHold}
      onSkipHoldEnd={clearSkipHoldTimers}
      onCycleSpeed={handleCycleSpeed}
      onRestart={() => void handleRestart()}
      onScrubStart={() => void handleScrubStart()}
      onScrubChange={handleScrubChange}
      onScrubEnd={(progress) => void handleScrubEnd(progress)}
    />
  );
});

AudioPlayer.displayName = 'AudioPlayer';
