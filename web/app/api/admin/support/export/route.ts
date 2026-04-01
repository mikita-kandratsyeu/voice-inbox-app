import { NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import { formatSupportReference } from '@/lib/support-reference';

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const header =
    'id,reference,createdAt,updatedAt,closedAt,status,deviceId,email,subject,message,diagnosticsJson,appLogs\n';

  const rows: string[] = [];
  const batch = 200;
  let skip = 0;

  try {
    for (;;) {
      const chunk = await prisma.supportIssue.findMany({
        orderBy: { createdAt: 'asc' },
        skip,
        take: batch,
      });
      if (chunk.length === 0) break;
      for (const r of chunk) {
        const diag = JSON.stringify(r.diagnostics ?? {});
        rows.push(
          [
            csvEscape(r.id),
            csvEscape(formatSupportReference(r.referenceNumber)),
            csvEscape(r.createdAt.toISOString()),
            csvEscape(r.updatedAt.toISOString()),
            csvEscape(r.closedAt?.toISOString() ?? ''),
            csvEscape(r.status),
            csvEscape(r.deviceId),
            csvEscape(r.email ?? ''),
            csvEscape(r.subject ?? ''),
            csvEscape(r.message),
            csvEscape(diag),
            csvEscape(r.appLogs ?? ''),
          ].join(','),
        );
      }
      skip += batch;
    }
  } catch (e) {
    console.error('[admin/support/export]', e);
    return NextResponse.json({ ok: false, error: 'Export failed' }, { status: 503 });
  }

  const body = header + rows.join('\n') + '\n';
  const filename = `support-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
