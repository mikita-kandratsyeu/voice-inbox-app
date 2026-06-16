import { randomBytes } from 'node:crypto';

import { apiError, checkSupportRateLimit, HttpStatus, parseJsonBody } from '@/lib/api';
import { assertMobileAuthenticatedDevice } from '@/lib/mobile-api-guard';
import {
  computePublishedNoteHash,
  isPublishedNoteActive,
  normalizePublishedNoteExpiresIn,
  normalizePublishedNoteTemplate,
} from '@/lib/published-note';
import { isProDevice } from '@/lib/pro-entitlement';
import { prisma } from '@/lib/prisma';
import { buildSharedNotePublicUrl } from '@/lib/shared-note-public';
import { NextResponse } from 'next/server';

const TITLE_MAX = 200;
const MARKDOWN_MAX = 80_000;

type PublishNoteBody = {
  recordId?: unknown;
  title?: unknown;
  template?: unknown;
  markdown?: unknown;
  expiresIn?: unknown;
};

type UnpublishNoteBody = {
  recordId?: unknown;
  token?: unknown;
};

function normalizeBoundedString(raw: unknown, max: number): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value || value.length > max) return null;
  return value;
}

function normalizeRecordId(raw: unknown): string | null {
  return normalizeBoundedString(raw, 200);
}

function normalizeMarkdown(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  if (!raw.trim() || raw.length > MARKDOWN_MAX) return null;
  return raw;
}

function tokenFromRandomBytes(): string {
  return randomBytes(18).toString('base64url');
}

function toPublishPayload(note: {
  token: string;
  template: string;
  expiresAt: Date | null;
  publishedAt: Date;
}) {
  return {
    active: true,
    token: note.token,
    template: note.template,
    expiresAt: note.expiresAt?.toISOString() ?? null,
    publishedAt: note.publishedAt.toISOString(),
    url: buildSharedNotePublicUrl(note.token),
  };
}

export const POST = async (request: Request): Promise<NextResponse> => {
  const gate = await assertMobileAuthenticatedDevice(request);
  if (!gate.ok) return gate.response;

  const isPro = await isProDevice(gate.deviceId);
  if (!isPro) {
    return apiError('Pro is required', HttpStatus.FORBIDDEN, { pathname: gate.pathname });
  }

  const limitError = await checkSupportRateLimit(gate.deviceId);
  if (limitError) return limitError;

  const body = await parseJsonBody<PublishNoteBody>(request);
  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, { pathname: gate.pathname });
  }

  const recordId = normalizeRecordId(body.recordId);
  if (!recordId) {
    return apiError('recordId is required', HttpStatus.BAD_REQUEST, { pathname: gate.pathname });
  }

  const title = normalizeBoundedString(body.title, TITLE_MAX);
  if (!title) {
    return apiError('title is required', HttpStatus.BAD_REQUEST, { pathname: gate.pathname });
  }

  const template = normalizePublishedNoteTemplate(body.template);
  if (!template) {
    return apiError('Invalid template', HttpStatus.BAD_REQUEST, { pathname: gate.pathname });
  }

  const markdown = normalizeMarkdown(body.markdown);
  if (!markdown) {
    return apiError('Invalid markdown payload', HttpStatus.BAD_REQUEST, {
      pathname: gate.pathname,
    });
  }

  const expiresAt = normalizePublishedNoteExpiresIn(body.expiresIn);
  if (expiresAt === 'invalid') {
    return apiError('Invalid expiresIn value', HttpStatus.BAD_REQUEST, { pathname: gate.pathname });
  }

  const contentHash = computePublishedNoteHash(markdown);

  const existing = await prisma.publishedNote.findUnique({
    where: { deviceId_recordId: { deviceId: gate.deviceId, recordId } },
    select: { token: true },
  });

  const note = await prisma.publishedNote.upsert({
    where: { deviceId_recordId: { deviceId: gate.deviceId, recordId } },
    update: {
      title,
      template,
      markdown,
      contentHash,
      expiresAt,
      revokedAt: null,
      publishedAt: new Date(),
    },
    create: {
      token: existing?.token ?? tokenFromRandomBytes(),
      deviceId: gate.deviceId,
      recordId,
      title,
      template,
      markdown,
      contentHash,
      expiresAt,
    },
    select: {
      token: true,
      template: true,
      expiresAt: true,
      publishedAt: true,
    },
  });

  return NextResponse.json({ ok: true, ...toPublishPayload(note), contentHash });
};

export const GET = async (request: Request): Promise<NextResponse> => {
  const gate = await assertMobileAuthenticatedDevice(request);
  if (!gate.ok) return gate.response;

  const recordId = new URL(request.url).searchParams.get('recordId')?.trim();
  if (!recordId) {
    return apiError('recordId is required', HttpStatus.BAD_REQUEST, { pathname: gate.pathname });
  }

  const note = await prisma.publishedNote.findUnique({
    where: { deviceId_recordId: { deviceId: gate.deviceId, recordId } },
    select: {
      token: true,
      template: true,
      expiresAt: true,
      publishedAt: true,
      revokedAt: true,
      contentHash: true,
    },
  });

  if (!note || !isPublishedNoteActive({ expiresAt: note.expiresAt, revokedAt: note.revokedAt })) {
    return NextResponse.json({ active: false }, { status: HttpStatus.NOT_FOUND });
  }

  return NextResponse.json({ ok: true, ...toPublishPayload(note), contentHash: note.contentHash });
};

export const DELETE = async (request: Request): Promise<NextResponse> => {
  const gate = await assertMobileAuthenticatedDevice(request);
  if (!gate.ok) return gate.response;

  const body = await parseJsonBody<UnpublishNoteBody>(request);
  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, { pathname: gate.pathname });
  }

  const recordId = typeof body.recordId === 'string' ? body.recordId.trim() : '';
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!recordId && !token) {
    return apiError('recordId or token is required', HttpStatus.BAD_REQUEST, {
      pathname: gate.pathname,
    });
  }

  const note = recordId
    ? await prisma.publishedNote.findUnique({
        where: { deviceId_recordId: { deviceId: gate.deviceId, recordId } },
        select: { id: true },
      })
    : await prisma.publishedNote.findFirst({
        where: { deviceId: gate.deviceId, token },
        select: { id: true },
      });

  if (!note) {
    return NextResponse.json({ ok: true, active: false });
  }

  await prisma.publishedNote.update({
    where: { id: note.id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true, active: false });
};
