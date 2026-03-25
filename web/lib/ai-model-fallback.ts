import {
  ServiceUnavailableResponseError,
  TooManyRequestsResponseError,
} from '@openrouter/sdk/models/errors';

const RETRYABLE_OPENROUTER_ERROR_NAMES = new Set([
  'BadGatewayResponseError',
  'GatewayTimeoutResponseError',
  'InternalServerResponseError',
]);

export function isRetryableOpenRouterTransportError(err: unknown): boolean {
  if (
    err instanceof TooManyRequestsResponseError ||
    err instanceof ServiceUnavailableResponseError
  ) {
    return true;
  }

  return err instanceof Error && RETRYABLE_OPENROUTER_ERROR_NAMES.has(err.name);
}

export function dedupeAiModels(models: string[]): string[] {
  const seen = new Set<string>();
  return models
    .map((m) => m.trim())
    .filter((m) => {
      if (!m || seen.has(m)) return false;
      seen.add(m);
      return true;
    });
}

export async function withSequentialModelFallback<T>(
  models: string[],
  run: (model: string) => Promise<T>,
  shouldTryNextAfterError: (err: unknown) => boolean,
): Promise<T> {
  const list = dedupeAiModels(models);
  if (list.length === 0) {
    throw new Error('withSequentialModelFallback: no models');
  }

  let lastErr: unknown;

  for (let i = 0; i < list.length; i++) {
    try {
      return await run(list[i]);
    } catch (e) {
      lastErr = e;
      if (i === list.length - 1) {
        throw e;
      }

      if (!shouldTryNextAfterError(e)) {
        throw e;
      }
    }
  }

  throw lastErr;
}
