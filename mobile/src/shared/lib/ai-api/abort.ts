/** Internal error code when the user cancels an in-flight cloud AI request. */
export const AI_REQUEST_CANCELLED = 'request_cancelled';

export type AiAbortHandle = {
  cancelled: boolean;
  readonly signal: AbortSignal;
  abort: () => void;
};

export function createAiAbortHandle(): AiAbortHandle {
  const abortController = new AbortController();
  const handle: AiAbortHandle = {
    cancelled: false,
    signal: abortController.signal,
    abort() {
      if (handle.cancelled) return;
      handle.cancelled = true;
      abortController.abort();
    },
  };
  return handle;
}

export function isAiRequestCancelled(error: string | undefined): boolean {
  return error === AI_REQUEST_CANCELLED;
}

export function isAbortLikeError(err: unknown): boolean {
  if (err instanceof Error) {
    return err.name === 'AbortError' || /\babort/i.test(err.message);
  }
  return false;
}

export function aiRequestCancelledFailure<T extends { ok: false; error: string }>(): T {
  return { ok: false, error: AI_REQUEST_CANCELLED } as T;
}

export type AiFetchOptions = {
  signal?: AbortSignal;
};

export async function interruptibleDelay(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
