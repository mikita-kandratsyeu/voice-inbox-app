import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { InboxFiltersResetProvider } from '@/features/inbox-filters';
import { AllTasksScreen } from '@/screens/all-tasks';
import { DebugScreen } from '@/screens/debug';
import { InAppEventDetailScreen } from '@/screens/in-app-event';
import { NotesGraphScreen } from '@/screens/notes-graph';
import { RecordScreen, TextNoteScreen } from '@/screens/record';
import {
  AskAIScreen,
  EditTranscriptScreen,
  RecordingDetailScreen,
} from '@/screens/recording-detail';
import { WhisperModelPickerScreen } from '@/screens/settings';
import { isTestflightInternalBuild } from '@/shared/config/buildEnv';

import { BottomTabNavigator } from './BottomTabNavigator';
import type { RootStackParamList } from './types';

const showDebugNavigation = __DEV__ || isTestflightInternalBuild();

const Stack = createNativeStackNavigator<RootStackParamList>();

const RecordScreenWithProvider = () => (
  <BottomSheetModalProvider>
    <RecordScreen />
  </BottomSheetModalProvider>
);

const AskAIScreenKeyed = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'RecordingAskAI'>>();
  return <AskAIScreen key={route.params.record.id} />;
};

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
        name="TextNoteModal"
        component={TextNoteScreen}
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
      <Stack.Screen
        name="RecordingAskAI"
        component={AskAIScreenKeyed}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="WhisperModelPickerRoot"
        component={WhisperModelPickerScreen}
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
      <Stack.Screen
        name="NotesGraph"
        component={NotesGraphScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="InAppEventDetail"
        component={InAppEventDetailScreen}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
          gestureEnabled: false,
        }}
      />
      {showDebugNavigation ? (
        <Stack.Screen
          name="Debug"
          component={DebugScreen}
          options={{
            headerShown: false,
            animation: 'slide_from_right',
            gestureEnabled: true,
          }}
        />
      ) : null}
    </Stack.Navigator>
  </InboxFiltersResetProvider>
);
