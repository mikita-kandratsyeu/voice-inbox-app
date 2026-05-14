import { NextResponse } from 'next/server';

import { AI_ROUTE_MAX_DURATION_SECONDS } from '@/config/constants';
import { ApiErrorCode } from '@/lib/api-error-codes';
import {
  apiError,
  HttpStatus,
  parseJsonBody,
  validateRequiredStrings,
  weeklyAiLimitExceededResponse,
} from '@/lib/api';
import { assertMobileAiRouteContext } from '@/lib/mobile-ai-route';
import { isValidTranslateLanguage } from '@/lib/prompts';
import { translateTranscript } from '@/services/translate.service';

export const maxDuration = AI_ROUTE_MAX_DURATION_SECONDS;

type TranslateBody = {
  transcript?: unknown;
  targetLanguage?: unknown;
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const guard = await assertMobileAiRouteContext(request);
  if (!guard.ok) {
    return guard.response;
  }
  const { deviceId: deviceIdTrimmed, pathname, request: req } = guard.ctx;

  const body = await parseJsonBody<TranslateBody>(req);

  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.InvalidJson,
    });
  }

  const validationError = validateRequiredStrings([
    { value: body.transcript, name: 'transcript' },
    { value: body.targetLanguage, name: 'targetLanguage' },
  ]);
  if (validationError) {
    return apiError(validationError, HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.ValidationError,
    });
  }

  const { transcript, targetLanguage } = body as {
    transcript: string;
    targetLanguage: string;
  };

  if (!isValidTranslateLanguage(targetLanguage)) {
    return apiError('Invalid targetLanguage', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.InvalidTargetLanguage,
    });
  }

  const result = await translateTranscript(
    transcript,
    targetLanguage,
    deviceIdTrimmed,
    req.headers.get('user-agent'),
  );

  if (!result.ok && 'limitExceeded' in result && result.limitExceeded) {
    return weeklyAiLimitExceededResponse(result.usage);
  }

  if (!result.ok) {
    return apiError('error' in result ? result.error : 'Translation failed', 500, {
      pathname,
      code: ApiErrorCode.TranslationFailed,
    });
  }

  return NextResponse.json({ translatedText: result.translatedText });
};
