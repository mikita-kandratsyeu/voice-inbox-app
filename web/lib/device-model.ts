import { DEVICE_MODEL_MAX_CHARS } from '@/config/constants';

/** Normalize optional hardware model label (push_token JSON, etc.). */
export function sanitizeDeviceModel(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  const noCtl = trimmed.replace(/[\u0000-\u001F\u007F]/g, '');
  if (!noCtl) return null;

  return noCtl.length > DEVICE_MODEL_MAX_CHARS ? noCtl.slice(0, DEVICE_MODEL_MAX_CHARS) : noCtl;
}
