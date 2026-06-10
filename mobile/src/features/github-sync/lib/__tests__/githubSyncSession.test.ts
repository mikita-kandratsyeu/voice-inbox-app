import {
  isGithubSyncSessionActive,
  setGithubSyncSessionActive,
  subscribeGithubSyncSession,
} from '../githubSyncSession';

describe('githubSyncSession', () => {
  afterEach(() => {
    setGithubSyncSessionActive(false);
  });

  it('tracks active sync state', () => {
    expect(isGithubSyncSessionActive()).toBe(false);
    setGithubSyncSessionActive(true);
    expect(isGithubSyncSessionActive()).toBe(true);
    setGithubSyncSessionActive(false);
    expect(isGithubSyncSessionActive()).toBe(false);
  });

  it('notifies subscribers when sync state changes', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeGithubSyncSession(listener);

    setGithubSyncSessionActive(true);
    setGithubSyncSessionActive(true);
    setGithubSyncSessionActive(false);

    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setGithubSyncSessionActive(true);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
