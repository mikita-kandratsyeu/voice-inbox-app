import { NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import { formatSupportReference } from '@/lib/support-reference';
import {
  isSupportProKeyRequestSubject,
  SUPPORT_PRO_KEY_SUBJECT_MARKER,
} from '@/lib/support-pro-key-request';

export async function GET(): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const raw = await prisma.supportIssue.findMany({
      where: {
        status: 'open',
        email: { not: null },
        proLicenseEmailSentAt: null,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 100,
      select: {
        id: true,
        referenceNumber: true,
        deviceId: true,
        email: true,
        subject: true,
        message: true,
        createdAt: true,
      },
    });

    const items = raw
      .filter((r) => isSupportProKeyRequestSubject(r.subject))
      .map((r) => ({
        id: r.id,
        reference: formatSupportReference(r.referenceNumber, r.id),
        deviceId: r.deviceId,
        email: r.email as string,
        subject: r.subject,
        messagePreview:
          r.message.length > 200 ? `${r.message.slice(0, 197).trimEnd()}…` : r.message,
        createdAt: r.createdAt.toISOString(),
      }));

    return NextResponse.json({
      ok: true,
      items,
      subjectMarker: SUPPORT_PRO_KEY_SUBJECT_MARKER,
    });
  } catch (e) {
    console.error('[admin/support/key-requests GET]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}
