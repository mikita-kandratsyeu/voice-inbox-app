import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { InboxFiltersResetProvider } from '@/features/inbox-filters';
import { AllTasksScreen } from '@/screens/all-tasks';
import { DebugScreen } from '@/screens/debug';
import { InAppEventDetailScreen } from '@/screens/in-app-event';
import { InboxAskAIScreen } from '@/screens/inbox-ask/ui/InboxAskAIScreen';
import { NotesGraphScreen } from '@/screens/notes-graph';
import { RecordScreen, TextNoteScreen } from '@/screens/record';
import {
  AskAIScreen,
  EditTranscriptScreen,
  NoteDocumentScreen,
  RecordingDetailScreen,
} from '@/screens/recording-detail';
import { WhisperModelPickerScreen } from '@/screens/settings';
import { isTestflightInternalBuild } from '@/shared/config/buildEnv';

import { BottomTabNavigator } from './BottomTabNavigator';
import { CARD_PUSH_OPTIONS, MODAL_STACK_OPTIONS, ROOT_STACK_DEFAULTS } from './screenOptions';
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
    <Stack.Navigator screenOptions={ROOT_STACK_DEFAULTS}>
      <Stack.Screen name="Main" component={BottomTabNavigator} />
      <Stack.Screen
        name="RecordModal"
        component={RecordScreenWithProvider}
        options={{
          ...MODAL_STACK_OPTIONS,
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />
      <Stack.Screen name="TextNoteModal" component={TextNoteScreen} options={MODAL_STACK_OPTIONS} />
      <Stack.Screen
        name="RecordingDetail"
        component={RecordingDetailScreen}
        options={CARD_PUSH_OPTIONS}
      />
      <Stack.Screen
        name="RecordingAskAI"
        component={AskAIScreenKeyed}
        options={CARD_PUSH_OPTIONS}
      />
      <Stack.Screen name="InboxAskAI" component={InboxAskAIScreen} options={CARD_PUSH_OPTIONS} />
      <Stack.Screen
        name="WhisperModelPickerRoot"
        component={WhisperModelPickerScreen}
        options={CARD_PUSH_OPTIONS}
      />
      <Stack.Screen
        name="EditTranscript"
        component={EditTranscriptScreen}
        options={CARD_PUSH_OPTIONS}
      />
      <Stack.Screen
        name="NoteDocument"
        component={NoteDocumentScreen}
        options={MODAL_STACK_OPTIONS}
      />
      <Stack.Screen name="AllTasks" component={AllTasksScreen} options={CARD_PUSH_OPTIONS} />
      <Stack.Screen
        name="NotesGraph"
        component={NotesGraphScreen}
        options={{
          ...CARD_PUSH_OPTIONS,
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="InAppEventDetail"
        component={InAppEventDetailScreen}
        options={{
          ...MODAL_STACK_OPTIONS,
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />
      {showDebugNavigation ? (
        <Stack.Screen name="Debug" component={DebugScreen} options={CARD_PUSH_OPTIONS} />
      ) : null}
    </Stack.Navigator>
  </InboxFiltersResetProvider>
);
