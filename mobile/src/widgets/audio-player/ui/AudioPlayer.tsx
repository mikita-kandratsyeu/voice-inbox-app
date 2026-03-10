import { Pause, Play, RotateCcw } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, GestureResponderEvent, LayoutChangeEvent, Text, View } from 'react-native';
import AudioRecorderPlayer, { type PlayBackType } from 'react-native-audio-recorder-player';

import type { Colors } from '@/shared/config';
import { formatTime } from '@/shared/lib';
import { Button } from '@/shared/ui';

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

const player = AudioRecorderPlayer;

export const AudioPlayer = ({ duration, color, audioPath }: AudioPlayerProps) => {
  const totalSeconds = parseDuration(duration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const elapsedRef = useRef(0);
  const totalMs = totalSeconds * 1000;

  const progress = totalSeconds > 0 ? elapsed / totalSeconds : 0;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const stopAndReset = useCallback(async () => {
    try {
      player.removePlayBackListener();
      player.removePlaybackEndListener();

      await player.stopPlayer();
    } catch (err) {
      console.warn('[AudioPlayer] stopPlayer failed:', err);
    }

    setIsPlaying(false);
    setElapsed(0);

    elapsedRef.current = 0;
    progressAnim.setValue(0);
  }, [progressAnim]);

  const startPlayback = useCallback(async () => {
    if (!audioPath) {
      return;
    }

    try {
      player.setSubscriptionDuration(0.1);

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

      setIsPlaying(true);
    } catch (err) {
      console.warn('[AudioPlayer] startPlayer failed:', err);
    }
  }, [audioPath, totalSeconds]);

  const handlePlayPause = async () => {
    if (!audioPath) {
      return;
    }

    if (elapsed >= totalSeconds && totalSeconds > 0) {
      await stopAndReset();
      await startPlayback();

      return;
    }

    if (isPlaying) {
      try {
        await player.pausePlayer();
        player.removePlayBackListener();

        setIsPlaying(false);
      } catch (err) {
        console.warn('[AudioPlayer] pausePlayer failed:', err);
      }
    } else {
      try {
        player.setSubscriptionDuration(0.1);

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
        });

        if (elapsedRef.current > 0) {
          await player.resumePlayer();
        } else {
          await player.startPlayer(audioPath, {
            AVAudioSessionCategoryKey: 'AVAudioSessionCategoryPlayback',
            AVAudioSessionModeKey: 'AVAudioSessionModeDefault',
            AVAudioSessionCategoryOptionKey: 'AVAudioSessionCategoryOptionDefaultToSpeaker',
          });
        }
        setIsPlaying(true);
      } catch (err) {
        console.warn('[AudioPlayer] resumePlayer failed:', err);
      }
    }
  };

  const handleRestart = async () => {
    await stopAndReset();
  };

  const handleTrackPress = async (e: GestureResponderEvent) => {
    if (trackWidth === 0 || totalMs === 0 || !audioPath) {
      return;
    }

    const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / trackWidth));
    const seekMs = Math.floor(ratio * totalMs);

    try {
      await player.seekToPlayer(seekMs);

      setElapsed(Math.floor(seekMs / 1000));
      elapsedRef.current = Math.floor(seekMs / 1000);
    } catch (err) {
      console.warn('[AudioPlayer] seekToPlayer failed:', err);
    }
  };

  useEffect(() => {
    return () => {
      player.removePlayBackListener();
      player.removePlaybackEndListener();
      player.stopPlayer().catch(() => {});
    };
  }, []);

  const fillWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const hasAudio = Boolean(audioPath);

  return (
    <View
      className="flex-row items-center gap-3 rounded-2xl p-4"
      style={{ backgroundColor: color.background.card }}
    >
      <Button
        iconOnly
        size="lg"
        variant="icon"
        icon={
          isPlaying ? (
            <Pause size={20} color={color.icon.onAccent} strokeWidth={2.5} />
          ) : (
            <Play
              size={20}
              color={hasAudio ? color.icon.onAccent : color.text.secondary}
              strokeWidth={2.5}
              fill={hasAudio ? color.icon.onAccent : color.text.secondary}
            />
          )
        }
        color={color}
        onPress={handlePlayPause}
        activeOpacity={0.85}
        disabled={!hasAudio}
        containerStyle={{
          backgroundColor: hasAudio ? color.accent.primary : color.background.tertiary,
        }}
      />

      <View className="flex-1 gap-1.5">
        <View
          className="h-1 justify-center overflow-visible rounded-sm"
          style={{ backgroundColor: color.background.tertiary }}
          onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => hasAudio}
          onResponderGrant={handleTrackPress}
        >
          <Animated.View
            className="absolute left-0 top-0 h-1 rounded-sm"
            style={{
              width: fillWidth,
              backgroundColor: hasAudio ? color.accent.primary : color.background.tertiary,
            }}
          />
          <Animated.View
            className="absolute -top-1 h-3 w-3 rounded-full shadow-sm"
            style={{
              backgroundColor: hasAudio ? color.accent.primary : 'transparent',
              left: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, trackWidth - 12],
              }),
            }}
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
      <Button
        iconOnly
        size="sm"
        icon={
          <RotateCcw
            size={18}
            color={hasAudio ? color.text.secondary : color.background.tertiary}
            strokeWidth={2}
          />
        }
        onPress={handleRestart}
        activeOpacity={0.7}
        disabled={!hasAudio}
        containerStyle={{ backgroundColor: 'transparent' }}
      />
    </View>
  );
};
