export type GitlabSyncProgressStage = 'preparing' | 'uploading' | 'committing';

export type GitlabSyncProgressState = {
  active: boolean;
  /** When false, sync runs silently (scheduled sync). */
  showOverlay: boolean;
  stage: GitlabSyncProgressStage | null;
  uploadCurrent: number;
  uploadTotal: number;
};

type GitlabSyncProgressListener = (state: GitlabSyncProgressState) => void;

const IDLE: GitlabSyncProgressState = {
  active: false,
  showOverlay: false,
  stage: null,
  uploadCurrent: 0,
  uploadTotal: 0,
};

let state: GitlabSyncProgressState = { ...IDLE };
const listeners = new Set<GitlabSyncProgressListener>();

export function getGitlabSyncProgressState(): GitlabSyncProgressState {
  return state;
}

export function subscribeGitlabSyncProgress(listener: GitlabSyncProgressListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(next: GitlabSyncProgressState): void {
  state = next;
  for (const listener of listeners) {
    listener(state);
  }
}

export function beginGitlabSyncProgress(showOverlay: boolean): void {
  emit({
    active: true,
    showOverlay,
    stage: 'preparing',
    uploadCurrent: 0,
    uploadTotal: 0,
  });
}

export function updateGitlabSyncProgress(
  patch: Partial<Pick<GitlabSyncProgressState, 'stage' | 'uploadCurrent' | 'uploadTotal'>>,
): void {
  if (!state.active) {
    return;
  }
  emit({ ...state, ...patch });
}

export function endGitlabSyncProgress(): void {
  emit({ ...IDLE });
}

export function resetGitlabSyncProgressForTests(): void {
  emit({ ...IDLE });
}
