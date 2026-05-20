import { isNonNegativeFiniteNumber, isRecord, isString } from '@/shared/lib/type-guards';

import { isRecordingMarkKind, type RecordingMark, type RecordingMarkKind } from './types';

export const DEFAULT_RECORDING_MARK_KIND: RecordingMarkKind = 'moment';

export const RECORDING_MARK_LABEL_MAX = 280;

export function normalizeRecordingMarkKind(raw: unknown): RecordingMarkKind {
  if (isRecordingMarkKind(raw)) {
    return raw;
  }
  return DEFAULT_RECORDING_MARK_KIND;
}

export function sanitizeRecordingMark(
  raw: unknown,
  index: number,
  fallbackId?: string,
): RecordingMark | null {
  if (!isRecord(raw)) return null;
  const offsetMsRaw = raw.offsetMs;
  const offsetMs = isNonNegativeFiniteNumber(offsetMsRaw)
    ? Math.max(0, Math.round(offsetMsRaw))
    : 0;
  let id = isString(raw.id) ? raw.id.trim() : '';
  if (!id) id = fallbackId ?? `rm_legacy_${offsetMs}_${index}`;
  let label = isString(raw.label) ? raw.label : '';
  if (label.length > RECORDING_MARK_LABEL_MAX) {
    label = label.slice(0, RECORDING_MARK_LABEL_MAX);
  }
  return {
    id,
    offsetMs,
    kind: normalizeRecordingMarkKind(raw.kind),
    label,
  };
}
