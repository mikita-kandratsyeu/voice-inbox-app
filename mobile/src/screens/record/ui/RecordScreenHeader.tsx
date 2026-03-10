import { X } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/shared/ui';

import type { RecordingState } from '../config';
import { getHeaderTitle } from '../config';

type RecordScreenHeaderProps = {
  state: RecordingState;
  onClose: () => void;
};

export const RecordScreenHeader = ({ state, onClose }: RecordScreenHeaderProps) => {
  const insets = useSafeAreaInsets();
  const topStyle = { paddingTop: Math.max(insets.top, 16) };

  return (
    <View className="flex-row items-center justify-between px-5 pb-2" style={topStyle}>
      <Button
        iconOnly
        size="md"
        icon={<X size={22} color="#ffffff" strokeWidth={2.5} />}
        onPress={onClose}
        activeOpacity={0.7}
        containerStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
      />
      <Text className="text-base font-semibold tracking-wide text-white">
        {getHeaderTitle(state)}
      </Text>
      <View className="w-10" />
    </View>
  );
};
