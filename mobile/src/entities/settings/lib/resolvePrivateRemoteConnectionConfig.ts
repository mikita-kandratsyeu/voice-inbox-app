import { useSettingsStore } from '../model/store';

export type PrivateRemoteConnectionConfig = {
  privateRemoteBaseUrl: string;
  privateRemoteApiKey: string;
  privateRemoteModel: string;
};

/** Effective OpenAI-compatible endpoint config (active profile → current fields → last success). */
export function resolvePrivateRemoteConnectionConfig(): PrivateRemoteConnectionConfig {
  const settings = useSettingsStore.getState();
  const activeId = settings.privateRemoteActiveProfileId;
  if (activeId) {
    const profile = settings.privateRemoteProfiles.find((item) => item.id === activeId);
    if (profile?.baseUrl.trim() && profile.model.trim()) {
      return {
        privateRemoteBaseUrl: profile.baseUrl.trim(),
        privateRemoteApiKey: profile.apiKey,
        privateRemoteModel: profile.model.trim(),
      };
    }
  }

  const privateRemoteBaseUrl =
    settings.privateRemoteBaseUrl.trim() || settings.privateRemoteLastSuccessfulBaseUrl.trim();
  const privateRemoteModel =
    settings.privateRemoteModel.trim() || settings.privateRemoteLastSuccessfulModel.trim();
  const privateRemoteApiKey =
    settings.privateRemoteApiKey.trim() || settings.privateRemoteLastSuccessfulApiKey.trim();

  return { privateRemoteBaseUrl, privateRemoteApiKey, privateRemoteModel };
}

/** Copy saved / profile remote config into working fields when those are empty. */
export function hydratePrivateRemoteWorkingConfig(): void {
  const resolved = resolvePrivateRemoteConnectionConfig();
  if (!resolved.privateRemoteBaseUrl || !resolved.privateRemoteModel) return;

  const {
    privateRemoteBaseUrl,
    privateRemoteApiKey,
    privateRemoteModel,
    setPrivateRemoteApiKey,
    setPrivateRemoteBaseUrl,
    setPrivateRemoteModel,
  } = useSettingsStore.getState();

  if (privateRemoteBaseUrl.trim() !== resolved.privateRemoteBaseUrl) {
    setPrivateRemoteBaseUrl(resolved.privateRemoteBaseUrl);
  }
  if (privateRemoteModel.trim() !== resolved.privateRemoteModel) {
    setPrivateRemoteModel(resolved.privateRemoteModel);
  }
  if (
    resolved.privateRemoteApiKey &&
    privateRemoteApiKey.trim() !== resolved.privateRemoteApiKey
  ) {
    setPrivateRemoteApiKey(resolved.privateRemoteApiKey);
  }
}
