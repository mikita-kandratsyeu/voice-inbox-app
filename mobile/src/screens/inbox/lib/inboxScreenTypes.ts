import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type {
  BottomTabParamList,
  InboxStackParamList,
  RootStackParamList,
} from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';

export const INBOX_RECORD_PAGE_SIZE = 48;

export type FlattenedItem =
  | { type: 'header'; title: string; isFirst: boolean }
  | { type: 'record'; item: VoiceRecord };

export type InboxNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, 'Inbox'>,
  CompositeNavigationProp<
    NativeStackNavigationProp<InboxStackParamList>,
    NativeStackNavigationProp<RootStackParamList>
  >
>;
