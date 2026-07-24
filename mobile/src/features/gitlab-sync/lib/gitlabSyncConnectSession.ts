type GitlabConnectCancelFn = () => void;

let activeCancel: GitlabConnectCancelFn | null = null;

export function registerGitlabConnectSession(cancel: GitlabConnectCancelFn): () => void {
  activeCancel = cancel;
  return () => {
    if (activeCancel === cancel) {
      activeCancel = null;
    }
  };
}

export function cancelGitlabConnectSession(): void {
  activeCancel?.();
}
