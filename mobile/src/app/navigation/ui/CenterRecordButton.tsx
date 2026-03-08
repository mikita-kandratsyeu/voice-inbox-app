import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Mic } from 'lucide-react-native';
import React, { useRef } from 'react';
import { Animated, TouchableOpacity, View } from 'react-native';

import type { RootStackParamList } from '../types';

type CenterRecordButtonProps = {
  iconColor: string;
  accentColor: string;
};

export const CenterRecordButton = ({ iconColor, accentColor }: CenterRecordButtonProps) => {
  const scale = useRef(new Animated.Value(1)).current;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 12,
    }).start();
  };

  const handlePress = () => {
    navigation.navigate('RecordModal');
  };

  return (
    <View className="flex-1 items-center justify-center">
      <Animated.View
        style={{
          width: 72,
          height: 46,
          borderRadius: 14,
          backgroundColor: accentColor,
          shadowColor: accentColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 6,
          transform: [{ scale }],
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={{
            width: 72,
            height: 46,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Mic size={24} color={iconColor} strokeWidth={2} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};
