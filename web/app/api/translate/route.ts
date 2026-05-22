import { NextResponse } from 'next/server';

import { ApiErrorCode } from '@/lib/api-error-codes';
import {
  apiError,
  HttpStatus,
  parseJsonBody,
  validateRequiredStrings,
  weeklyAiLimitExceededResponse,
} from '@/lib/api';
import { assertMobileAiRouteContext } from '@/lib/mobile-ai-route';
import { logAiRequest } from '@/lib/ai-operation';
import { sanitizeTranscriptSegmentsForMeetingPrompt } from '@/lib/meeting-dialogue-user-prompt';
import { isValidTranslateLanguage } from '@/lib/prompts';
import type { TranslateTranscriptSegment } from '@/lib/translate-chunking';
import { translateTranscript } from '@/services/translate.service';

export const runtime = 'nodejs';

export const maxDuration = 300;

type TranslateBody = {
  transcript?: unknown;
  targetLanguage?: unknown;
  sourceLanguage?: unknown;
  transcriptSegments?: unknown;
};

function mapSegmentsForTranslate(
  raw: unknown,
): TranslateTranscriptSegment[] | undefined {
  const sanitized = sanitizeTranscriptSegmentsForMeetingPrompt(raw);
  if (!sanitized) return undefined;
  return sanitized.map((s) => ({
    text: s.text,
    ...(s.startMs !== undefined ? { startMs: s.startMs } : {}),
    ...(s.endMs !== undefined ? { endMs: s.endMs } : {}),
  }));
}

export const POST = async (request: Request): Promise<NextResponse> => {
  const guard = await assertMobileAiRouteContext(request);
  if (!guard.ok) {
    return guard.response;
  }
  const { deviceId: deviceIdTrimmed, pathname, request: req, aiOperation } = guard.ctx;

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

  const { transcript, targetLanguage, sourceLanguage: rawSourceLanguage } = body as {
    transcript: string;
    targetLanguage: string;
    sourceLanguage?: unknown;
  };

  if (!isValidTranslateLanguage(targetLanguage)) {
    return apiError('Invalid targetLanguage', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.InvalidTargetLanguage,
    });
  }

  const sourceLanguage =
    typeof rawSourceLanguage === 'string' && isValidTranslateLanguage(rawSourceLanguage)
      ? rawSourceLanguage
      : undefined;

  const transcriptSegments = mapSegmentsForTranslate(body.transcriptSegments);

  logAiRequest(aiOperation, { path: pathname });

  const result = await translateTranscript(
    transcript,
    targetLanguage,
    deviceIdTrimmed,
    req.headers.get('user-agent'),
    {
      sourceLanguage,
      transcriptSegments,
    },
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
