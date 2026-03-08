import { Check, Mic, Pause, Play } from 'lucide-react-native';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RecordingState } from '../config';
import { ACCENT_BLUE, DONE_BTN_BG, PAUSE_BTN_BG } from '../config';

type RecordScreenControlsProps = {
  state: RecordingState;
  onMicPress: () => void;
  onPauseResume: () => void;
  onDonePress: () => void;
};

export const RecordScreenControls = ({
  state,
  onMicPress,
  onPauseResume,
  onDonePress,
}: RecordScreenControlsProps) => {
  const insets = useSafeAreaInsets();
  const controlsPaddingBottom = { paddingBottom: Math.max(insets.bottom, 32) };

  return (
    <View className="flex-row items-center justify-center gap-6 pt-4" style={controlsPaddingBottom}>
      {state === 'idle' ? (
        <TouchableOpacity
          onPress={onMicPress}
          className="h-[72px] w-[72px] items-center justify-center rounded-full shadow-lg"
          style={{ backgroundColor: DONE_BTN_BG }}
          activeOpacity={0.85}
        >
          <Mic size={30} color={ACCENT_BLUE} strokeWidth={2} />
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity
            onPress={onPauseResume}
            className="h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: PAUSE_BTN_BG }}
            activeOpacity={0.8}
          >
            {state === 'paused' ? (
              <Play size={22} color="#ffffff" strokeWidth={2} />
            ) : (
              <Pause size={22} color="#ffffff" strokeWidth={2} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDonePress}
            className="h-[68px] w-[68px] items-center justify-center rounded-full shadow-lg"
            style={{ backgroundColor: DONE_BTN_BG }}
            activeOpacity={0.85}
          >
            <Check size={26} color={ACCENT_BLUE} strokeWidth={2.5} />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};
