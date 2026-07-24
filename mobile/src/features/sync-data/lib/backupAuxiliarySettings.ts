import type { RemoteSyncAuxiliaryData } from '@/features/git-remote-sync/lib/applyRemoteSyncAuxiliaryData';
import {
  buildRemoteSyncAiSettings,
  parseRemoteSyncAiSettings,
} from '@/features/git-remote-sync/lib/remoteSyncAiSettings';
import {
  buildRemoteSyncPrivateProfiles,
  parseRemoteSyncPrivateProfiles,
} from '@/features/git-remote-sync/lib/remoteSyncPrivateProfiles';
import { NitroFS } from '@/shared/lib/fs';

export const BACKUP_AI_SETTINGS_FILENAME = 'ai-settings.json';
export const BACKUP_PRIVATE_REMOTE_PROFILES_FILENAME = 'private-remote-profiles.json';

export function buildBackupAuxiliarySettingsFiles(): Map<string, string> {
  const files = new Map<string, string>();
  files.set(BACKUP_AI_SETTINGS_FILENAME, JSON.stringify(buildRemoteSyncAiSettings(), null, 2));
  files.set(
    BACKUP_PRIVATE_REMOTE_PROFILES_FILENAME,
    JSON.stringify(buildRemoteSyncPrivateProfiles(), null, 2),
  );
  return files;
}

export async function readBackupAuxiliarySettings(
  extractDir: string,
): Promise<RemoteSyncAuxiliaryData> {
  const readOptionalJson = async (filename: string): Promise<unknown | null> => {
    const path = `${extractDir.replace(/\/+$/, '')}/${filename}`;
    const exists = await NitroFS.exists(path);
    if (!exists) {
      return null;
    }
    const raw = await NitroFS.readFile(path, 'utf8');
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  };

  const [aiSettingsRaw, privateProfilesRaw] = await Promise.all([
    readOptionalJson(BACKUP_AI_SETTINGS_FILENAME),
    readOptionalJson(BACKUP_PRIVATE_REMOTE_PROFILES_FILENAME),
  ]);

  return {
    aiSettings: aiSettingsRaw ? parseRemoteSyncAiSettings(aiSettingsRaw) : null,
    privateRemoteProfiles: privateProfilesRaw
      ? parseRemoteSyncPrivateProfiles(privateProfilesRaw)
      : null,
  };
}
