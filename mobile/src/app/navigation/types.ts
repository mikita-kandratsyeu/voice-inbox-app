import type { VoiceRecord } from '@/entities/record';

export type BottomTabParamList = {
  Inbox: undefined;
  Record: undefined;
  SettingsRoot: undefined;
};

export type InboxStackParamList = {
  InboxHome: undefined;
  AutoOrganizeReview: {
    result: {
      folders: Array<{ name: string; icon: string; color: string }>;
      assignments: Array<{ recordId: string; folderName: string }>;
    };
  };
};

export type RootStackParamList = {
  Main: undefined | { screen: 'SettingsRoot'; params: { screen: 'WhisperModelPicker' } };
  RecordModal: undefined;
  RecordingDetail: { record: VoiceRecord };
  WhisperModelPickerRoot: undefined;
  EditTranscript: { record: VoiceRecord };
  AllTasks: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  Appearance: undefined;
  AIModelPicker: undefined;
  AiSettings: undefined;
  WhisperModelPicker: undefined;
  StorageDetails: undefined;
  AboutApp: undefined;
  Support: undefined;
  AppLockSetup: undefined;
  ImportRecords: { records: VoiceRecord[] };
};
