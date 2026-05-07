import type { NavigatorScreenParams } from '@react-navigation/native';

import type { VoiceRecord } from '@/entities/record';

export type BottomTabParamList = {
  Inbox: undefined;
  Record: undefined;
  SettingsRoot: NavigatorScreenParams<SettingsStackParamList> | undefined;
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
  Main:
    | undefined
    | { screen: 'SettingsRoot'; params?: NavigatorScreenParams<SettingsStackParamList> };
  RecordModal: undefined;
  TextNoteModal: undefined;
  RecordingDetail: { record: VoiceRecord };
  RecordingAskAI: { record: VoiceRecord };
  WhisperModelPickerRoot: undefined;
  EditTranscript: { record: VoiceRecord };
  AllTasks: { recordId?: string } | undefined;
};

export type SettingsStackParamList = {
  Settings: { openPlanPaywall?: boolean } | undefined;
  Appearance: undefined;
  AIModelPicker: undefined;
  PrivateAiMode: undefined;
  AiSettings: undefined;
  AiUsageDashboard: undefined;
  Digest: undefined;
  WhisperModelPicker: undefined;
  StorageDetails: undefined;
  AboutApp: undefined;
  Support: undefined;
  AppLockSetup: undefined;
  ImportRecords: { records: VoiceRecord[] };
};
