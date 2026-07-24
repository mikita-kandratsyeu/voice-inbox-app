import * as Keychain from 'react-native-keychain';

import {
  clearGithubSyncSecrets,
  getGithubSyncSecrets,
  isGithubSyncConnected,
  setGithubSyncAccessToken,
  setGithubSyncRepository,
} from '../githubSecrets';

jest.mock('react-native-keychain', () => ({
  ...jest.requireActual<typeof import('react-native-keychain')>('react-native-keychain'),
  getGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

const mockGetGenericPassword = jest.mocked(Keychain.getGenericPassword);
const mockSetGenericPassword = jest.mocked(Keychain.setGenericPassword);
const mockResetGenericPassword = jest.mocked(Keychain.resetGenericPassword);

describe('githubSecrets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGenericPassword.mockResolvedValue(false);
  });

  it('returns null when access token is missing', async () => {
    await expect(getGithubSyncSecrets()).resolves.toBeNull();
    await expect(isGithubSyncConnected()).resolves.toBe(false);
  });

  it('stores access token and repository metadata', async () => {
    mockGetGenericPassword.mockResolvedValue({
      username: 'github-sync',
      password: JSON.stringify({
        accessToken: 'gho_token',
        owner: 'acme',
        repo: 'notes',
        branch: 'voice-inbox-ai',
        basePath: 'voice-inbox-ai',
      }),
      service: 'voice-inbox-ai-github-sync',
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });

    await expect(getGithubSyncSecrets()).resolves.toEqual({
      accessToken: 'gho_token',
      owner: 'acme',
      repo: 'notes',
      branch: 'voice-inbox-ai',
      basePath: 'voice-inbox-ai',
    });
    await expect(isGithubSyncConnected()).resolves.toBe(true);
  });

  it('merges token updates into stored payload', async () => {
    mockGetGenericPassword.mockResolvedValue({
      username: 'github-sync',
      password: JSON.stringify({
        accessToken: 'old',
        owner: 'acme',
        repo: 'notes',
      }),
      service: 'voice-inbox-ai-github-sync',
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });

    await setGithubSyncAccessToken('new-token');

    expect(mockSetGenericPassword).toHaveBeenCalledWith(
      'github-sync',
      expect.stringContaining('"accessToken":"new-token"'),
      { service: 'voice-inbox-ai-github-sync' },
    );
  });

  it('updates repository fields while preserving token', async () => {
    mockGetGenericPassword.mockResolvedValue({
      username: 'github-sync',
      password: JSON.stringify({
        accessToken: 'gho_token',
        owner: '',
        repo: '',
      }),
      service: 'voice-inbox-ai-github-sync',
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });

    await setGithubSyncRepository({
      owner: 'acme',
      repo: 'voice-inbox-ai',
      branch: 'main',
      basePath: 'backup',
    });

    expect(mockSetGenericPassword).toHaveBeenCalledWith(
      'github-sync',
      expect.stringContaining('"owner":"acme"'),
      { service: 'voice-inbox-ai-github-sync' },
    );
    expect(mockSetGenericPassword).toHaveBeenCalledWith(
      'github-sync',
      expect.stringContaining('"repo":"voice-inbox-ai"'),
      { service: 'voice-inbox-ai-github-sync' },
    );
  });

  it('clears keychain secrets', async () => {
    await clearGithubSyncSecrets();

    expect(mockResetGenericPassword).toHaveBeenCalledWith({
      service: 'voice-inbox-ai-github-sync',
    });
  });
});
