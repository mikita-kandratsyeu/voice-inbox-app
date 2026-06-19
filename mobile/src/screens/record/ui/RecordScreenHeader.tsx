import { X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/shared/config';
import {
  FROSTED_HEADER_ICON_RADIUS,
  FROSTED_HEADER_ICON_SIZE,
  FrostedChromeSurface,
  FrostedHeaderIconButton,
} from '@/shared/ui';

import type { RecordingState } from '../config';
import { getHeaderTitle } from '../config';

type RecordScreenHeaderProps = {
  state: RecordingState;
  onClose: () => void;
};

export const RecordScreenHeader = ({ state, onClose }: RecordScreenHeaderProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const color = useColors();
  /** Same vertical rhythm as `RecordingDetailHeader` / `TextNoteScreen` (insets + 12). */
  const topStyle = { paddingTop: insets.top + 12 };
  const dotColor = state === 'recording' ? '#ef4444' : 'rgba(255,255,255,0.72)';

  return (
    <View className="flex-row items-center px-5 pb-3" style={topStyle}>
      <View style={{ width: FROSTED_HEADER_ICON_SIZE }}>
        <FrostedHeaderIconButton
          chromeVariant="onMedia"
          iconOnly
          size="md"
          icon={<X size={22} color="#ffffff" strokeWidth={2.5} />}
          color={color}
          onPress={onClose}
          activeOpacity={0.7}
          accessibilityLabel={t('record.closeRecorder')}
          accessibilityHint={t('record.closeRecorderHint')}
        />
      </View>
      <View className="min-w-0 flex-1 items-center px-2">
        <FrostedChromeSurface
          color={color}
          borderRadius={FROSTED_HEADER_ICON_RADIUS}
          shadow="subtle"
          variant="onMedia"
        >
          <View
            style={{
              height: FROSTED_HEADER_ICON_SIZE,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 14,
            }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: dotColor,
                borderWidth: state === 'recording' ? 1.5 : 0,
                borderColor: 'rgba(255,255,255,0.88)',
              }}
            />
            <Text className="text-[13px] font-semibold tracking-wide text-white" numberOfLines={1}>
              {getHeaderTitle(state)}
            </Text>
          </View>
        </FrostedChromeSurface>
      </View>
      <View style={{ width: FROSTED_HEADER_ICON_SIZE }} />
    </View>
  );
};
