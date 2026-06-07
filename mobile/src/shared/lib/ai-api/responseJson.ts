import { devWarn } from '@/shared/lib/appLogger';

/** Read response body as JSON; avoids raw SyntaxError when the server returns plain text/HTML. */
export async function readResponseJson(
  response: Response,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: 'Empty response' };
  }

  try {
    return { ok: true, data: JSON.parse(trimmed) as unknown };
  } catch {
    devWarn('[AI] response is not JSON', trimmed.slice(0, 160));
    const snippet = trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
    return { ok: false, error: snippet };
  }
}
