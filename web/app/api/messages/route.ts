import { ApiErrorCode } from '@/lib/api-error-codes';
import {
  apiError,
  HttpStatus,
  parseJsonBody,
  parseAllowedAiModelForDevice,
  validateRequiredStrings,
  weeklyAiLimitExceededResponse,
} from '@/lib/api';
import { HEADER_SYNC_TOKEN } from '@/config/constants';
import { assertMobileAiRouteContext } from '@/lib/mobile-ai-route';
import { logAiRequest } from '@/lib/ai-operation';
import { aiModelResponseFields } from '@/lib/ai-model-display';
import { withDeduplication, getMessageDeduplicationKey } from '@/lib/request-deduplication';
import {
  estimateSummaryTasksRoutingChars,
  resolveAutoAiModel,
  type AiModelMode,
} from '@/lib/ai-model-router';
import { sanitizeTranscriptSegmentsForMeetingPrompt } from '@/lib/meeting-dialogue-user-prompt';
import {
  buildAiProcessingPrompt,
  buildMeetingDialogueStandalonePrompt,
  sanitizeExistingTaskTextsForPrompt,
  sanitizeTaskExtractionHint,
  type AiProcessingOptions,
} from '@/lib/prompts';
import { sanitizeRecordingMarksForPrompt } from '@/lib/recording-marks-prompt';
import { setAppForeground } from '@/lib/push-tokens';
import { clampMessageTtlSeconds } from '@/lib/message-kv-ttl';
import { getAiWeeklyLimits } from '@/lib/app-config';
import { isProDevice } from '@/lib/pro-entitlement';
import { createMessage, type MeetingDialogueAuxPayload } from '@/services/message.service';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export const maxDuration = 300;

type CreateMessageBody = {
  id?: unknown;
  transcript?: unknown;
  transcriptSegments?: unknown;
  model?: unknown;
  modelMode?: unknown;
  routingContext?: unknown;
  systemPrompt?: unknown;
  options?: AiProcessingOptions;
  messageTtlSeconds?: unknown;
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const guard = await assertMobileAiRouteContext(request);
  if (!guard.ok) {
    return guard.response;
  }
  const { deviceId: deviceIdTrimmed, pathname, request: req, aiOperation } = guard.ctx;

  const body = await parseJsonBody<CreateMessageBody>(req);

  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.InvalidJson,
    });
  }

  const validationError = validateRequiredStrings([
    { value: body.id, name: 'id' },
    { value: body.transcript, name: 'transcript' },
    { value: body.model, name: 'model' },
  ]);
  if (validationError) {
    return apiError(validationError, HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.ValidationError,
    });
  }

  const {
    id,
    transcript,
    model,
    modelMode: rawModelMode,
    routingContext: rawRoutingContext,
    systemPrompt,
    options: rawOptions,
    transcriptSegments: rawTranscriptSegments,
    messageTtlSeconds: rawMessageTtl,
  } = body as {
    id: string;
    transcript: string;
    transcriptSegments?: unknown;
    model: string;
    modelMode?: AiModelMode;
    routingContext?: { taskType?: unknown; transcriptChars?: unknown };
    systemPrompt?: string;
    options?: AiProcessingOptions & {
      existingTaskTexts?: unknown;
      taskExtractionHint?: unknown;
      recordingMarks?: unknown;
    };
    messageTtlSeconds?: unknown;
  };

  const messageTtlSeconds = clampMessageTtlSeconds(rawMessageTtl);

  let options: AiProcessingOptions | undefined;
  if (rawOptions && typeof rawOptions === 'object') {
    const {
      existingTaskTexts: rawExisting,
      taskExtractionHint: rawHint,
      recordingMarks: rawRecordingMarks,
      processingPreset: rawProcessingPreset,
      meetingSummaryTemplate: rawMeetingSummaryTemplate,
      ...rest
    } = rawOptions;
    const existing = sanitizeExistingTaskTextsForPrompt(rawExisting);
    const hint = sanitizeTaskExtractionHint(rawHint);
    const recordingMarks = sanitizeRecordingMarksForPrompt(rawRecordingMarks);
    const processingPreset = rawProcessingPreset === 'meeting' ? 'meeting' : undefined;
    const meetingSummaryTemplate =
      rawMeetingSummaryTemplate === 'standup' ||
      rawMeetingSummaryTemplate === 'sales_call' ||
      rawMeetingSummaryTemplate === 'one_on_one' ||
      rawMeetingSummaryTemplate === 'interview' ||
      rawMeetingSummaryTemplate === 'product_meeting' ||
      rawMeetingSummaryTemplate === 'lecture' ||
      rawMeetingSummaryTemplate === 'general'
        ? rawMeetingSummaryTemplate
        : undefined;
    options = {
      ...rest,
      ...(processingPreset ? { processingPreset } : {}),
      ...(meetingSummaryTemplate ? { meetingSummaryTemplate } : {}),
      ...(existing ? { existingTaskTexts: existing } : {}),
      ...(hint ? { taskExtractionHint: hint } : {}),
      ...(recordingMarks ? { recordingMarks } : {}),
    };
  }

  const modelMode: AiModelMode = rawModelMode === 'auto' ? 'auto' : 'manual';
  const routingTaskType = rawRoutingContext?.taskType === 'ask' ? 'ask' : 'summary_tasks';
  const routingChars =
    routingTaskType === 'ask'
      ? transcript.length
      : estimateSummaryTasksRoutingChars(transcript, options);
  let resolvedModel =
    modelMode === 'auto'
      ? resolveAutoAiModel({
          taskType: routingTaskType,
          routingChars,
          ...(routingTaskType === 'ask' ? { askRoutingBasis: 'transcript_only' as const } : {}),
        })
      : model;

  const [isPro, weeklyLimits] = await Promise.all([
    isProDevice(deviceIdTrimmed),
    getAiWeeklyLimits(),
  ]);
  const aiLimitContext = { isPro, weeklyLimits };

  const modelParsed = await parseAllowedAiModelForDevice(deviceIdTrimmed, resolvedModel, {
    isPro,
  });
  if (!modelParsed.ok) {
    return apiError(modelParsed.error, HttpStatus.BAD_REQUEST, {
      pathname,
      code:
        modelParsed.reason === 'pro_required'
          ? ApiErrorCode.ProModelRequired
          : ApiErrorCode.InvalidModel,
    });
  }
  resolvedModel = modelParsed.model;

  const pseudoDiarizationEligible = options?.processingPreset === 'meeting' && isPro;

  const resolvedSystemPrompt =
    options != null
      ? buildAiProcessingPrompt(options, { pseudoDiarizationEligible: false })
      : (systemPrompt ?? '');

  const meetingDialogueSystemPrompt =
    options != null && pseudoDiarizationEligible
      ? buildMeetingDialogueStandalonePrompt(options)
      : undefined;

  if (!resolvedSystemPrompt.trim()) {
    return apiError('systemPrompt or options is required', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.MissingSystemPrompt,
    });
  }

  const meetingDialogueSegments = sanitizeTranscriptSegmentsForMeetingPrompt(rawTranscriptSegments);

  const meetingDialogueAux: MeetingDialogueAuxPayload | undefined = pseudoDiarizationEligible
    ? {
        ...(meetingDialogueSegments ? { transcriptSegments: meetingDialogueSegments } : {}),
        ...(options?.taskExtractionHint ? { taskExtractionHint: options.taskExtractionHint } : {}),
      }
    : undefined;

  await setAppForeground(deviceIdTrimmed);

  logAiRequest(aiOperation, { path: pathname, messageId: id });

  const result = await withDeduplication(
    getMessageDeduplicationKey(deviceIdTrimmed, id),
    () =>
      createMessage(
        id,
        transcript,
        resolvedModel,
        resolvedSystemPrompt,
        deviceIdTrimmed,
        req.headers.get('user-agent'),
        messageTtlSeconds,
        pseudoDiarizationEligible,
        meetingDialogueSystemPrompt,
        meetingDialogueAux,
        aiLimitContext,
      ),
    10000,
  );

  if (!result.created && 'limitExceeded' in result && result.limitExceeded) {
    return weeklyAiLimitExceededResponse(result.usage);
  }

  if (!result.created) {
    return apiError('Message with this id already exists', HttpStatus.CONFLICT, {
      pathname,
      code: ApiErrorCode.DuplicateId,
    });
  }

  const response = NextResponse.json({
    id,
    status: 'processing',
    ...aiModelResponseFields(resolvedModel),
    ...(result.syncToken && { syncToken: result.syncToken }),
  });

  if (result.syncToken) {
    response.headers.set(HEADER_SYNC_TOKEN, result.syncToken);
  }

  return response;
};
