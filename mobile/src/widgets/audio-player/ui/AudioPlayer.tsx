import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react-native';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutChangeEvent, Text, TouchableOpacity, View } from 'react-native';
import AudioRecorderPlayer, { type PlayBackType } from 'react-native-nitro-sound';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { formatTime, hapticPlaybackMarkCrossed, hapticSelection } from '@/shared/lib';
import { diagWarn } from '@/shared/lib/appLogger';
import { IOS_MIN_TOUCH_TARGET } from '@/shared/lib/iosTouchTarget';

const SKIP_SECONDS = 5;
const SKIP_HOLD_START_MS = 400;
const SKIP_REPEAT_MS = 220;
const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 2] as const;
const THUMB_SIZE = 12;

type AudioPlayerProps = {
  duration: string;
  color: Colors;
  audioPath?: string;
  /** Sorted offsets for haptic ticks while playing forward. */
  playbackMarkOffsetsMs?: readonly number[];
  onPositionChange?: (positionMs: number) => void;
  surfaceBackgroundColor?: string;
  embedded?: boolean;
};

export type AudioPlayerRef = {
  seekToMs: (ms: number) => Promise<void>;
};

const parseDuration = (d: string) => {
  const parts = d.split(':');

  if (parts.length !== 2) {
    return 0;
  }

  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

const player = AudioRecorderPlayer;

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(function AudioPlayer(
  {
    duration,
    color,
    audioPath,
    playbackMarkOffsetsMs,
    onPositionChange,
    surfaceBackgroundColor,
    embedded = false,
  },
  ref,
) {
  const { t } = useTranslation();
  const totalSeconds = parseDuration(duration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);

  const progressValue = useSharedValue(0);
  const trackWidthValue = useSharedValue(0);
  const elapsedRef = useRef(0);
  const lastDisplayedSecsRef = useRef(0);
  const isPlayerLoadedRef = useRef(false);
  const skipHoldIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const crossedMarkIndicesRef = useRef<Set<number>>(new Set());
  const lastPlaybackPositionMsRef = useRef(0);
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;
  const totalMs = totalSeconds * 1000;
  const playbackSpeed = PLAYBACK_SPEEDS[speedIndex];

  const sortedMarkOffsetsMs = useMemo(
    () =>
      [...(playbackMarkOffsetsMs ?? [])]
        .map((offsetMs) => Math.max(0, Math.round(offsetMs)))
        .sort((a, b) => a - b),
    [playbackMarkOffsetsMs],
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

  const clampElapsedSecs = useCallback(
    (secs: number) => (totalSeconds > 0 ? Math.min(totalSeconds, Math.max(0, secs)) : 0),
    [totalSeconds],
  );

  const progressFromSecs = useCallback(
    (secs: number) => {
      if (totalSeconds <= 0) return 0;
      return Math.min(1, Math.max(0, secs / totalSeconds));
    },
    [totalSeconds],
  );

  const stopAndReset = useCallback(async () => {
    try {
      player.removePlayBackListener();
      player.removePlaybackEndListener();
      await player.stopPlayer();
    } catch (err) {
      diagWarn('[AudioPlayer] stopPlayer failed:', err);
    }
    isPlayerLoadedRef.current = false;
    setIsPlaying(false);
    setElapsed(0);
    elapsedRef.current = 0;
    lastDisplayedSecsRef.current = 0;
    progressValue.value = 0;
    crossedMarkIndicesRef.current.clear();
    lastPlaybackPositionMsRef.current = 0;
  }, [progressValue]);

  const seekTo = useCallback(
    async (seekMs: number) => {
      try {
        await player.seekToPlayer(seekMs);
        const secs = clampElapsedSecs(Math.floor(seekMs / 1000));
        elapsedRef.current = secs;
        lastDisplayedSecsRef.current = secs;
        setElapsed(secs);
        progressValue.value = progressFromSecs(secs);
        resetMarkCrossingsFrom(seekMs);
        lastPlaybackPositionMsRef.current = seekMs;
      } catch (err) {
        diagWarn('[AudioPlayer] seekToPlayer failed:', err);
      }
    },
    [clampElapsedSecs, progressFromSecs, progressValue, resetMarkCrossingsFrom],
  );

  const startPlayback = useCallback(
    async (startSecs = 0) => {
      if (!audioPath) {
        return;
      }

      try {
        player.setSubscriptionDuration(0.25);

        player.addPlayBackListener((e: PlayBackType) => {
          const secs = clampElapsedSecs(Math.floor(e.currentPosition / 1000));
          elapsedRef.current = secs;
          progressValue.value = progressFromSecs(secs);
          setElapsed(secs);
          notifyPlaybackPosition(e.currentPosition);
        });

        player.addPlaybackEndListener(() => {
          player.removePlayBackListener();
          player.removePlaybackEndListener();
          setIsPlaying(false);
          setElapsed(totalSeconds);
          elapsedRef.current = totalSeconds;
          progressValue.value = 1;
          notifyPlaybackPosition(totalSeconds * 1000);
        });

        await player.startPlayer(audioPath, {
          AVAudioSessionCategoryKey: 'AVAudioSessionCategoryPlayback',
          AVAudioSessionModeKey: 'AVAudioSessionModeDefault',
          AVAudioSessionCategoryOptionKey: 'AVAudioSessionCategoryOptionDefaultToSpeaker',
        });

        await player.setPlaybackSpeed(playbackSpeed);

        if (startSecs > 0) {
          await seekTo(startSecs * 1000);
        }

        isPlayerLoadedRef.current = true;
        setIsPlaying(true);
      } catch (err) {
        diagWarn('[AudioPlayer] startPlayer failed:', err);
      }
    },
    [
      audioPath,
      totalSeconds,
      playbackSpeed,
      seekTo,
      progressValue,
      clampElapsedSecs,
      progressFromSecs,
      notifyPlaybackPosition,
    ],
  );

  useImperativeHandle(
    ref,
    () => ({
      seekToMs: async (rawMs: number) => {
        if (!audioPath || totalSeconds <= 0) return;
        const ms = Math.max(0, Math.min(totalMs, rawMs));
        const secs = clampElapsedSecs(Math.floor(ms / 1000));
        elapsedRef.current = secs;
        lastDisplayedSecsRef.current = secs;
        setElapsed(secs);
        progressValue.value = progressFromSecs(secs);
        notifyPlaybackPosition(ms);
        if (!isPlayerLoadedRef.current) {
          await startPlayback(secs);
        } else {
          await seekTo(ms);
        }
      },
    }),
    [
      audioPath,
      totalMs,
      totalSeconds,
      seekTo,
      startPlayback,
      progressValue,
      clampElapsedSecs,
      progressFromSecs,
      notifyPlaybackPosition,
    ],
  );

  const handlePlayPause = async () => {
    if (!audioPath) {
      return;
    }

    hapticSelection();

    if (elapsedRef.current >= totalSeconds && totalSeconds > 0) {
      await stopAndReset();
      await startPlayback(0);
      return;
    }

    if (isPlaying) {
      try {
        await player.pausePlayer();
        player.removePlayBackListener();
        setIsPlaying(false);
      } catch (err) {
        diagWarn('[AudioPlayer] pausePlayer failed:', err);
      }
    } else {
      try {
        player.setSubscriptionDuration(0.25);

        player.addPlayBackListener((e: PlayBackType) => {
          const secs = clampElapsedSecs(Math.floor(e.currentPosition / 1000));
          elapsedRef.current = secs;
          progressValue.value = progressFromSecs(secs);
          notifyPlaybackPosition(e.currentPosition);
          if (secs !== lastDisplayedSecsRef.current) {
            lastDisplayedSecsRef.current = secs;
            setElapsed(secs);
          }
        });

        player.addPlaybackEndListener(() => {
          player.removePlayBackListener();
          player.removePlaybackEndListener();
          setIsPlaying(false);
          setElapsed(totalSeconds);
          elapsedRef.current = totalSeconds;
          lastDisplayedSecsRef.current = totalSeconds;
          progressValue.value = 1;
          notifyPlaybackPosition(totalSeconds * 1000);
        });

        if (isPlayerLoadedRef.current) {
          await player.resumePlayer();
          await player.setPlaybackSpeed(playbackSpeed);
        } else {
          await startPlayback(elapsedRef.current);
        }
        setIsPlaying(true);
      } catch (err) {
        diagWarn('[AudioPlayer] resumePlayer failed:', err);
      }
    }
  };

  const handleRestart = async () => {
    hapticSelection();
    await stopAndReset();
  };

  const clearSkipHoldTimers = useCallback(() => {
    if (skipHoldIntervalRef.current) {
      clearInterval(skipHoldIntervalRef.current);
      skipHoldIntervalRef.current = null;
    }
  }, []);

  const performSkipBack = useCallback(
    async (withHaptic: boolean) => {
      if (!audioPath) return;
      if (withHaptic) hapticSelection();
      const seekMs = Math.max(0, elapsedRef.current * 1000 - SKIP_SECONDS * 1000);
      const secs = clampElapsedSecs(Math.floor(seekMs / 1000));
      elapsedRef.current = secs;
      lastDisplayedSecsRef.current = secs;
      setElapsed(secs);
      progressValue.value = progressFromSecs(secs);
      if (isPlayerLoadedRef.current) {
        await seekTo(seekMs);
      }
    },
    [audioPath, seekTo, progressValue, clampElapsedSecs, progressFromSecs],
  );

  const performSkipForward = useCallback(
    async (withHaptic: boolean) => {
      if (!audioPath) return;
      if (withHaptic) hapticSelection();
      const seekMs = Math.min(totalMs, elapsedRef.current * 1000 + SKIP_SECONDS * 1000);
      const secs = clampElapsedSecs(Math.floor(seekMs / 1000));
      elapsedRef.current = secs;
      lastDisplayedSecsRef.current = secs;
      setElapsed(secs);
      progressValue.value = progressFromSecs(secs);
      if (isPlayerLoadedRef.current) {
        await seekTo(seekMs);
      }
    },
    [audioPath, seekTo, totalMs, progressValue, clampElapsedSecs, progressFromSecs],
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

  const handleCycleSpeed = () => {
    if (!hasAudio) return;
    hapticSelection();
    setSpeedIndex((i) => (i + 1) % PLAYBACK_SPEEDS.length);
  };

  const fillStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, Math.max(0, progressValue.value));
    return { width: `${progress * 100}%` };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, Math.max(0, progressValue.value));
    const maxLeft = Math.max(0, trackWidthValue.value - THUMB_SIZE);
    return { left: progress * maxLeft };
  });

  useEffect(() => {
    if (isPlaying && isPlayerLoadedRef.current) {
      player.setPlaybackSpeed(playbackSpeed).catch(() => {});
    }
  }, [playbackSpeed, isPlaying]);

  useEffect(() => {
    return () => {
      clearSkipHoldTimers();
      player.removePlayBackListener();
      player.removePlaybackEndListener();
      player.stopPlayer().catch(() => {});
    };
  }, [clearSkipHoldTimers]);

  const hasAudio = Boolean(audioPath);

  const speedLabel = playbackSpeed === 1 ? '1×' : `${playbackSpeed}×`;

  return (
    <View
      className={embedded ? 'gap-3' : 'gap-3 rounded-2xl'}
      style={{
        backgroundColor: embedded
          ? 'transparent'
          : (surfaceBackgroundColor ?? color.background.card),
        padding: embedded ? 0 : 16,
      }}
    >
      <View className="gap-1.5">
        <View
          className="h-1 justify-center overflow-visible rounded-sm"
          style={{ backgroundColor: color.background.tertiary }}
          onLayout={(e: LayoutChangeEvent) => {
            const w = e.nativeEvent.layout.width;
            trackWidthValue.value = w;
          }}
        >
          <Animated.View
            className="absolute left-0 top-0 h-1 rounded-sm"
            style={[
              fillStyle,
              { backgroundColor: hasAudio ? color.accent.primary : color.background.tertiary },
            ]}
          />
          <Animated.View
            className="absolute rounded-full shadow-sm"
            style={[
              thumbStyle,
              {
                top: -(THUMB_SIZE - 4) / 2,
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                backgroundColor: hasAudio ? color.accent.primary : 'transparent',
              },
            ]}
          />
        </View>
        <View className="flex-row justify-between">
          <Text className="text-[12px] font-medium" style={{ color: color.text.secondary }}>
            {formatTime(elapsed)}
          </Text>
          <Text className="text-[12px] font-medium" style={{ color: color.text.secondary }}>
            {duration}
          </Text>
        </View>
      </View>

      <View
        className="flex-row items-center justify-between"
        style={{ minHeight: IOS_MIN_TOUCH_TARGET }}
      >
        <View className="flex-row items-center gap-2.5">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('audioPlayer.skipBack')}
            onPress={() => void performSkipBack(true)}
            onLongPress={beginSkipBackHold}
            delayLongPress={SKIP_HOLD_START_MS}
            onPressOut={clearSkipHoldTimers}
            disabled={!hasAudio}
            activeOpacity={0.6}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: hasAudio ? color.background.tertiary : 'transparent' }}
          >
            <ChevronLeft
              size={20}
              color={hasAudio ? color.text.primary : color.text.muted}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? t('audioPlayer.pause') : t('audioPlayer.play')}
            onPress={handlePlayPause}
            disabled={!hasAudio}
            activeOpacity={0.85}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{
              backgroundColor: hasAudio ? color.accent.primary : color.background.tertiary,
            }}
          >
            {isPlaying ? (
              <Pause size={20} color={color.icon.onAccent} strokeWidth={2.5} fill="none" />
            ) : (
              <Play
                size={20}
                color={hasAudio ? color.icon.onAccent : color.text.muted}
                strokeWidth={2.5}
                fill="none"
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('audioPlayer.skipForward')}
            onPress={() => void performSkipForward(true)}
            onLongPress={beginSkipForwardHold}
            delayLongPress={SKIP_HOLD_START_MS}
            onPressOut={clearSkipHoldTimers}
            disabled={!hasAudio}
            activeOpacity={0.6}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: hasAudio ? color.background.tertiary : 'transparent' }}
          >
            <ChevronRight
              size={20}
              color={hasAudio ? color.text.primary : color.text.muted}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center gap-2.5">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('audioPlayer.playbackSpeed', { speed: speedLabel })}
            onPress={handleCycleSpeed}
            disabled={!hasAudio}
            activeOpacity={0.7}
            className="h-11 min-w-11 items-center justify-center rounded-full px-3"
            style={{
              backgroundColor: hasAudio ? color.background.tertiary : 'transparent',
            }}
          >
            <Text
              className="text-[13px] font-semibold tabular-nums"
              style={{ color: hasAudio ? color.text.primary : color.text.muted }}
            >
              {speedLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('audioPlayer.restart')}
            onPress={handleRestart}
            disabled={!hasAudio}
            activeOpacity={0.6}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: hasAudio ? color.background.tertiary : 'transparent' }}
          >
            <RotateCcw
              size={18}
              color={hasAudio ? color.text.primary : color.text.muted}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

AudioPlayer.displayName = 'AudioPlayer';
