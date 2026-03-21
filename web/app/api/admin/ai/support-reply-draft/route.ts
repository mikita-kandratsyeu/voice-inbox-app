import { NextResponse } from 'next/server';

import { ALLOWED_AI_MODELS, FALLBACK_MODEL } from '@/config/constants';
import { getAdminSession } from '@/lib/admin-session';
import { apiError, HttpStatus, parseJsonBody } from '@/lib/api';
import { openRouterClient } from '@/lib/openrouter';
import { SUPPORT_REPLY_DRAFT_SYSTEM_PROMPT } from '@/lib/prompts';
import {
  ServiceUnavailableResponseError,
  TooManyRequestsResponseError,
} from '@openrouter/sdk/models/errors';

type Body = {
  subject?: unknown;
  message?: unknown;
  resolutionHint?: unknown;
  locale?: unknown;
};

const PRIMARY_MODEL = ALLOWED_AI_MODELS[0] ?? FALLBACK_MODEL;

function buildUserPayload(body: Body): string {
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const resolutionHint = typeof body.resolutionHint === 'string' ? body.resolutionHint.trim() : '';
  const locRaw = typeof body.locale === 'string' ? body.locale.trim().toLowerCase() : '';
  const preferredLang = locRaw === 'ru' || locRaw === 'en' ? locRaw : 'unknown';

  const parts: string[] = [
    `Preferred language (app locale hint): ${preferredLang}`,
    '',
    'User support message:',
    message || '(empty)',
  ];
  if (subject) {
    parts.unshift(`Subject: ${subject}`, '');
  }
  if (resolutionHint) {
    parts.push('', 'Support team notes (what we changed or suggest):', resolutionHint);
  }
  return parts.join('\n');
}

async function callDraft(model: string, userContent: string): Promise<string> {
  const response = await openRouterClient.chat.send({
    chatGenerationParams: {
      model,
      messages: [
        { role: 'system', content: SUPPORT_REPLY_DRAFT_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      provider: { zdr: true },
      responseFormat: { type: 'json_object' },
      temperature: 0.35,
      stream: false,
    },
  });

  const content = response.choices[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Invalid AI response: missing content');
  }

  const parsed = JSON.parse(content) as unknown;
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('markdown' in parsed) ||
    typeof (parsed as { markdown: unknown }).markdown !== 'string'
  ) {
    throw new Error('Invalid AI response: expected JSON with markdown string');
  }

  return (parsed as { markdown: string }).markdown.trim();
}

export async function POST(request: Request): Promise<NextResponse> {
  const path = new URL(request.url).pathname;
  const admin = await getAdminSession();
  if (!admin) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED, { pathname: path });
  }

  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    return apiError('AI not configured', 503, { pathname: path });
  }

  const body = await parseJsonBody<Body>(request);
  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const trimmedMessage = typeof body.message === 'string' ? body.message.trim() : '';
  if (trimmedMessage.length < 1) {
    return apiError('message is required', HttpStatus.BAD_REQUEST, { pathname: path });
  }
  if (trimmedMessage.length > 12_000) {
    return apiError('message is too long', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const userContent = buildUserPayload({ ...body, message: trimmedMessage });
  if (userContent.length > 120_000) {
    return apiError('payload too large', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  try {
    const markdown = await callDraft(PRIMARY_MODEL, userContent);
    if (!markdown) {
      return apiError('Empty draft', HttpStatus.BAD_REQUEST, { pathname: path });
    }
    return NextResponse.json({ ok: true, markdown });
  } catch (err) {
    const isRetryable =
      err instanceof TooManyRequestsResponseError || err instanceof ServiceUnavailableResponseError;
    if (isRetryable) {
      try {
        const markdown = await callDraft(FALLBACK_MODEL, userContent);
        if (!markdown) {
          return apiError('Empty draft', HttpStatus.BAD_REQUEST, { pathname: path });
        }
        return NextResponse.json({ ok: true, markdown });
      } catch (err2) {
        console.error('[admin/support-reply-draft]', err2);
        return apiError('AI request failed', 502, { pathname: path });
      }
    }
    console.error('[admin/support-reply-draft]', err);
    return apiError('AI request failed', 502, { pathname: path });
  }
}
