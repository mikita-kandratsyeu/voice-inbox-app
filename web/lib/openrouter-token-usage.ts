export type OpenRouterTokenUsage = {
  prompt: number;
  completion: number;
};

function readNonNegativeInt(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return Math.floor(value);
}

export function extractOpenRouterTokenUsage(response: unknown): OpenRouterTokenUsage | undefined {
  if (!response || typeof response !== 'object') {
    return undefined;
  }

  const usage = (response as Record<string, unknown>).usage;
  if (!usage || typeof usage !== 'object') {
    return undefined;
  }

  const row = usage as Record<string, unknown>;
  const prompt = readNonNegativeInt(row.prompt_tokens) ?? readNonNegativeInt(row.promptTokens);
  const completion =
    readNonNegativeInt(row.completion_tokens) ?? readNonNegativeInt(row.completionTokens);

  if (prompt == null || completion == null) {
    return undefined;
  }

  return { prompt, completion };
}

export function mergeOpenRouterTokenUsage(
  a?: OpenRouterTokenUsage,
  b?: OpenRouterTokenUsage,
): OpenRouterTokenUsage | undefined {
  if (!a && !b) {
    return undefined;
  }
  return {
    prompt: (a?.prompt ?? 0) + (b?.prompt ?? 0),
    completion: (a?.completion ?? 0) + (b?.completion ?? 0),
  };
}
