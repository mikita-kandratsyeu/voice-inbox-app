import {
  cancelGithubDeviceFlow,
  isGithubOAuthConfigured,
  startGithubDeviceFlow,
} from '../githubAuth';
import { setGithubSyncAccessToken } from '../githubSecrets';

const mockNitroFetch = jest.fn();

jest.mock('@/shared/config/runtimeConfig', () => ({
  getGithubOAuthClientId: jest.fn(() => 'test-client-id'),
}));

jest.mock('@/shared/lib/fetch', () => ({
  nitroFetch: (...args: unknown[]) => mockNitroFetch(...args),
}));

jest.mock('../githubSecrets', () => ({
  setGithubSyncAccessToken: jest.fn(),
}));

const deviceResponse = {
  device_code: 'device-code-abc',
  user_code: 'WDJB-MJHT',
  verification_uri: 'https://github.com/login/device',
  expires_in: 900,
  interval: 5,
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('githubAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    cancelGithubDeviceFlow();
  });

  afterEach(() => {
    cancelGithubDeviceFlow();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('reports oauth as configured when client id exists', () => {
    expect(isGithubOAuthConfigured()).toBe(true);
  });

  it('completes device flow and stores access token', async () => {
    const onChallenge = jest.fn();

    mockNitroFetch.mockImplementation(async (url: string) => {
      if (url.includes('/login/device/code')) {
        return jsonResponse(deviceResponse);
      }
      if (url.includes('/login/oauth/access_token')) {
        return jsonResponse({ access_token: 'gho_test_token' });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const flowPromise = startGithubDeviceFlow(onChallenge);
    await flushMicrotasks();

    expect(onChallenge).toHaveBeenCalledWith({
      userCode: 'WDJB-MJHT',
      verificationUri: 'https://github.com/login/device',
      verificationUriComplete: 'https://github.com/login/device?user_code=WDJB-MJHT',
    });

    await jest.advanceTimersByTimeAsync(5_000);
    await flushMicrotasks();
    const challenge = await flowPromise;

    expect(challenge.userCode).toBe('WDJB-MJHT');
    expect(setGithubSyncAccessToken).toHaveBeenCalledWith('gho_test_token');
  });

  it('polls until authorization is no longer pending', async () => {
    let tokenPolls = 0;

    mockNitroFetch.mockImplementation(async (url: string) => {
      if (url.includes('/login/device/code')) {
        return jsonResponse(deviceResponse);
      }
      if (url.includes('/login/oauth/access_token')) {
        tokenPolls += 1;
        if (tokenPolls === 1) {
          return jsonResponse({ error: 'authorization_pending' });
        }
        return jsonResponse({ access_token: 'gho_later' });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const flowPromise = startGithubDeviceFlow();
    await flushMicrotasks();
    await jest.advanceTimersByTimeAsync(5_000);
    await flushMicrotasks();
    await jest.advanceTimersByTimeAsync(5_000);
    await flushMicrotasks();

    await expect(flowPromise).resolves.toMatchObject({ userCode: 'WDJB-MJHT' });
    expect(tokenPolls).toBe(2);
  });

  it('throws access_denied when user rejects authorization', async () => {
    mockNitroFetch.mockImplementation(async (url: string) => {
      if (url.includes('/login/device/code')) {
        return jsonResponse(deviceResponse);
      }
      return jsonResponse({ error: 'access_denied' });
    });

    const flowPromise = startGithubDeviceFlow();
    const expectation = expect(flowPromise).rejects.toThrow('access_denied');
    await flushMicrotasks();
    await jest.advanceTimersByTimeAsync(5_000);
    await flushMicrotasks();
    await expectation;
  });

  it('cancels an in-flight device flow', async () => {
    mockNitroFetch.mockImplementation(async (url: string) => {
      if (url.includes('/login/device/code')) {
        return jsonResponse(deviceResponse);
      }
      return jsonResponse({ error: 'authorization_pending' });
    });

    const flowPromise = startGithubDeviceFlow();
    const expectation = expect(flowPromise).rejects.toThrow('device_flow_cancelled');
    await flushMicrotasks();
    cancelGithubDeviceFlow();
    await flushMicrotasks();
    await expectation;
  });
});
