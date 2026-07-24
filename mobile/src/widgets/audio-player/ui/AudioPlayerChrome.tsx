import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { formatTime } from '@/shared/lib';
import { IOS_MIN_TOUCH_TARGET } from '@/shared/lib/iosTouchTarget';

import { AudioPlayerElapsedText } from './AudioPlayerElapsedText';
import { AudioPlayerScrubber } from './AudioPlayerScrubber';

const SKIP_HOLD_START_MS = 400;
const THUMB_SIZE = 12;

export type AudioPlayerChromeProps = {
  color: Colors;
  duration: string;
  hasAudio: boolean;
  isPlaying: boolean;
  elapsedMsValue?: SharedValue<number>;
  /** Fallback when shared elapsed is unavailable. */
  elapsedSecs?: number;
  embedded?: boolean;
  surfaceBackgroundColor?: string;
  playbackSpeed: number;
  /** Animated progress 0–1 for the inline player. */
  progressValue?: SharedValue<number>;
  trackWidthValue?: SharedValue<number>;
  /** Static progress 0–1 for mirrored chrome (floating dock). */
  progressFraction?: number;
  onPlayPause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onSkipBackHold?: () => void;
  onSkipForwardHold?: () => void;
  onSkipHoldEnd?: () => void;
  onCycleSpeed: () => void;
  onRestart: () => void;
  onScrubStart?: () => void;
  onScrubChange?: (progress: number) => void;
  onScrubEnd?: (progress: number) => void;
  /** Tighter layout for the floating recording detail dock. */
  density?: 'default' | 'compact';
};

export function AudioPlayerChrome({
  color,
  duration,
  hasAudio,
  isPlaying,
  elapsedMsValue,
  elapsedSecs = 0,
  embedded = false,
  surfaceBackgroundColor,
  playbackSpeed,
  progressValue,
  trackWidthValue,
  progressFraction,
  onPlayPause,
  onSkipBack,
  onSkipForward,
  onSkipBackHold,
  onSkipForwardHold,
  onSkipHoldEnd,
  onCycleSpeed,
  onRestart,
  onScrubStart,
  onScrubChange,
  onScrubEnd,
  density = 'default',
}: AudioPlayerChromeProps) {
  const { t } = useTranslation();
  const speedLabel = playbackSpeed === 1 ? '1×' : `${playbackSpeed}×`;
  const isCompact = density === 'compact';
  const controlButtonSize = isCompact ? 36 : 44;
  const controlIconSize = isCompact ? 18 : 20;
  const secondaryIconSize = isCompact ? 16 : 18;
  const timeFontSize = isCompact ? 11 : 12;
  const speedFontSize = isCompact ? 12 : 13;
  const sectionGap = isCompact ? 8 : 12;
  const controlGap = isCompact ? 8 : 10;
  const thumbSize = isCompact ? 10 : THUMB_SIZE;

  return (
    <View
      className={embedded ? undefined : 'rounded-2xl'}
      style={{
        gap: sectionGap,
        backgroundColor: embedded
          ? 'transparent'
          : (surfaceBackgroundColor ?? color.background.card),
        padding: embedded ? 0 : 16,
      }}
    >
      <View style={{ gap: isCompact ? 4 : 6 }}>
        <AudioPlayerScrubber
          color={color}
          hasAudio={hasAudio}
          thumbSize={thumbSize}
          progressValue={progressValue}
          trackWidthValue={trackWidthValue}
          progressFraction={progressFraction}
          onScrubStart={onScrubStart}
          onScrubChange={onScrubChange}
          onScrubEnd={onScrubEnd}
        />
        <View className="flex-row justify-between">
          {elapsedMsValue ? (
            <AudioPlayerElapsedText
              elapsedMsValue={elapsedMsValue}
              color={color.text.secondary}
              fontSize={timeFontSize}
            />
          ) : (
            <Text
              className="font-medium tabular-nums"
              style={{ fontSize: timeFontSize, color: color.text.secondary }}
            >
              {formatTime(elapsedSecs)}
            </Text>
          )}
          <Text
            className="font-medium tabular-nums"
            style={{ fontSize: timeFontSize, color: color.text.secondary }}
          >
            {duration}
          </Text>
        </View>
      </View>

      <View
        className="flex-row items-center justify-between"
        style={{ minHeight: isCompact ? 40 : IOS_MIN_TOUCH_TARGET }}
      >
        <View className="flex-row items-center" style={{ gap: controlGap }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('audioPlayer.skipBack')}
            onPress={onSkipBack}
            onLongPress={onSkipBackHold}
            delayLongPress={SKIP_HOLD_START_MS}
            onPressOut={onSkipHoldEnd}
            disabled={!hasAudio}
            activeOpacity={0.6}
            className="items-center justify-center rounded-full"
            style={{
              width: controlButtonSize,
              height: controlButtonSize,
              backgroundColor: hasAudio ? color.background.tertiary : 'transparent',
            }}
          >
            <ChevronLeft
              size={controlIconSize}
              color={hasAudio ? color.text.primary : color.text.muted}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? t('audioPlayer.pause') : t('audioPlayer.play')}
            onPress={onPlayPause}
            disabled={!hasAudio}
            activeOpacity={0.85}
            className="items-center justify-center rounded-full"
            style={{
              width: controlButtonSize,
              height: controlButtonSize,
              backgroundColor: hasAudio ? color.accent.primary : color.background.tertiary,
            }}
          >
            {isPlaying ? (
              <Pause
                size={controlIconSize}
                color={color.icon.onAccent}
                strokeWidth={2.5}
                fill="none"
              />
            ) : (
              <Play
                size={controlIconSize}
                color={hasAudio ? color.icon.onAccent : color.text.muted}
                strokeWidth={2.5}
                fill="none"
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('audioPlayer.skipForward')}
            onPress={onSkipForward}
            onLongPress={onSkipForwardHold}
            delayLongPress={SKIP_HOLD_START_MS}
            onPressOut={onSkipHoldEnd}
            disabled={!hasAudio}
            activeOpacity={0.6}
            className="items-center justify-center rounded-full"
            style={{
              width: controlButtonSize,
              height: controlButtonSize,
              backgroundColor: hasAudio ? color.background.tertiary : 'transparent',
            }}
          >
            <ChevronRight
              size={controlIconSize}
              color={hasAudio ? color.text.primary : color.text.muted}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center" style={{ gap: controlGap }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('audioPlayer.playbackSpeed', { speed: speedLabel })}
            onPress={onCycleSpeed}
            disabled={!hasAudio}
            activeOpacity={0.7}
            className="items-center justify-center rounded-full px-3"
            style={{
              minWidth: controlButtonSize,
              height: controlButtonSize,
              backgroundColor: hasAudio ? color.background.tertiary : 'transparent',
            }}
          >
            <Text
              className="font-semibold tabular-nums"
              style={{
                fontSize: speedFontSize,
                color: hasAudio ? color.text.primary : color.text.muted,
              }}
            >
              {speedLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('audioPlayer.restart')}
            onPress={onRestart}
            disabled={!hasAudio}
            activeOpacity={0.6}
            className="items-center justify-center rounded-full"
            style={{
              width: controlButtonSize,
              height: controlButtonSize,
              backgroundColor: hasAudio ? color.background.tertiary : 'transparent',
            }}
          >
            <RotateCcw
              size={secondaryIconSize}
              color={hasAudio ? color.text.primary : color.text.muted}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
