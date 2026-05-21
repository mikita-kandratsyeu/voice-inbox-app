/** Strip optional markdown fences and isolate the outermost `{…}` object. */
export function extractJsonObjectSlice(raw: string): string {
  const trimmed = raw.trim();
  const withoutFences = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return withoutFences;
  }
  return withoutFences.slice(start, end + 1);
}

/** Parse model output that should be a single JSON object (tolerates fences / extra prose). */
export function parseOpenRouterJsonContent(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Invalid AI response: empty content');
  }

  const slice = extractJsonObjectSlice(trimmed);
  try {
    return JSON.parse(slice);
  } catch {
    throw new Error('Invalid AI response: model returned non-JSON content');
  }
}
