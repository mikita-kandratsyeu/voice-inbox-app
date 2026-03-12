import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Sound, { type PlayBackType } from 'react-native-nitro-sound';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { formatTime, hapticSelection } from '@/shared/lib';

const SKIP_SECONDS = 10;
const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 2] as const;

type AudioPlayerProps = {
  duration: string;
  color: Colors;
  audioPath?: string;
};

const parseDuration = (d: string) => {
  const parts = d.split(':');

  if (parts.length !== 2) {
    return 0;
  }

  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

const player = Sound;

export const AudioPlayer = ({ duration, color, audioPath }: AudioPlayerProps) => {
  const totalSeconds = parseDuration(duration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);

  const progressValue = useSharedValue(0);
  const trackWidthValue = useSharedValue(0);
  const elapsedRef = useRef(0);
  const isPlayerLoadedRef = useRef(false);
  const totalMs = totalSeconds * 1000;
  const playbackSpeed = PLAYBACK_SPEEDS[speedIndex];

  const progress = totalSeconds > 0 ? elapsed / totalSeconds : 0;

  useEffect(() => {
    progressValue.value = withTiming(progress, { duration: 150 });
  }, [progress, progressValue]);

  const stopAndReset = useCallback(async () => {
    try {
      player.removePlayBackListener();
      player.removePlaybackEndListener();
      await player.stopPlayer();
    } catch (err) {
      if (__DEV__) console.warn('[AudioPlayer] stopPlayer failed:', err);
    }
    isPlayerLoadedRef.current = false;
    setIsPlaying(false);
    setElapsed(0);
    elapsedRef.current = 0;
    progressValue.value = 0;
  }, [progressValue]);

  const seekTo = useCallback(async (seekMs: number) => {
    try {
      await player.seekToPlayer(seekMs);
      const secs = Math.floor(seekMs / 1000);
      elapsedRef.current = secs;
      setElapsed(secs);
    } catch (err) {
      if (__DEV__) console.warn('[AudioPlayer] seekToPlayer failed:', err);
    }
  }, []);

  const startPlayback = useCallback(
    async (startSecs = 0) => {
      if (!audioPath) {
        return;
      }

      try {
        player.setSubscriptionDuration(0.25);

        player.addPlayBackListener((e: PlayBackType) => {
          const secs = Math.floor(e.currentPosition / 1000);
          elapsedRef.current = secs;
          setElapsed(secs);
        });

        player.addPlaybackEndListener(() => {
          player.removePlayBackListener();
          player.removePlaybackEndListener();
          setIsPlaying(false);
          setElapsed(totalSeconds);
          elapsedRef.current = totalSeconds;
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
        if (__DEV__) console.warn('[AudioPlayer] startPlayer failed:', err);
      }
    },
    [audioPath, totalSeconds, playbackSpeed, seekTo],
  );

  const handlePlayPause = async () => {
    if (!audioPath) {
      return;
    }

    hapticSelection();

    if (elapsed >= totalSeconds && totalSeconds > 0) {
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
        if (__DEV__) console.warn('[AudioPlayer] pausePlayer failed:', err);
      }
    } else {
      try {
        player.setSubscriptionDuration(0.25);

        player.addPlayBackListener((e: PlayBackType) => {
          const secs = Math.floor(e.currentPosition / 1000);
          elapsedRef.current = secs;
          setElapsed(secs);
        });

        player.addPlaybackEndListener(() => {
          player.removePlayBackListener();
          player.removePlaybackEndListener();
          setIsPlaying(false);
          setElapsed(totalSeconds);
          elapsedRef.current = totalSeconds;
        });

        if (isPlayerLoadedRef.current) {
          await player.resumePlayer();
          await player.setPlaybackSpeed(playbackSpeed);
        } else {
          await startPlayback(elapsedRef.current);
        }
        setIsPlaying(true);
      } catch (err) {
        if (__DEV__) console.warn('[AudioPlayer] resumePlayer failed:', err);
      }
    }
  };

  const handleRestart = async () => {
    hapticSelection();
    await stopAndReset();
  };

  const handleSkipBack = async () => {
    if (!hasAudio) return;
    hapticSelection();
    const seekMs = Math.max(0, elapsedRef.current * 1000 - SKIP_SECONDS * 1000);
    const secs = Math.floor(seekMs / 1000);
    elapsedRef.current = secs;
    setElapsed(secs);
    progressValue.value = totalSeconds > 0 ? secs / totalSeconds : 0;
    if (isPlayerLoadedRef.current) {
      await seekTo(seekMs);
    }
  };

  const handleSkipForward = async () => {
    if (!hasAudio) return;
    hapticSelection();
    const seekMs = Math.min(totalMs, elapsedRef.current * 1000 + SKIP_SECONDS * 1000);
    const secs = Math.floor(seekMs / 1000);
    elapsedRef.current = secs;
    setElapsed(secs);
    progressValue.value = totalSeconds > 0 ? secs / totalSeconds : 0;
    if (isPlayerLoadedRef.current) {
      await seekTo(seekMs);
    }
  };

  const handleCycleSpeed = () => {
    if (!hasAudio) return;
    hapticSelection();
    setSpeedIndex((i) => (i + 1) % PLAYBACK_SPEEDS.length);
  };

  const handleTrackPress = async (e: GestureResponderEvent) => {
    if (trackWidth === 0 || totalMs === 0 || !audioPath) {
      return;
    }
    hapticSelection();
    const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / trackWidth));
    const seekMs = Math.floor(ratio * totalMs);
    const secs = Math.floor(seekMs / 1000);
    elapsedRef.current = secs;
    setElapsed(secs);
    progressValue.value = totalSeconds > 0 ? secs / totalSeconds : 0;
    if (isPlayerLoadedRef.current) {
      await seekTo(seekMs);
    }
  };

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    left: progressValue.value * Math.max(0, trackWidthValue.value - 12),
  }));

  useEffect(() => {
    if (isPlaying && isPlayerLoadedRef.current) {
      player.setPlaybackSpeed(playbackSpeed).catch(() => {});
    }
  }, [playbackSpeed, isPlaying]);

  useEffect(() => {
    return () => {
      player.removePlayBackListener();
      player.removePlaybackEndListener();
      player.stopPlayer().catch(() => {});
    };
  }, []);

  const hasAudio = Boolean(audioPath);

  const speedLabel = playbackSpeed === 1 ? '1×' : `${playbackSpeed}×`;

  return (
    <View
      className="gap-3 rounded-2xl"
      style={{
        backgroundColor: color.background.card,
        padding: 16,
      }}
    >
      <View className="gap-1.5">
        <View
          className="h-1 justify-center overflow-visible rounded-sm"
          style={{ backgroundColor: color.background.tertiary }}
          onLayout={(e: LayoutChangeEvent) => {
            const w = e.nativeEvent.layout.width;
            setTrackWidth(w);
            trackWidthValue.value = w;
          }}
          onStartShouldSetResponder={() => hasAudio}
          onResponderGrant={handleTrackPress}
        >
          <Animated.View
            className="absolute left-0 top-0 h-1 rounded-sm"
            style={[
              fillStyle,
              { backgroundColor: hasAudio ? color.accent.primary : color.background.tertiary },
            ]}
          />
          <Animated.View
            className="absolute -top-1 h-3 w-3 rounded-full shadow-sm"
            style={[
              thumbStyle,
              { backgroundColor: hasAudio ? color.accent.primary : 'transparent' },
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

      <View className="flex-row items-center justify-between" style={{ minHeight: 48 }}>
        <View className="flex-row items-center gap-2.5">
          <TouchableOpacity
            onPress={handleSkipBack}
            disabled={!hasAudio}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: hasAudio ? color.background.tertiary : 'transparent' }}
          >
            <ChevronLeft
              size={20}
              color={hasAudio ? color.text.primary : color.text.muted}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePlayPause}
            disabled={!hasAudio}
            activeOpacity={0.85}
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{
              backgroundColor: hasAudio ? color.accent.primary : color.background.tertiary,
            }}
          >
            {isPlaying ? (
              <Pause size={22} color={color.icon.onAccent} strokeWidth={2.5} />
            ) : (
              <Play
                size={22}
                color={hasAudio ? color.icon.onAccent : color.text.muted}
                strokeWidth={2.5}
                fill={hasAudio ? color.icon.onAccent : color.text.muted}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSkipForward}
            disabled={!hasAudio}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="h-10 w-10 items-center justify-center rounded-full"
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
            onPress={handleCycleSpeed}
            disabled={!hasAudio}
            activeOpacity={0.7}
            className="min-w-[48px] items-center justify-center rounded-xl px-3 py-2.5"
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
            onPress={handleRestart}
            disabled={!hasAudio}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="h-10 w-10 items-center justify-center rounded-full"
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
};
