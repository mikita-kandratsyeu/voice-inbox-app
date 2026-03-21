import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { InboxFiltersResetProvider } from '@/features/inbox-filters';
import { AllTasksScreen } from '@/screens/all-tasks';
import { RecordScreen } from '@/screens/record';
import { EditTranscriptScreen, RecordingDetailScreen } from '@/screens/recording-detail';

import { BottomTabNavigator } from './BottomTabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RecordScreenWithProvider = () => (
  <BottomSheetModalProvider>
    <RecordScreen />
  </BottomSheetModalProvider>
);

export const RootNavigator = () => (
  <InboxFiltersResetProvider>
    <Stack.Navigator>
      <Stack.Screen name="Main" component={BottomTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="RecordModal"
        component={RecordScreenWithProvider}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
          gestureEnabled: false,
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
      <Stack.Screen
        name="EditTranscript"
        component={EditTranscriptScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="AllTasks"
        component={AllTasksScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  </InboxFiltersResetProvider>
);
