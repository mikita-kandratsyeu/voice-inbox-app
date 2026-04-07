import {
  apiError,
  checkDeviceRateLimit,
  HttpStatus,
  parseJsonBody,
  requireAppAuth,
  requireMobileUserAgent,
  validateDeviceId,
  validateRequiredStrings,
} from '@/lib/api';
import { HEADER_DEVICE_ID } from '@/config/constants';
import { isValidTranslateLanguage } from '@/lib/prompts';
import { translateTranscript } from '@/services/translate.service';
import { NextResponse } from 'next/server';

type TranslateBody = {
  transcript?: unknown;
  targetLanguage?: unknown;
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const path = new URL(request.url).pathname;
  const authError = await requireAppAuth();
  if (authError) return authError;

  const uaError = await requireMobileUserAgent();
  if (uaError) return uaError;

  const deviceId = request.headers.get(HEADER_DEVICE_ID);
  const deviceIdError = validateDeviceId(deviceId);
  if (deviceIdError) {
    return apiError(deviceIdError, HttpStatus.BAD_REQUEST, { pathname: path });
  }
  const deviceIdTrimmed = deviceId!.trim();

  const rateLimitError = await checkDeviceRateLimit(deviceIdTrimmed);
  if (rateLimitError) return rateLimitError;

  const body = await parseJsonBody<TranslateBody>(request);

  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const validationError = validateRequiredStrings([
    { value: body.transcript, name: 'transcript' },
    { value: body.targetLanguage, name: 'targetLanguage' },
  ]);
  if (validationError) {
    return apiError(validationError, HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const { transcript, targetLanguage } = body as {
    transcript: string;
    targetLanguage: string;
  };

  if (!isValidTranslateLanguage(targetLanguage)) {
    return apiError('Invalid targetLanguage', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const result = await translateTranscript(
    transcript,
    targetLanguage,
    deviceIdTrimmed,
    request.headers.get('user-agent'),
  );

  if (!result.ok && 'limitExceeded' in result && result.limitExceeded) {
    return NextResponse.json(
      {
        error: 'Weekly AI limit reached',
        usage: result.usage,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(
            Math.ceil((new Date(result.usage.resetAt).getTime() - Date.now()) / 1000),
          ),
        },
      },
    );
  }

  if (!result.ok) {
    return apiError('error' in result ? result.error : 'Translation failed', 500, {
      pathname: path,
    });
  }

  return NextResponse.json({ translatedText: result.translatedText });
};
