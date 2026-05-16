type SharedAudioHandler = (uri: string) => void;

let handler: SharedAudioHandler | null = null;
let pendingUri: string | null = null;

export function registerSharedAudioImportHandler(next: SharedAudioHandler | null) {
  handler = next;
  if (next && pendingUri) {
    const uri = pendingUri;
    pendingUri = null;
    next(uri);
  }
}

export function dispatchSharedAudioImport(uri: string) {
  const trimmed = uri.trim();
  if (!trimmed) return;

  if (handler) {
    handler(trimmed);
    return;
  }

  pendingUri = trimmed;
}

/** Call when navigation is ready so a pending Share / Open-in URI can run after cold start. */
export function flushPendingSharedAudioImport() {
  if (!handler || !pendingUri) return;
  const uri = pendingUri;
  pendingUri = null;
  handler(uri);
}
