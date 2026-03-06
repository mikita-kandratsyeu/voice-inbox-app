import { Pause, Play, RotateCcw } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';

type AudioPlayerProps = {
  duration: string;
  color: Colors;
};

const parseDuration = (d: string): number => {
  const parts = d.split(':');
  if (parts.length !== 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const AudioPlayer = ({ duration, color }: AudioPlayerProps) => {
  const totalSeconds = parseDuration(duration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const progress = totalSeconds > 0 ? elapsed / totalSeconds : 0;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev >= totalSeconds) {
            setIsPlaying(false);
            return totalSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, totalSeconds]);

  const handlePlayPause = () => {
    if (elapsed >= totalSeconds) {
      setElapsed(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  const handleRestart = () => {
    setElapsed(0);
    setIsPlaying(false);
    progressAnim.setValue(0);
  };

  const trackWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { backgroundColor: color.background.card }]}>
      <TouchableOpacity
        onPress={handlePlayPause}
        style={[styles.playBtn, { backgroundColor: color.accent.primary }]}
        activeOpacity={0.85}
      >
        {isPlaying ? (
          <Pause size={20} color={color.icon.onAccent} strokeWidth={2.5} />
        ) : (
          <Play
            size={20}
            color={color.icon.onAccent}
            strokeWidth={2.5}
            fill={color.icon.onAccent}
          />
        )}
      </TouchableOpacity>

      <View style={styles.trackWrapper}>
        <View style={[styles.trackBg, { backgroundColor: color.background.tertiary }]}>
          <Animated.View
            style={[styles.trackFill, { width: trackWidth, backgroundColor: color.accent.primary }]}
          />
        </View>
        <View style={styles.timesRow}>
          <Text style={[styles.timeText, { color: color.text.secondary }]}>
            {formatTime(elapsed)}
          </Text>
          <Text style={[styles.timeText, { color: color.text.secondary }]}>{duration}</Text>
        </View>
      </View>

      <TouchableOpacity onPress={handleRestart} style={styles.restartBtn} activeOpacity={0.7}>
        <RotateCcw size={18} color={color.text.secondary} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackWrapper: {
    flex: 1,
    gap: 6,
  },
  trackBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
  },
  timesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  restartBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
