import { getWebApiEnvironmentStatus, isLocalDevWebApiHost } from '../webApiEnvironment';

jest.mock('../runtimeConfig', () => ({
  getWebApiUrl: jest.fn(() => 'https://api.voiceinbox.ai'),
  getPreviewWebApiUrl: jest.fn(() => 'https://preview.voiceinbox.ai'),
}));

const { getWebApiUrl, getPreviewWebApiUrl } = jest.requireMock('../runtimeConfig') as {
  getWebApiUrl: jest.Mock;
  getPreviewWebApiUrl: jest.Mock;
};

describe('isLocalDevWebApiHost', () => {
  it('matches local dev hosts', () => {
    expect(isLocalDevWebApiHost('192.168.1.67')).toBe(true);
    expect(isLocalDevWebApiHost('localhost')).toBe(true);
  });

  it('rejects public hosts', () => {
    expect(isLocalDevWebApiHost('api.voiceinbox.ai')).toBe(false);
  });
});

describe('getWebApiEnvironmentStatus', () => {
  beforeEach(() => {
    getWebApiUrl.mockReturnValue('https://api.voiceinbox.ai');
    getPreviewWebApiUrl.mockReturnValue('https://preview.voiceinbox.ai');
  });

  it('returns prod for production API', () => {
    expect(getWebApiEnvironmentStatus()).toBe('prod');
  });

  it('returns preview when active URL matches preview host', () => {
    getWebApiUrl.mockReturnValue('https://preview.voiceinbox.ai');
    expect(getWebApiEnvironmentStatus()).toBe('preview');
  });

  it('returns dev for LAN API', () => {
    getWebApiUrl.mockReturnValue('http://192.168.1.67:3000');
    expect(getWebApiEnvironmentStatus()).toBe('dev');
  });
});
