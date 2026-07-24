const mockGetState = jest.fn();
const mockSetPrivateRemoteBaseUrl = jest.fn();
const mockSetPrivateRemoteModel = jest.fn();
const mockSetPrivateRemoteApiKey = jest.fn();

jest.mock('../../model/store', () => ({
  useSettingsStore: {
    getState: () => mockGetState(),
  },
}));

import {
  hydratePrivateRemoteWorkingConfig,
  resolvePrivateRemoteConnectionConfig,
} from '../resolvePrivateRemoteConnectionConfig';

describe('resolvePrivateRemoteConnectionConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({
      privateRemoteBaseUrl: '',
      privateRemoteApiKey: '',
      privateRemoteModel: '',
      privateRemoteLastSuccessfulBaseUrl: 'http://192.168.1.10:11434/v1',
      privateRemoteLastSuccessfulApiKey: 'secret',
      privateRemoteLastSuccessfulModel: 'llama3',
      privateRemoteActiveProfileId: null,
      privateRemoteProfiles: [],
      setPrivateRemoteBaseUrl: mockSetPrivateRemoteBaseUrl,
      setPrivateRemoteModel: mockSetPrivateRemoteModel,
      setPrivateRemoteApiKey: mockSetPrivateRemoteApiKey,
    });
  });

  it('falls back to last successful config', () => {
    expect(resolvePrivateRemoteConnectionConfig()).toEqual({
      privateRemoteBaseUrl: 'http://192.168.1.10:11434/v1',
      privateRemoteApiKey: 'secret',
      privateRemoteModel: 'llama3',
    });
  });

  it('prefers active profile', () => {
    mockGetState.mockReturnValue({
      ...mockGetState(),
      privateRemoteActiveProfileId: 'p1',
      privateRemoteProfiles: [
        {
          id: 'p1',
          name: 'Home',
          baseUrl: 'http://10.0.0.2:1234/v1',
          apiKey: 'k',
          model: 'qwen',
        },
      ],
    });

    expect(resolvePrivateRemoteConnectionConfig().privateRemoteBaseUrl).toBe(
      'http://10.0.0.2:1234/v1',
    );
  });

  it('hydrates working fields from saved config', () => {
    hydratePrivateRemoteWorkingConfig();

    expect(mockSetPrivateRemoteBaseUrl).toHaveBeenCalledWith('http://192.168.1.10:11434/v1');
    expect(mockSetPrivateRemoteModel).toHaveBeenCalledWith('llama3');
    expect(mockSetPrivateRemoteApiKey).toHaveBeenCalledWith('secret');
  });
});
