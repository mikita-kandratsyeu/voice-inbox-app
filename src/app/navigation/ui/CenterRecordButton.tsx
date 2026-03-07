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
      toValue: 0.88,
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
        className="mb-[30px] h-[60px] w-[60px] rounded-full"
        style={{
          backgroundColor: accentColor,
          shadowColor: accentColor,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 10,
          transform: [{ scale }],
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          className="h-[60px] w-[60px] items-center justify-center rounded-full"
        >
          <Mic size={26} color={iconColor} strokeWidth={2} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};
