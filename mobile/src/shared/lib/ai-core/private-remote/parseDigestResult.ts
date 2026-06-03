import { isString } from '@/shared/lib/type-guards';

import {
  extractBalancedJsonObject,
  extractJsonObjectLoose,
  repairCommonJsonIssues,
  stripMarkdownCodeFence,
} from '../local-provider/localAiJson';

export type ParsedDigestResult = {
  markdown: string;
  highlights: string[];
  risks: string[];
  nextActions: string[];
};

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter(isString)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function parseDigestObject(raw: string): ParsedDigestResult | null {
  const trimmed = stripMarkdownCodeFence(raw.trim());
  const candidates = [
    trimmed,
    extractBalancedJsonObject(trimmed),
    extractJsonObjectLoose(trimmed),
  ].filter((c): c is string => Boolean(c));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(repairCommonJsonIssues(candidate)) as Record<string, unknown>;
      const markdown = isString(parsed.markdown) ? parsed.markdown.trim() : '';
      if (!markdown) continue;
      return {
        markdown,
        highlights: readStringArray(parsed.highlights),
        risks: readStringArray(parsed.risks),
        nextActions: readStringArray(parsed.nextActions),
      };
    } catch {
      // try next candidate
    }
  }

  return null;
}

export function parseDigestResult(raw: string): ParsedDigestResult | null {
  return parseDigestObject(raw);
}
