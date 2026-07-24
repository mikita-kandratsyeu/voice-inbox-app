export type IcloudSyncProgressStage = 'preparing' | 'uploading' | 'finishing';

export type IcloudSyncProgressState = {
  active: boolean;
  showOverlay: boolean;
  stage: IcloudSyncProgressStage | null;
  uploadCurrent: number;
  uploadTotal: number;
};

type IcloudSyncProgressListener = (state: IcloudSyncProgressState) => void;

const IDLE: IcloudSyncProgressState = {
  active: false,
  showOverlay: false,
  stage: null,
  uploadCurrent: 0,
  uploadTotal: 0,
};

let state: IcloudSyncProgressState = { ...IDLE };
const listeners = new Set<IcloudSyncProgressListener>();

export function getIcloudSyncProgressState(): IcloudSyncProgressState {
  return state;
}

export function subscribeIcloudSyncProgress(listener: IcloudSyncProgressListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(next: IcloudSyncProgressState): void {
  state = next;
  for (const listener of listeners) {
    listener(state);
  }
}

export function beginIcloudSyncProgress(showOverlay: boolean): void {
  emit({
    active: true,
    showOverlay,
    stage: 'preparing',
    uploadCurrent: 0,
    uploadTotal: 0,
  });
}

export function updateIcloudSyncProgress(
  patch: Partial<Pick<IcloudSyncProgressState, 'stage' | 'uploadCurrent' | 'uploadTotal'>>,
): void {
  if (!state.active) {
    return;
  }
  emit({ ...state, ...patch });
}

export function endIcloudSyncProgress(): void {
  emit({ ...IDLE });
}

export function resetIcloudSyncProgressForTests(): void {
  emit({ ...IDLE });
}
