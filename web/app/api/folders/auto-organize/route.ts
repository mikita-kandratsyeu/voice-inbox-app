import { HEADER_SYNC_TOKEN } from '@/config/constants';
import { apiError, HttpStatus, parseJsonBody, validateRequiredStrings } from '@/lib/api';
import { logAiRequest } from '@/lib/ai-operation';
import { ApiErrorCode } from '@/lib/api-error-codes';
import { assertMobileAiRouteContext } from '@/lib/mobile-ai-route';
import { clampMessageTtlSeconds } from '@/lib/message-kv-ttl';
import { createAutoOrganizeRequest } from '@/services/folder-organize.service';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export const maxDuration = 300;

type NotePayload = {
  id: string;
  title?: string;
  transcript?: string;
  summary?: string;
  tags?: string[];
  classification?: string;
  tasks?: Array<{ text: string }>;
};

type RequestBody = {
  id?: unknown;
  appLanguage?: unknown;
  existingFolders?: unknown;
  notes?: unknown;
  messageTtlSeconds?: unknown;
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const guard = await assertMobileAiRouteContext(request);
  if (!guard.ok) {
    return guard.response;
  }

  const { deviceId: deviceIdTrimmed, pathname: path, aiOperation } = guard.ctx;

  const body = await parseJsonBody<RequestBody>(request);
  if (!body) return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, { pathname: path });

  const validationError = validateRequiredStrings([{ value: body.id, name: 'id' }]);
  if (validationError) {
    return apiError(validationError, HttpStatus.BAD_REQUEST, { pathname: path });
  }

  if (!Array.isArray(body.notes) || body.notes.length === 0) {
    return apiError('notes must be a non-empty array', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const sanitizedNotes = (body.notes as unknown[])
    .map((n) => {
      if (!n || typeof n !== 'object') return null;
      const obj = n as Record<string, unknown>;
      const noteId = typeof obj.id === 'string' ? obj.id.trim() : '';
      if (!noteId) return null;
      const tasks =
        Array.isArray(obj.tasks) && obj.tasks.length > 0
          ? (obj.tasks as unknown[])
              .map((t) =>
                t && typeof t === 'object' && typeof (t as { text?: unknown }).text === 'string'
                  ? { text: (t as { text: string }).text }
                  : null,
              )
              .filter(Boolean)
          : undefined;
      const next: NotePayload = {
        id: noteId,
        ...(typeof obj.title === 'string' && obj.title.trim() ? { title: obj.title.trim() } : {}),
        ...(typeof obj.transcript === 'string' && obj.transcript.trim()
          ? { transcript: obj.transcript.trim() }
          : {}),
        ...(typeof obj.summary === 'string' && obj.summary.trim()
          ? { summary: obj.summary.trim() }
          : {}),
        ...(Array.isArray(obj.tags)
          ? { tags: obj.tags.filter((x): x is string => typeof x === 'string') }
          : {}),
        ...(typeof obj.classification === 'string' && obj.classification.trim()
          ? { classification: obj.classification.trim() }
          : {}),
        ...(tasks && tasks.length > 0 ? { tasks: tasks as Array<{ text: string }> } : {}),
      };
      return next;
    })
    .filter(Boolean) as NotePayload[];

  if (sanitizedNotes.length === 0) {
    return apiError('No valid notes provided', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const appLanguage =
    typeof body.appLanguage === 'string' && body.appLanguage.trim()
      ? body.appLanguage.trim().toLowerCase().slice(0, 2)
      : undefined;
  const existingFolders = Array.isArray(body.existingFolders)
    ? (body.existingFolders as unknown[])
        .map((f) => {
          if (!f || typeof f !== 'object') return null;
          const obj = f as Record<string, unknown>;
          const name = typeof obj.name === 'string' ? obj.name.trim() : '';
          if (!name) return null;
          return {
            name,
            ...(typeof obj.icon === 'string' && obj.icon.trim() ? { icon: obj.icon.trim() } : {}),
            ...(typeof obj.color === 'string' && obj.color.trim()
              ? { color: obj.color.trim() }
              : {}),
          };
        })
        .filter(Boolean)
    : [];
  const payload = JSON.stringify({
    ...(appLanguage ? { appLanguage } : {}),
    ...(existingFolders.length > 0 ? { existingFolders } : {}),
    notes: sanitizedNotes,
  });

  const messageTtlSeconds = clampMessageTtlSeconds(body.messageTtlSeconds);

  logAiRequest(aiOperation, { path, requestId: String(body.id) });

  const result = await createAutoOrganizeRequest(
    String(body.id),
    payload,
    deviceIdTrimmed,
    request.headers.get('user-agent'),
    messageTtlSeconds,
  );

  if (!result.created && 'limitExceeded' in result && result.limitExceeded) {
    const error =
      result.reason === 'auto_organize_free_limit'
        ? 'Weekly auto organize limit reached'
        : 'Weekly AI limit reached';
    return NextResponse.json(
      { error, reason: result.reason, usage: result.usage },
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

  if (!result.created) {
    return apiError('Auto organize request with this id already exists', HttpStatus.CONFLICT, {
      pathname: path,
    });
  }

  const response = NextResponse.json({
    id: String(body.id),
    status: 'processing',
    ...(result.syncToken && { syncToken: result.syncToken }),
  });
  if (result.syncToken) response.headers.set(HEADER_SYNC_TOKEN, result.syncToken);
  return response;
};
