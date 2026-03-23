import { Check, Pause, Play } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/shared/config';
import { hapticSelection, hapticSuccess } from '@/shared/lib';

import type { RecordingState } from '../config';
import { PAUSE_BTN_BG } from '../config';

type RecordScreenControlsProps = {
  state: RecordingState;
  onPauseResume: () => void;
  onDonePress: () => void;
};

export const RecordScreenControls = ({
  state,
  onPauseResume,
  onDonePress,
}: RecordScreenControlsProps) => {
  const { t } = useTranslation();
  const c = useColors();

  const insets = useSafeAreaInsets();
  const controlsPaddingBottom = { paddingBottom: Math.max(insets.bottom, 36) };

  const isIdle = state === 'idle';
  const isPaused = state === 'paused';

  return (
    <View
      className="flex-row items-center justify-center gap-10 pt-4"
      style={controlsPaddingBottom}
    >
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => {
          hapticSelection();
          onPauseResume();
        }}
        className="h-16 w-16 items-center justify-center rounded-full"
        style={{
          backgroundColor: PAUSE_BTN_BG,
          opacity: isIdle ? 0.35 : 1,
        }}
        activeOpacity={0.75}
        disabled={isIdle}
        accessibilityLabel={isPaused ? t('record.resume') : t('record.paused')}
      >
        {isPaused ? (
          <Play size={24} color={c.icon.onAccent} strokeWidth={2} />
        ) : (
          <Pause size={24} color={c.icon.onAccent} strokeWidth={2} />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => {
          hapticSuccess();
          onDonePress();
        }}
        className="h-20 w-20 items-center justify-center rounded-full shadow-lg"
        style={{
          backgroundColor: c.icon.onAccent,
          opacity: isIdle ? 0.35 : 1,
        }}
        activeOpacity={0.85}
        disabled={isIdle}
        accessibilityLabel={t('record.finish')}
      >
        <Check size={30} color={c.accent.primary} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
};
