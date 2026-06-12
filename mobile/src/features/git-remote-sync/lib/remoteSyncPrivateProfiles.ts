import dayjs from 'dayjs';

import { useSettingsStore } from '@/entities/settings';
import type { PrivateRemoteProfile } from '@/entities/settings/model/types';
import { isArray, isRecord, isString } from '@/shared/lib/type-guards';

export const REMOTE_SYNC_PRIVATE_PROFILES_VERSION = 1 as const;

export type RemoteSyncPrivateProfileEntry = {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
};

export type RemoteSyncPrivateProfilesPayload = {
  version: typeof REMOTE_SYNC_PRIVATE_PROFILES_VERSION;
  exportedAt: string;
  profiles: RemoteSyncPrivateProfileEntry[];
  activeProfileId: string | null;
};

function profileSignature(baseUrl: string, model: string): string {
  return `${baseUrl.trim().toLowerCase()}|${model.trim().toLowerCase()}`;
}

export function defaultRemoteProfileName(baseUrl: string, model: string): string {
  const trimmedModel = model.trim();
  try {
    const host = new URL(baseUrl.trim()).hostname;
    return trimmedModel.length > 0 ? `${host} · ${trimmedModel}` : host;
  } catch {
    return trimmedModel.length > 0 ? trimmedModel : baseUrl.trim();
  }
}

export function buildRemoteSyncPrivateProfiles(): RemoteSyncPrivateProfilesPayload {
  const state = useSettingsStore.getState();
  return {
    version: REMOTE_SYNC_PRIVATE_PROFILES_VERSION,
    exportedAt: dayjs().toISOString(),
    profiles: state.privateRemoteProfiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      baseUrl: profile.baseUrl,
      model: profile.model,
    })),
    activeProfileId: state.privateRemoteActiveProfileId,
  };
}

function parseProfileEntry(raw: unknown): RemoteSyncPrivateProfileEntry | null {
  if (!isRecord(raw)) return null;
  if (!isString(raw.id) || !isString(raw.baseUrl) || !isString(raw.model)) {
    return null;
  }
  const baseUrl = raw.baseUrl.trim();
  const model = raw.model.trim();
  if (!baseUrl || !model) return null;
  const name = isString(raw.name) ? raw.name.trim() : '';
  return {
    id: raw.id.trim(),
    name,
    baseUrl,
    model,
  };
}

export function parseRemoteSyncPrivateProfiles(raw: unknown): RemoteSyncPrivateProfilesPayload | null {
  if (!isRecord(raw) || raw.version !== REMOTE_SYNC_PRIVATE_PROFILES_VERSION) {
    return null;
  }
  const profilesRaw = isArray(raw.profiles) ? raw.profiles : [];
  const profiles = profilesRaw
    .map(parseProfileEntry)
    .filter((profile): profile is RemoteSyncPrivateProfileEntry => profile != null);

  return {
    version: REMOTE_SYNC_PRIVATE_PROFILES_VERSION,
    exportedAt: isString(raw.exportedAt) ? raw.exportedAt : dayjs().toISOString(),
    profiles,
    activeProfileId:
      raw.activeProfileId === null
        ? null
        : isString(raw.activeProfileId)
          ? raw.activeProfileId.trim() || null
          : null,
  };
}

export function applyRemoteSyncPrivateProfiles(payload: RemoteSyncPrivateProfilesPayload): void {
  const store = useSettingsStore.getState();
  const existingBySignature = new Map(
    store.privateRemoteProfiles.map((profile) => [
      profileSignature(profile.baseUrl, profile.model),
      profile,
    ]),
  );
  const syncedById = new Map(payload.profiles.map((profile) => [profile.id, profile]));

  for (const profile of payload.profiles) {
    const signature = profileSignature(profile.baseUrl, profile.model);
    const existing = existingBySignature.get(signature);
    const id = existing?.id ?? profile.id;
    const name =
      profile.name.length > 0 ? profile.name : defaultRemoteProfileName(profile.baseUrl, profile.model);
    const nextProfile: PrivateRemoteProfile = {
      id,
      name,
      baseUrl: profile.baseUrl,
      model: profile.model,
      apiKey: existing?.apiKey ?? '',
      updatedAt: Date.now(),
    };
    store.upsertPrivateRemoteProfile(nextProfile);
    existingBySignature.set(signature, nextProfile);
  }

  if (!payload.activeProfileId) {
    return;
  }

  const activeSynced = syncedById.get(payload.activeProfileId);
  if (!activeSynced) {
    store.setPrivateRemoteActiveProfile(payload.activeProfileId);
    return;
  }

  const activeSignature = profileSignature(activeSynced.baseUrl, activeSynced.model);
  const localActive = existingBySignature.get(activeSignature);
  if (localActive) {
    store.setPrivateRemoteActiveProfile(localActive.id);
  }
}
