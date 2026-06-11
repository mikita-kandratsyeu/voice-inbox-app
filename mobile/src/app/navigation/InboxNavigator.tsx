import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import {
  AiOrganizeArchiveReviewScreen,
  AiOrganizeFoldersCleanupReviewScreen,
  AutoOrganizeReviewScreen,
  InboxScreen,
} from '@/screens/inbox';

import type { InboxStackParamList } from './types';

const Stack = createNativeStackNavigator<InboxStackParamList>();

export const InboxNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InboxHome" component={InboxScreen} />
      <Stack.Screen
        name="AutoOrganizeReview"
        component={AutoOrganizeReviewScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="AiOrganizeFoldersCleanupReview"
        component={AiOrganizeFoldersCleanupReviewScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="AiOrganizeArchiveReview"
        component={AiOrganizeArchiveReviewScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
};
