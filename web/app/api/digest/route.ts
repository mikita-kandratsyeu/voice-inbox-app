import { NextResponse } from 'next/server';

import { HEADER_DEVICE_ID } from '@/config/constants';
import {
  apiError,
  checkDeviceRateLimit,
  HttpStatus,
  parseJsonBody,
  requireAppAuth,
  requireMobileUserAgent,
  validateAllowedModel,
  validateDeviceId,
  validateRequiredStrings,
} from '@/lib/api';
import { checkAndIncrement, decrement } from '@/lib/ai-rate-limit';
import { resolveAutoAiModel, type AiModelMode } from '@/lib/ai-model-router';
import { setAppForeground } from '@/lib/push-tokens';
import { processDigest } from '@/services/ai.service';

type DigestRequestBody = {
  payload?: unknown;
  model?: unknown;
  modelMode?: unknown;
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

  const body = await parseJsonBody<DigestRequestBody>(request);
  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const validationError = validateRequiredStrings([
    { value: body.payload, name: 'payload' },
    { value: body.model, name: 'model' },
  ]);
  if (validationError) {
    return apiError(validationError, HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const payload = String(body.payload);
  if (payload.length > 30_000) {
    return apiError('payload is too large', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const modelMode: AiModelMode = body.modelMode === 'auto' ? 'auto' : 'manual';
  const requestedModel = String(body.model);
  const resolvedModel =
    modelMode === 'auto'
      ? resolveAutoAiModel({ taskType: 'summary_tasks', routingChars: payload.length })
      : requestedModel;

  const modelError = validateAllowedModel(resolvedModel);
  if (modelError) {
    return apiError(modelError, HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const limitResult = await checkAndIncrement(deviceIdTrimmed);
  if (!limitResult.allowed) {
    return NextResponse.json(
      {
        error: 'Weekly AI limit reached',
        usage: limitResult.usage,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(
            Math.ceil((new Date(limitResult.usage.resetAt).getTime() - Date.now()) / 1000),
          ),
        },
      },
    );
  }

  await setAppForeground(deviceIdTrimmed);

  try {
    const result = await processDigest(payload, resolvedModel, request.headers.get('user-agent'));
    return NextResponse.json({ ...result, model: resolvedModel });
  } catch (err) {
    await decrement(deviceIdTrimmed);
    return apiError(err instanceof Error ? err.message : 'Digest generation failed', 503, {
      pathname: path,
    });
  }
};
