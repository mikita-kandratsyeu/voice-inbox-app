import { useSettingsStore } from '@/entities/settings';

import {
  applyRemoteSyncPrivateProfiles,
  defaultRemoteProfileName,
  parseRemoteSyncPrivateProfiles,
} from '../remoteSyncPrivateProfiles';

jest.mock('@/entities/settings', () => ({
  useSettingsStore: {
    getState: jest.fn(),
  },
}));

const mockGetState = jest.mocked(useSettingsStore.getState);

describe('remoteSyncPrivateProfiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds a default profile name from host and model', () => {
    expect(defaultRemoteProfileName('http://127.0.0.1:11434', 'qwen2.5:7b-instruct')).toBe(
      '127.0.0.1 · qwen2.5:7b-instruct',
    );
  });

  it('merges synced profiles by baseUrl and model signature', () => {
    const upsertPrivateRemoteProfile = jest.fn();
    const setPrivateRemoteActiveProfile = jest.fn();
    mockGetState.mockReturnValue({
      privateRemoteProfiles: [
        {
          id: 'local-1',
          name: 'Local Ollama',
          baseUrl: 'http://127.0.0.1:11434',
          model: 'qwen2.5:7b-instruct',
          apiKey: 'secret',
          updatedAt: 1,
        },
      ],
      upsertPrivateRemoteProfile,
      setPrivateRemoteActiveProfile,
    } as unknown as ReturnType<typeof useSettingsStore.getState>);

    const payload = parseRemoteSyncPrivateProfiles({
      version: 1,
      exportedAt: '2026-06-10T12:00:00.000Z',
      profiles: [
        {
          id: 'remote-1',
          name: 'Synced Ollama',
          baseUrl: 'http://127.0.0.1:11434',
          model: 'qwen2.5:7b-instruct',
        },
      ],
      activeProfileId: 'remote-1',
    });
    expect(payload).not.toBeNull();
    applyRemoteSyncPrivateProfiles(payload!);

    expect(upsertPrivateRemoteProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'local-1',
        name: 'Synced Ollama',
        apiKey: 'secret',
      }),
    );
    expect(setPrivateRemoteActiveProfile).toHaveBeenCalledWith('local-1');
  });
});
