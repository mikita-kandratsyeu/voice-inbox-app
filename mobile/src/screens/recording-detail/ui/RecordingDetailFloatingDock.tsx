import React, { memo } from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import {
  FLOATING_DETAIL_DOCK_HORIZONTAL_INSET,
  FLOATING_DETAIL_DOCK_INNER_BOTTOM_PAD,
  FLOATING_DETAIL_DOCK_INNER_TOP_PAD,
  FLOATING_FROSTED_INPUT_HORIZONTAL_PAD,
  FloatingFrostedChrome,
} from '@/shared/ui';
import {
  type AudioPlaybackState,
  AudioPlayerChrome,
  type AudioPlayerRef,
} from '@/widgets/audio-player';

type RecordingDetailFloatingDockProps = {
  visible: boolean;
  color: Colors;
  safeAreaBottom: number;
  contentMaxWidth: number | undefined;
  duration: string;
  playbackState: AudioPlaybackState;
  audioPlayerRef: React.RefObject<AudioPlayerRef | null>;
  progressValue: SharedValue<number> | undefined;
  trackWidthValue: SharedValue<number> | undefined;
  elapsedMsValue: SharedValue<number> | undefined;
};

const RecordingDetailFloatingDockInner = ({
  visible,
  color,
  safeAreaBottom,
  contentMaxWidth,
  duration,
  playbackState,
  audioPlayerRef,
  progressValue,
  trackWidthValue,
  elapsedMsValue,
}: RecordingDetailFloatingDockProps) => {
  if (!visible) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
      }}
    >
      <View
        style={{
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth ?? '100%',
        }}
      >
        <FloatingFrostedChrome
          color={color}
          insetsBottom={safeAreaBottom}
          horizontalInset={FLOATING_DETAIL_DOCK_HORIZONTAL_INSET}
          topInset={8}
        >
          <View
            style={{
              paddingTop: FLOATING_DETAIL_DOCK_INNER_TOP_PAD,
              paddingBottom: FLOATING_DETAIL_DOCK_INNER_BOTTOM_PAD,
              paddingHorizontal: FLOATING_FROSTED_INPUT_HORIZONTAL_PAD,
            }}
          >
            <AudioPlayerChrome
              color={color}
              duration={duration}
              hasAudio
              isPlaying={playbackState.isPlaying}
              elapsedMsValue={elapsedMsValue}
              embedded
              density="compact"
              playbackSpeed={playbackState.playbackSpeed}
              progressValue={progressValue}
              trackWidthValue={trackWidthValue}
              onPlayPause={() => void audioPlayerRef.current?.togglePlayPause()}
              onSkipBack={() => void audioPlayerRef.current?.skipBack()}
              onSkipForward={() => void audioPlayerRef.current?.skipForward()}
              onSkipBackHold={() => audioPlayerRef.current?.beginSkipBackHold()}
              onSkipForwardHold={() => audioPlayerRef.current?.beginSkipForwardHold()}
              onSkipHoldEnd={() => audioPlayerRef.current?.clearSkipHoldTimers()}
              onCycleSpeed={() => audioPlayerRef.current?.cycleSpeed()}
              onRestart={() => void audioPlayerRef.current?.restart()}
              onScrubStart={() => void audioPlayerRef.current?.beginScrub()}
              onScrubChange={(progress) => audioPlayerRef.current?.scrubToProgress(progress)}
              onScrubEnd={(progress) => void audioPlayerRef.current?.endScrub(progress)}
            />
          </View>
        </FloatingFrostedChrome>
      </View>
    </View>
  );
};

export const RecordingDetailFloatingDock = memo(RecordingDetailFloatingDockInner);
