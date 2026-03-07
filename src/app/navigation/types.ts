import type { VoiceRecord } from '@/entities/record';

export type BottomTabParamList = {
  Inbox: undefined;
  Record: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  RecordModal: undefined;
  RecordingDetail: { record: VoiceRecord };
};
