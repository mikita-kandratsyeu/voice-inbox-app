import { apiError } from '@/lib/api';
import { getAiUsageHistory, MAX_AI_USAGE_HISTORY_LIMIT } from '@/lib/ai-usage-ledger';
import { assertMobileAuthenticatedDevice } from '@/lib/mobile-api-guard';
import { NextResponse } from 'next/server';

const parseLimit = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(MAX_AI_USAGE_HISTORY_LIMIT, Math.max(1, parsed));
};

export const GET = async (request: Request): Promise<NextResponse> => {
  const url = new URL(request.url);
  const gate = await assertMobileAuthenticatedDevice(request);
  if (!gate.ok) {
    return gate.response;
  }

  try {
    const history = await getAiUsageHistory({
      deviceId: gate.deviceId,
      cursor: url.searchParams.get('cursor'),
      limit: parseLimit(url.searchParams.get('limit')),
    });

    return NextResponse.json(history);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : 'AI usage history unavailable', 503, {
      pathname: gate.pathname,
    });
  }
};
