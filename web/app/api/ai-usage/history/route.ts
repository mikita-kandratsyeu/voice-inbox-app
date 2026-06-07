import { HEADER_DEVICE_ID } from '@/config/constants';
import {
  apiError,
  checkDeviceRateLimit,
  HttpStatus,
  requireAppAuth,
  requireMobileUserAgent,
  validateDeviceId,
} from '@/lib/api';
import { getAiUsageHistory, MAX_AI_USAGE_HISTORY_LIMIT } from '@/lib/ai-usage-ledger';
import { NextResponse } from 'next/server';

const parseLimit = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(MAX_AI_USAGE_HISTORY_LIMIT, Math.max(1, parsed));
};

export const GET = async (request: Request): Promise<NextResponse> => {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const authError = await requireAppAuth();
  if (authError) return authError;

  const uaError = await requireMobileUserAgent();
  if (uaError) return uaError;

  const deviceId = request.headers.get(HEADER_DEVICE_ID);
  const deviceIdError = validateDeviceId(deviceId);
  if (deviceIdError) {
    return apiError(deviceIdError, HttpStatus.BAD_REQUEST, { pathname });
  }
  const deviceIdTrimmed = deviceId!.trim();

  const rateLimitError = await checkDeviceRateLimit(deviceIdTrimmed);
  if (rateLimitError) return rateLimitError;

  try {
    const history = await getAiUsageHistory({
      deviceId: deviceIdTrimmed,
      cursor: url.searchParams.get('cursor'),
      limit: parseLimit(url.searchParams.get('limit')),
    });

    return NextResponse.json(history);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : 'AI usage history unavailable', 503, {
      pathname,
    });
  }
};
