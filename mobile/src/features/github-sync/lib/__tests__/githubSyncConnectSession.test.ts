import {
  cancelGithubConnectSession,
  registerGithubConnectSession,
} from '../githubSyncConnectSession';

describe('githubSyncConnectSession', () => {
  it('invokes the active cancel handler', () => {
    const cancel = jest.fn();
    registerGithubConnectSession(cancel);

    cancelGithubConnectSession();

    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('clears the handler when unregister runs', () => {
    const cancel = jest.fn();
    const unregister = registerGithubConnectSession(cancel);

    unregister();
    cancelGithubConnectSession();

    expect(cancel).not.toHaveBeenCalled();
  });

  it('replaces the previous handler when a new session registers', () => {
    const first = jest.fn();
    const second = jest.fn();

    registerGithubConnectSession(first);
    registerGithubConnectSession(second);
    cancelGithubConnectSession();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
