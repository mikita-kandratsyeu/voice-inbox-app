type GithubConnectCancelFn = () => void;

let activeCancel: GithubConnectCancelFn | null = null;

export function registerGithubConnectSession(cancel: GithubConnectCancelFn): () => void {
  activeCancel = cancel;
  return () => {
    if (activeCancel === cancel) {
      activeCancel = null;
    }
  };
}

export function cancelGithubConnectSession(): void {
  activeCancel?.();
}
