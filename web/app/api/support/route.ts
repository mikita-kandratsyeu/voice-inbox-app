import {
  apiError,
  checkSupportRateLimit,
  HttpStatus,
  parseJsonBody,
  requireAppAuth,
  requireMobileUserAgent,
  validateDeviceId,
} from '@/lib/api';
import { HEADER_DEVICE_ID } from '@/config/constants';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 12_000;
const SUBJECT_MAX = 200;
const APP_LOGS_MAX = 32_000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SupportBody = {
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  diagnostics?: unknown;
  appLogs?: unknown;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return apiError('Support is not available', 503);
  }

  const authError = await requireAppAuth();
  if (authError) return authError;

  const uaError = await requireMobileUserAgent();
  if (uaError) return uaError;

  const deviceId = request.headers.get(HEADER_DEVICE_ID);
  const deviceIdError = validateDeviceId(deviceId);
  if (deviceIdError) {
    return apiError(deviceIdError, HttpStatus.BAD_REQUEST);
  }
  const deviceIdTrimmed = deviceId!.trim();

  const rate = await checkSupportRateLimit(deviceIdTrimmed);
  if (rate) return rate;

  const body = await parseJsonBody<SupportBody>(request);
  if (!body) {
    return apiError('Invalid JSON', HttpStatus.BAD_REQUEST);
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (message.length < MESSAGE_MIN) {
    return apiError(`message must be at least ${MESSAGE_MIN} characters`, HttpStatus.BAD_REQUEST);
  }
  if (message.length > MESSAGE_MAX) {
    return apiError(`message is too long (max ${MESSAGE_MAX})`, HttpStatus.BAD_REQUEST);
  }

  let email: string | null = null;
  if (body.email !== undefined && body.email !== null && String(body.email).trim() !== '') {
    const e = String(body.email).trim();
    if (e.length > 254 || !EMAIL_RE.test(e)) {
      return apiError('Invalid email', HttpStatus.BAD_REQUEST);
    }
    email = e;
  }

  let subject: string | null = null;
  if (typeof body.subject === 'string' && body.subject.trim()) {
    const s = body.subject.trim();
    if (s.length > SUBJECT_MAX) {
      return apiError(`subject is too long (max ${SUBJECT_MAX})`, HttpStatus.BAD_REQUEST);
    }
    subject = s;
  }

  let appLogs: string | null = null;
  if (typeof body.appLogs === 'string' && body.appLogs.trim()) {
    const l = body.appLogs.trim();
    if (l.length > APP_LOGS_MAX) {
      return apiError('appLogs is too long', HttpStatus.BAD_REQUEST);
    }
    appLogs = l;
  }

  if (!isPlainObject(body.diagnostics)) {
    return apiError('diagnostics must be a JSON object', HttpStatus.BAD_REQUEST);
  }

  const diagnostics = body.diagnostics as Record<string, unknown>;
  const diagStr = JSON.stringify(diagnostics);
  if (diagStr.length > 100_000) {
    return apiError('diagnostics payload is too large', HttpStatus.BAD_REQUEST);
  }

  try {
    const row = await prisma.supportIssue.create({
      data: {
        deviceId: deviceIdTrimmed,
        email,
        subject,
        message,
        diagnostics: diagnostics as Prisma.InputJsonValue,
        appLogs,
      },
    });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    console.error('[support POST]', e);
    return apiError('Failed to save request', 503);
  }
}
