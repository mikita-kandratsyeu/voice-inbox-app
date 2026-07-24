function messageFromUnknown(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  return String(err);
}

/** True for timeouts and other errors worth retrying on cold start / flaky networks. */
export function isTransientNetworkError(err: unknown): boolean {
  if (err instanceof Error && err.name === 'AbortError') {
    return true;
  }

  const message = messageFromUnknown(err);

  return (
    /NSURLErrorDomain Code=-1001/i.test(message) ||
    /NSURLErrorDomain Code=-1005/i.test(message) ||
    /timed out|timeout|time-out|Превышен лимит времени/i.test(message)
  );
}
