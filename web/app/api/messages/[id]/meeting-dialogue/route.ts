import { ApiErrorCode } from '@/lib/api-error-codes';
import {
  apiError,
  HttpStatus,
  parseAllowedAiModelForDevice,
  parseJsonBody,
  weeklyAiLimitExceededResponse,
} from '@/lib/api';
import { HEADER_SYNC_TOKEN } from '@/config/constants';
import { assertMobileAiRouteContext } from '@/lib/mobile-ai-route';
import { logAiRequest } from '@/lib/ai-operation';
import { sanitizeTranscriptSegmentsForMeetingPrompt } from '@/lib/meeting-dialogue-user-prompt';
import {
  buildMeetingDialogueStandalonePrompt,
  sanitizeTaskExtractionHint,
  type AiProcessingOptions,
} from '@/lib/prompts';
import { isProDevice } from '@/lib/pro-entitlement';
import { clampMessageTtlSeconds } from '@/lib/message-kv-ttl';
import {
  retryMeetingDialogue,
  type MeetingDialogueAuxPayload,
  type MeetingDialogueRehydratePhase1,
} from '@/services/message.service';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export const maxDuration = 300;

type RetryMeetingDialogueBody = {
  transcript?: unknown;
  transcriptSegments?: unknown;
  model?: unknown;
  options?: AiProcessingOptions & { taskExtractionHint?: unknown };
  messageTtlSeconds?: unknown;
  /** Required when the original summarize Redis entry has expired. */
  phase1?: {
    suggestedTitle?: unknown;
    summary?: unknown;
    keyPhrases?: unknown;
  };
};

type RouteContext = { params: Promise<{ id: string }> };

export const POST = async (request: Request, { params }: RouteContext): Promise<NextResponse> => {
  const guard = await assertMobileAiRouteContext(request);
  if (!guard.ok) {
    return guard.response;
  }
  const { deviceId: deviceIdTrimmed, pathname, request: req, aiOperation } = guard.ctx;

  const { id: jobId } = await params;
  if (!jobId?.trim()) {
    return apiError('id is required', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.ValidationError,
    });
  }

  const body = await parseJsonBody<RetryMeetingDialogueBody>(req);
  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.InvalidJson,
    });
  }

  if (typeof body.transcript !== 'string' || !body.transcript.trim()) {
    return apiError('transcript is required', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.ValidationError,
    });
  }

  if (typeof body.model !== 'string' || !body.model.trim()) {
    return apiError('model is required', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.ValidationError,
    });
  }

  const isPro = await isProDevice(deviceIdTrimmed);
  if (!isPro) {
    return apiError('Pro required for meeting speaker breakdown', HttpStatus.FORBIDDEN, {
      pathname,
      code: ApiErrorCode.ProModelRequired,
    });
  }

  const processingPreset = body.options?.processingPreset;
  if (processingPreset !== 'meeting') {
    return apiError('options.processingPreset must be meeting', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.ValidationError,
    });
  }

  const modelParsed = await parseAllowedAiModelForDevice(deviceIdTrimmed, body.model.trim());
  if (!modelParsed.ok) {
    return apiError(modelParsed.error, HttpStatus.BAD_REQUEST, {
      pathname,
      code:
        modelParsed.reason === 'pro_required'
          ? ApiErrorCode.ProModelRequired
          : ApiErrorCode.InvalidModel,
    });
  }

  const meetingDialogueSystemPrompt = buildMeetingDialogueStandalonePrompt(
    body.options ?? undefined,
  );
  if (!meetingDialogueSystemPrompt.trim()) {
    return apiError('Meeting dialogue prompt could not be built', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.MissingSystemPrompt,
    });
  }

  const meetingDialogueSegments = sanitizeTranscriptSegmentsForMeetingPrompt(
    body.transcriptSegments,
  );
  const hint = sanitizeTaskExtractionHint(body.options?.taskExtractionHint);
  const meetingDialogueAux: MeetingDialogueAuxPayload | undefined = {
    ...(meetingDialogueSegments ? { transcriptSegments: meetingDialogueSegments } : {}),
    ...(hint ? { taskExtractionHint: hint } : {}),
  };

  const messageTtlSeconds = clampMessageTtlSeconds(body.messageTtlSeconds);

  let rehydratePhase1: MeetingDialogueRehydratePhase1 | undefined;
  const rawPhase1 = body.phase1;
  if (rawPhase1 && typeof rawPhase1 === 'object') {
    const summary = typeof rawPhase1.summary === 'string' ? rawPhase1.summary.trim() : '';
    if (summary) {
      const suggestedTitle =
        typeof rawPhase1.suggestedTitle === 'string' && rawPhase1.suggestedTitle.trim()
          ? rawPhase1.suggestedTitle.trim()
          : 'Meeting';
      const keyPhrases = Array.isArray(rawPhase1.keyPhrases)
        ? rawPhase1.keyPhrases
            .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
            .map((p) => p.trim())
        : undefined;
      rehydratePhase1 = {
        suggestedTitle,
        summary,
        ...(keyPhrases?.length ? { keyPhrases } : {}),
      };
    }
  }

  logAiRequest(aiOperation, { path: pathname, messageId: jobId });

  const result = await retryMeetingDialogue({
    jobId: jobId.trim(),
    deviceId: deviceIdTrimmed,
    transcript: body.transcript.trim(),
    model: modelParsed.model,
    meetingDialogueSystemPrompt,
    meetingDialogueAux,
    clientUserAgent: req.headers.get('user-agent'),
    messageTtlSeconds,
    rehydratePhase1,
  });

  if (!result.ok) {
    if ('limitExceeded' in result && result.limitExceeded) {
      return weeklyAiLimitExceededResponse(result.usage);
    }
    const message = 'error' in result ? result.error : 'Meeting dialogue retry failed';
    return apiError(message, HttpStatus.CONFLICT, {
      pathname,
      code: ApiErrorCode.ValidationError,
    });
  }

  const response = NextResponse.json({
    id: jobId,
    status: 'processing',
    meetingDialogueStatus: 'processing',
    pollExpiresAt: result.pollExpiresAt,
    model: modelParsed.model,
    ...(result.syncToken && { syncToken: result.syncToken }),
  });

  if (result.syncToken) {
    response.headers.set(HEADER_SYNC_TOKEN, result.syncToken);
  }

  return response;
};
