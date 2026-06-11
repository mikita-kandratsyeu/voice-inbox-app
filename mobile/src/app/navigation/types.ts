import type { NavigatorScreenParams } from '@react-navigation/native';

import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';

export type BottomTabParamList = {
  Inbox: undefined;
  Record: undefined;
  SettingsRoot: NavigatorScreenParams<SettingsStackParamList> | undefined;
};

import type {
  AutoOrganizeArchiveResult,
  AutoOrganizeConsolidateResult,
  AutoOrganizeFoldersResult,
  AutoOrganizeTemplate,
} from '@/entities/folder/lib/autoOrganizeTypes';

export type InboxStackParamList = {
  InboxHome: undefined;
  AutoOrganizeReview: {
    result: AutoOrganizeFoldersResult;
    mode: 'full' | 'assign_existing';
    template: AutoOrganizeTemplate;
  };
  AiOrganizeFoldersCleanupReview: {
    result: AutoOrganizeConsolidateResult;
  };
  AiOrganizeArchiveReview: {
    result: AutoOrganizeArchiveResult;
  };
};

export type RootStackParamList = {
  Main: undefined | NavigatorScreenParams<BottomTabParamList>;
  RecordModal: undefined;
  TextNoteModal: undefined;
  RecordingDetail: { record: VoiceRecord };
  RecordingAskAI: { record: VoiceRecord };
  WhisperModelPickerRoot: undefined;
  EditTranscript: { record: VoiceRecord };
  AllTasks: { recordId?: string } | undefined;
  NotesGraph: { folderId?: string; tag?: string } | undefined;
  InAppEventDetail: { eventId: string };
  Debug: undefined;
};

export type SettingsStackParamList = {
  Settings: { openPlanPaywall?: boolean } | undefined;
  Appearance: undefined;
  AIModelPicker: undefined;
  PrivateAiMode: undefined;
  AiSettings: { focusPrivateServer?: boolean } | undefined;
  PrivateRemoteServer: undefined;
  AiUsageDashboard: undefined;
  SiriShortcuts: undefined;
  Digest: undefined;
  WhisperModelPicker: undefined;
  StorageDetails: undefined;
  Trash: undefined;
  AboutApp: undefined;
  Support: undefined;
  AppLockSetup: undefined;
  Notifications: undefined;
  ImportRecords: {
    records: VoiceRecord[];
    folders?: Folder[];
    legacyFolders?: Folder[];
    graphLayouts?: import('@/features/sync-data').BackupGraphLayoutVersion[];
    githubRestore?: {
      commitSha: string;
      exportedAt: string;
    };
  };
  DiagnosticLogs: undefined;
  GithubSync: undefined;
  BackupRestore: undefined;
};
