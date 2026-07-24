import {
  applyRemoteSyncAiSettings,
  type RemoteSyncAiSettingsPayload,
} from './remoteSyncAiSettings';
import {
  applyRemoteSyncPrivateProfiles,
  type RemoteSyncPrivateProfilesPayload,
} from './remoteSyncPrivateProfiles';

export type RemoteSyncAuxiliaryData = {
  aiSettings: RemoteSyncAiSettingsPayload | null;
  privateRemoteProfiles: RemoteSyncPrivateProfilesPayload | null;
};

export function applyRemoteSyncAuxiliaryData(data: RemoteSyncAuxiliaryData): void {
  if (data.privateRemoteProfiles && data.privateRemoteProfiles.profiles.length > 0) {
    applyRemoteSyncPrivateProfiles(data.privateRemoteProfiles);
  }
  if (data.aiSettings) {
    applyRemoteSyncAiSettings(data.aiSettings);
  }
}
