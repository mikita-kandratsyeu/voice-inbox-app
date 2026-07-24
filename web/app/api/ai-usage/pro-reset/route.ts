import { ApiErrorCode, type ApiErrorCodeValue } from '@/lib/api-error-codes';
import { apiError, HttpStatus } from '@/lib/api';
import { applyProLimitResetPurchase } from '@/lib/ai-pro-reset';
import { assertMobileAuthenticatedDevice } from '@/lib/mobile-api-guard';
import { NextResponse } from 'next/server';

type ProResetBody = {
  productIdentifier?: unknown;
  transactionId?: unknown;
};

function readTrimmedString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export const POST = async (request: Request): Promise<NextResponse> => {
  const gate = await assertMobileAuthenticatedDevice(request);
  if (!gate.ok) {
    return gate.response;
  }

  const deviceIdTrimmed = gate.deviceId;
  const path = gate.pathname;

  let body: ProResetBody;
  try {
    body = (await request.json()) as ProResetBody;
  } catch {
    return apiError('invalid_json', HttpStatus.BAD_REQUEST, {
      pathname: path,
      code: ApiErrorCode.InvalidJson,
    });
  }

  const productIdentifier = readTrimmedString(body.productIdentifier);
  const transactionId = readTrimmedString(body.transactionId);

  if (!productIdentifier || !transactionId) {
    return apiError('validation_error', HttpStatus.BAD_REQUEST, {
      pathname: path,
      code: ApiErrorCode.ValidationError,
    });
  }

  const result = await applyProLimitResetPurchase({
    deviceId: deviceIdTrimmed,
    productIdentifier,
    transactionId,
  });

  if (!result.ok) {
    const codeByReason: Record<string, ApiErrorCodeValue> = {
      pro_required: ApiErrorCode.ProRequired,
      limit_not_exhausted: ApiErrorCode.ProResetLimitNotExhausted,
      invalid_product_identifier: ApiErrorCode.ProResetInvalidProduct,
      purchase_not_found: ApiErrorCode.ProResetPurchaseNotFound,
      transaction_already_used: ApiErrorCode.ProResetTransactionUsed,
      reset_product_not_configured: ApiErrorCode.ProResetNotConfigured,
      revenuecat_secret_not_configured: ApiErrorCode.ProResetNotConfigured,
    };

    return apiError(result.reason, result.status, {
      pathname: path,
      code: codeByReason[result.reason] ?? ApiErrorCode.ValidationError,
    });
  }

  return NextResponse.json({
    ...result.usage,
    alreadyApplied: result.alreadyApplied,
    reset: result.reset,
    creditedAmount: result.reset.restoredAmount,
  });
};
