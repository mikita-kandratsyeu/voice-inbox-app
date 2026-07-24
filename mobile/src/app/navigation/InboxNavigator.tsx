import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import {
  AiOrganizeArchiveReviewScreen,
  AiOrganizeFoldersCleanupReviewScreen,
  AutoOrganizeReviewScreen,
  InboxScreen,
} from '@/screens/inbox';

import { CARD_PUSH_OPTIONS, NESTED_STACK_DEFAULTS } from './screenOptions';
import type { InboxStackParamList } from './types';

const Stack = createNativeStackNavigator<InboxStackParamList>();

export const InboxNavigator = () => {
  return (
    <Stack.Navigator screenOptions={NESTED_STACK_DEFAULTS}>
      <Stack.Screen name="InboxHome" component={InboxScreen} />
      <Stack.Screen
        name="AutoOrganizeReview"
        component={AutoOrganizeReviewScreen}
        options={{ presentation: 'card', ...CARD_PUSH_OPTIONS }}
      />
      <Stack.Screen
        name="AiOrganizeFoldersCleanupReview"
        component={AiOrganizeFoldersCleanupReviewScreen}
        options={{ presentation: 'card', ...CARD_PUSH_OPTIONS }}
      />
      <Stack.Screen
        name="AiOrganizeArchiveReview"
        component={AiOrganizeArchiveReviewScreen}
        options={{ presentation: 'card', ...CARD_PUSH_OPTIONS }}
      />
    </Stack.Navigator>
  );
};
