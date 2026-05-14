import { NextResponse } from 'next/server';

import { ALLOWED_AI_MODELS, FALLBACK_MODEL } from '@/config/constants';
import { getAdminSession } from '@/lib/admin-session';
import { apiError, HttpStatus, parseJsonBody } from '@/lib/api';
import { createOpenRouterClient } from '@/lib/openrouter';
import { PUSH_POLICY_MARKDOWN_SYSTEM_PROMPT } from '@/lib/prompts';
import type { PushLocale } from '@/lib/push-messages';
import {
  ServiceUnavailableResponseError,
  TooManyRequestsResponseError,
} from '@openrouter/sdk/models/errors';

export const maxDuration = 120;

type Body = {
  locale?: unknown;
  brief?: unknown;
  context?: unknown;
};

const PRIMARY_MODEL = ALLOWED_AI_MODELS[0] ?? FALLBACK_MODEL;

function buildUserContent(body: Body): string {
  const locRaw = typeof body.locale === 'string' ? body.locale.trim().toLowerCase() : '';
  const target: PushLocale = locRaw === 'ru' ? 'ru' : 'en';
  const brief = typeof body.brief === 'string' ? body.brief.trim() : '';
  const context = typeof body.context === 'string' ? body.context.trim() : '';

  const lines = [
    `Target language code: ${target} (${target === 'ru' ? 'Russian' : 'English'})`,
    '',
    'Admin brief (what to communicate):',
    brief || '(none — write a concise generic policy-update notice the team can refine)',
  ];
  if (context) {
    lines.push('', 'Existing draft / notes from admin (optional, incorporate if useful):', context);
  }
  return lines.join('\n');
}

async function callDraft(
  model: string,
  userContent: string,
  clientUserAgent?: string | null,
): Promise<string> {
  const client = createOpenRouterClient(clientUserAgent);
  const response = await client.chat.send({
    chatGenerationParams: {
      model,
      messages: [
        { role: 'system', content: PUSH_POLICY_MARKDOWN_SYSTEM_PROMPT },
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

  const brief = typeof body.brief === 'string' ? body.brief.trim() : '';
  if (brief.length > 12_000) {
    return apiError('brief is too long', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const context = typeof body.context === 'string' ? body.context.trim() : '';
  if (context.length > 12_000) {
    return apiError('context is too long', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const userContent = buildUserContent(body);
  if (userContent.length > 120_000) {
    return apiError('payload too large', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  try {
    const markdown = await callDraft(PRIMARY_MODEL, userContent, request.headers.get('user-agent'));
    if (!markdown) {
      return apiError('Empty draft', HttpStatus.BAD_REQUEST, { pathname: path });
    }
    return NextResponse.json({ ok: true, markdown });
  } catch (err) {
    const isRetryable =
      err instanceof TooManyRequestsResponseError || err instanceof ServiceUnavailableResponseError;
    if (isRetryable) {
      try {
        const markdown = await callDraft(
          FALLBACK_MODEL,
          userContent,
          request.headers.get('user-agent'),
        );
        if (!markdown) {
          return apiError('Empty draft', HttpStatus.BAD_REQUEST, { pathname: path });
        }
        return NextResponse.json({ ok: true, markdown });
      } catch (err2) {
        console.error('[admin/push-policy-markdown]', err2);
        return apiError('AI request failed', 502, { pathname: path });
      }
    }
    console.error('[admin/push-policy-markdown]', err);
    return apiError('AI request failed', 502, { pathname: path });
  }
}
