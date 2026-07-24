export type GithubSyncProgressStage = 'preparing' | 'uploading' | 'committing';

export type GithubSyncProgressState = {
  active: boolean;
  /** When false, sync runs silently (scheduled sync). */
  showOverlay: boolean;
  stage: GithubSyncProgressStage | null;
  uploadCurrent: number;
  uploadTotal: number;
};

type GithubSyncProgressListener = (state: GithubSyncProgressState) => void;

const IDLE: GithubSyncProgressState = {
  active: false,
  showOverlay: false,
  stage: null,
  uploadCurrent: 0,
  uploadTotal: 0,
};

let state: GithubSyncProgressState = { ...IDLE };
const listeners = new Set<GithubSyncProgressListener>();

export function getGithubSyncProgressState(): GithubSyncProgressState {
  return state;
}

export function subscribeGithubSyncProgress(listener: GithubSyncProgressListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(next: GithubSyncProgressState): void {
  state = next;
  for (const listener of listeners) {
    listener(state);
  }
}

export function beginGithubSyncProgress(showOverlay: boolean): void {
  emit({
    active: true,
    showOverlay,
    stage: 'preparing',
    uploadCurrent: 0,
    uploadTotal: 0,
  });
}

export function updateGithubSyncProgress(
  patch: Partial<Pick<GithubSyncProgressState, 'stage' | 'uploadCurrent' | 'uploadTotal'>>,
): void {
  if (!state.active) {
    return;
  }
  emit({ ...state, ...patch });
}

export function endGithubSyncProgress(): void {
  emit({ ...IDLE });
}

export function resetGithubSyncProgressForTests(): void {
  emit({ ...IDLE });
}
