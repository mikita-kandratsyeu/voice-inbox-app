import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { RecordScreen } from '@/screens/record';

import { BottomTabNavigator } from './BottomTabNavigator';

export type RootStackParamList = {
  Main: undefined;
  RecordModal: undefined;
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
  </Stack.Navigator>
);
