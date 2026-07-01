import {
  ServiceUnavailableResponseError,
  TooManyRequestsResponseError,
} from '@openrouter/sdk/models/errors';

const RETRYABLE_OPENROUTER_ERROR_NAMES = new Set([
  'BadGatewayResponseError',
  'GatewayTimeoutResponseError',
  'InternalServerResponseError',
]);

function isJsonObjectResponseFormatUnsupported(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('json_object response format is not supported');
}

/** OpenRouter rejected all ZDR/routing candidates for the requested model (try fallback). */
function isOpenRouterProviderRoutingError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (/OpenRouter stream error:\s*Forbidden/i.test(msg)) return true;
  if (/OpenRouter chat failed \(403\)/i.test(msg)) return true;
  if (/No allowed providers are available for the selected model/i.test(msg)) return true;
  if (/permission_denied/i.test(msg)) return true;
  return false;
}

export function isRetryableOpenRouterTransportError(err: unknown): boolean {
  if (
    err instanceof TooManyRequestsResponseError ||
    err instanceof ServiceUnavailableResponseError
  ) {
    return true;
  }

  if (isJsonObjectResponseFormatUnsupported(err)) {
    return true;
  }

  if (isOpenRouterProviderRoutingError(err)) {
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
