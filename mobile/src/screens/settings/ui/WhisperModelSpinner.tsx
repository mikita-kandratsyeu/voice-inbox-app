import React from 'react';
import { ActivityIndicator, View } from 'react-native';

type WhisperModelSpinnerProps = {
  color: string;
  size?: number;
};

export const WhisperModelSpinner = ({ color, size = 18 }: WhisperModelSpinnerProps) => {
  const scale = size / 20;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="small" color={color} style={{ transform: [{ scale }] }} />
    </View>
  );
};
