import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useRecordStore } from '@/entities/record';
import { hasAnyActiveTranscriptionJob } from '@/features/transcription/model/transcriptionJobRegistry';
import { hapticLight } from '@/shared/lib';
import { RecordVoiceIcon } from '@/shared/ui';

import type { RootStackParamList } from '../types';

type CenterRecordButtonProps = {
  iconColor: string;
  accentColor: string;
  isTablet?: boolean;
  onLongPress?: () => void;
};

export const CenterRecordButton = ({
  iconColor,
  accentColor,
  isTablet,
  onLongPress,
}: CenterRecordButtonProps) => {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const breath = useSharedValue(0);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const activeTranscriptionRecord = useRecordStore((s) =>
    s.records.find((r) => r.aiStatus === 'loading_model' || r.aiStatus === 'processing'),
  );

  useEffect(() => {
    breath.value = withRepeat(
      withTiming(1, {
        duration: 2100,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [breath]);

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 12, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  };

  const animatedStyle = useAnimatedStyle(() => {
    const breathScale = 1 + 0.055 * breath.value;
    return {
      transform: [{ scale: scale.value * breathScale }],
      shadowOpacity: 0.26 + 0.2 * breath.value,
      shadowRadius: 6 + 5 * breath.value,
    };
  });

  const handlePress = () => {
    if (hasAnyActiveTranscriptionJob()) {
      Alert.alert(
        t('record.blockedByTranscriptionTitle'),
        t('record.blockedByTranscriptionMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.open'),
            onPress: () => {
              if (activeTranscriptionRecord) {
                navigation.navigate('RecordingDetail', { record: activeTranscriptionRecord });
              }
            },
          },
        ],
      );
      return;
    }

    hapticLight();
    navigation.navigate('RecordModal');
  };

  return (
    <View className="min-h-[48px] shrink-0 self-stretch items-center justify-center">
      <Animated.View
        style={[
          {
            width: isTablet ? 88 : 72,
            height: isTablet ? 52 : 46,
            borderRadius: isTablet ? 16 : 14,
            backgroundColor: accentColor,
            shadowColor: accentColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 6,
          },
          animatedStyle,
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('tabs.record')}
          accessibilityHint={onLongPress ? t('inbox.emptyImportHint') : undefined}
          activeOpacity={1}
          onPress={handlePress}
          onLongPress={onLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={{
            width: isTablet ? 88 : 72,
            height: isTablet ? 52 : 46,
            borderRadius: isTablet ? 16 : 14,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RecordVoiceIcon size={isTablet ? 28 : 24} color={iconColor} strokeWidth={2.25} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};
