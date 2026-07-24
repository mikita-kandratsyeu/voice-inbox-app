import {
  isGitlabSyncSessionActive,
  setGitlabSyncSessionActive,
  subscribeGitlabSyncSession,
} from '../gitlabSyncSession';

describe('gitlabSyncSession', () => {
  afterEach(() => {
    setGitlabSyncSessionActive(false);
  });

  it('tracks active sync state', () => {
    expect(isGitlabSyncSessionActive()).toBe(false);
    setGitlabSyncSessionActive(true);
    expect(isGitlabSyncSessionActive()).toBe(true);
    setGitlabSyncSessionActive(false);
    expect(isGitlabSyncSessionActive()).toBe(false);
  });

  it('notifies subscribers when sync state changes', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeGitlabSyncSession(listener);

    setGitlabSyncSessionActive(true);
    setGitlabSyncSessionActive(true);
    setGitlabSyncSessionActive(false);

    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setGitlabSyncSessionActive(true);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
