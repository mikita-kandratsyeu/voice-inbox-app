import {
  cancelGitlabConnectSession,
  registerGitlabConnectSession,
} from '../gitlabSyncConnectSession';

describe('gitlabSyncConnectSession', () => {
  it('invokes the active cancel handler', () => {
    const cancel = jest.fn();
    registerGitlabConnectSession(cancel);

    cancelGitlabConnectSession();

    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('clears the handler when unregister runs', () => {
    const cancel = jest.fn();
    const unregister = registerGitlabConnectSession(cancel);

    unregister();
    cancelGitlabConnectSession();

    expect(cancel).not.toHaveBeenCalled();
  });

  it('replaces the previous handler when a new session registers', () => {
    const first = jest.fn();
    const second = jest.fn();

    registerGitlabConnectSession(first);
    registerGitlabConnectSession(second);
    cancelGitlabConnectSession();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
