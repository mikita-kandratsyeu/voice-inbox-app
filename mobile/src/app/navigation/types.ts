import type { VoiceRecord } from '@/entities/record';

export type BottomTabParamList = {
  Inbox: undefined;
  Record: undefined;
  SettingsRoot: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  RecordModal: undefined;
  RecordingDetail: { record: VoiceRecord };
  EditTranscript: { record: VoiceRecord };
};

export type SettingsStackParamList = {
  Settings: undefined;
  Appearance: undefined;
  AIModelPicker: undefined;
  AiSettings: undefined;
  WhisperModelPicker: undefined;
  StorageDetails: undefined;
  AboutApp: undefined;
  AppLockSetup: undefined;
  ImportRecords: { records: VoiceRecord[] };
};
