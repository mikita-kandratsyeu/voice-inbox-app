import { X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderIconButton } from '@/shared/ui';

import type { RecordingState } from '../config';
import { getHeaderTitle } from '../config';

type RecordScreenHeaderProps = {
  state: RecordingState;
  onClose: () => void;
};

export const RecordScreenHeader = ({ state, onClose }: RecordScreenHeaderProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  /** Same vertical rhythm as `RecordingDetailHeader` / `TextNoteScreen` (insets + 12). */
  const topStyle = { paddingTop: insets.top + 12 };
  const dotColor = state === 'recording' ? '#ef4444' : 'rgba(255,255,255,0.72)';

  return (
    <View className="flex-row items-center justify-between px-5 pb-3" style={topStyle}>
      <HeaderIconButton
        iconOnly
        size="md"
        icon={<X size={22} color="#ffffff" strokeWidth={2.5} />}
        onPress={onClose}
        activeOpacity={0.7}
        containerStyle={{
          backgroundColor: 'rgba(255,255,255,0.24)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.18)',
        }}
        accessibilityLabel={t('record.closeRecorder')}
        accessibilityHint={t('record.closeRecorderHint')}
      />
      <View
        className="flex-row items-center gap-2 rounded-full px-4 py-2"
        style={{
          backgroundColor: 'rgba(255,255,255,0.17)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.16)',
        }}
      >
        <View
          className="h-2.5 w-2.5 rounded-full"
          style={{
            backgroundColor: dotColor,
            borderWidth: state === 'recording' ? 1.5 : 0,
            borderColor: 'rgba(255,255,255,0.88)',
          }}
        />
        <Text className="text-[14px] font-semibold tracking-wide text-white">
          {getHeaderTitle(state)}
        </Text>
      </View>
      <View className="w-11" />
    </View>
  );
};
