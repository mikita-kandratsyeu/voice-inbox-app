import { i18n } from '@/shared/lib';

/** llama.cpp / LM Studio style: n_keep exceeds n_ctx, or similar context window errors. */
export function isPrivateRemoteContextLengthExceeded(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (/n_keep\s*:\s*\d+/.test(lower) && /n_ctx\s*:\s*\d+/.test(lower)) {
    return true;
  }

  return (
    /greater than the context length/.test(lower) ||
    /exceeds the context length/.test(lower) ||
    /context length.*too (?:small|short|low)/.test(lower) ||
    /load the model with a larger context length/.test(lower) ||
    /provide a shorter input/.test(lower)
  );
}

export function mapPrivateRemoteUserFacingError(err: unknown): string | null {
  if (isPrivateRemoteContextLengthExceeded(err)) {
    return i18n.t('ai.privateRemoteContextTooLong');
  }
  return null;
}
