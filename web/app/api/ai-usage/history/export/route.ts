import { apiError } from '@/lib/api';
import { getAiUsageHistoryForExport } from '@/lib/ai-usage-ledger';
import { assertMobileAuthenticatedDevice } from '@/lib/mobile-api-guard';
import { NextResponse } from 'next/server';

export const GET = async (request: Request): Promise<NextResponse> => {
  const gate = await assertMobileAuthenticatedDevice(request);
  if (!gate.ok) {
    return gate.response;
  }

  try {
    const exportResult = await getAiUsageHistoryForExport({
      deviceId: gate.deviceId,
    });

    return NextResponse.json(exportResult);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : 'AI usage export unavailable', 503, {
      pathname: gate.pathname,
    });
  }
};
