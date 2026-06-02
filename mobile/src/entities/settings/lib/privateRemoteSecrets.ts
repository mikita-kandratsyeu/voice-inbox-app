import * as Keychain from 'react-native-keychain';

import { isRecord, isString } from '@/shared/lib/type-guards';

const SERVICE_PRIVATE_REMOTE_SECRETS = 'voice-inbox-private-remote-secrets';
const KEYCHAIN_USERNAME = 'private-remote-secrets';

type PrivateRemoteSecretsPayload = {
  currentApiKey: string;
  lastSuccessfulApiKey: string;
  profileApiKeys: Record<string, string>;
};

const EMPTY_PAYLOAD: PrivateRemoteSecretsPayload = {
  currentApiKey: '',
  lastSuccessfulApiKey: '',
  profileApiKeys: {},
};

function sanitizeProfileApiKeys(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, maybeValue] of Object.entries(value)) {
    if (!isString(key) || !isString(maybeValue)) continue;
    const trimmedKey = key.trim();
    if (!trimmedKey) continue;
    out[trimmedKey] = maybeValue;
  }
  return out;
}

function parsePayload(raw: string): PrivateRemoteSecretsPayload {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { ...EMPTY_PAYLOAD };
    return {
      currentApiKey: isString(parsed.currentApiKey) ? parsed.currentApiKey : '',
      lastSuccessfulApiKey: isString(parsed.lastSuccessfulApiKey)
        ? parsed.lastSuccessfulApiKey
        : '',
      profileApiKeys: sanitizeProfileApiKeys(parsed.profileApiKeys),
    };
  } catch {
    return { ...EMPTY_PAYLOAD };
  }
}

async function readPayload(): Promise<PrivateRemoteSecretsPayload> {
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE_PRIVATE_REMOTE_SECRETS });
    if (!creds) return { ...EMPTY_PAYLOAD };
    return parsePayload(creds.password);
  } catch {
    return { ...EMPTY_PAYLOAD };
  }
}

async function writePayload(payload: PrivateRemoteSecretsPayload): Promise<void> {
  await Keychain.setGenericPassword(KEYCHAIN_USERNAME, JSON.stringify(payload), {
    service: SERVICE_PRIVATE_REMOTE_SECRETS,
  });
}

export async function getPrivateRemoteSecrets(): Promise<PrivateRemoteSecretsPayload> {
  return readPayload();
}

export async function setPrivateRemoteCurrentApiKey(apiKey: string): Promise<void> {
  const current = await readPayload();
  await writePayload({
    ...current,
    currentApiKey: apiKey,
  });
}

export async function setPrivateRemoteLastSuccessfulApiKey(apiKey: string): Promise<void> {
  const current = await readPayload();
  await writePayload({
    ...current,
    lastSuccessfulApiKey: apiKey,
  });
}

export async function setPrivateRemoteProfileApiKey(
  profileId: string,
  apiKey: string,
): Promise<void> {
  const id = profileId.trim();
  if (!id) return;
  const current = await readPayload();
  const nextProfileApiKeys = { ...current.profileApiKeys };
  if (apiKey.length === 0) {
    delete nextProfileApiKeys[id];
  } else {
    nextProfileApiKeys[id] = apiKey;
  }
  await writePayload({
    ...current,
    profileApiKeys: nextProfileApiKeys,
  });
}

export async function removePrivateRemoteProfileApiKey(profileId: string): Promise<void> {
  const id = profileId.trim();
  if (!id) return;
  const current = await readPayload();
  if (!(id in current.profileApiKeys)) return;
  const nextProfileApiKeys = { ...current.profileApiKeys };
  delete nextProfileApiKeys[id];
  await writePayload({
    ...current,
    profileApiKeys: nextProfileApiKeys,
  });
}

export async function setPrivateRemoteAllSecrets(
  payload: PrivateRemoteSecretsPayload,
): Promise<void> {
  await writePayload({
    currentApiKey: payload.currentApiKey,
    lastSuccessfulApiKey: payload.lastSuccessfulApiKey,
    profileApiKeys: sanitizeProfileApiKeys(payload.profileApiKeys),
  });
}
