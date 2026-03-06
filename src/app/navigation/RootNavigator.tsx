import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import type { VoiceRecord } from '@/entities/record';
import { RecordScreen } from '@/screens/record';
import { RecordingDetailScreen } from '@/screens/recording-detail';

import { BottomTabNavigator } from './BottomTabNavigator';

export type RootStackParamList = {
  Main: undefined;
  RecordModal: undefined;
  RecordingDetail: { record: VoiceRecord };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen name="Main" component={BottomTabNavigator} options={{ headerShown: false }} />
    <Stack.Screen
      name="RecordModal"
      component={RecordScreen}
      options={{
        headerShown: false,
        presentation: 'fullScreenModal',
        animation: 'slide_from_bottom',
        gestureEnabled: true,
      }}
    />
    <Stack.Screen
      name="RecordingDetail"
      component={RecordingDetailScreen}
      options={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    />
  </Stack.Navigator>
);
