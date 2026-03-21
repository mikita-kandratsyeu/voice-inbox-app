import { NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';

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

  const header = 'id,createdAt,adminId,adminLogin,action,metadataJson\n';

  const rows: string[] = [];
  const batch = 200;
  let skip = 0;

  try {
    for (;;) {
      const chunk = await prisma.adminAuditLog.findMany({
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip,
        take: batch,
        select: {
          id: true,
          createdAt: true,
          adminId: true,
          adminLogin: true,
          action: true,
          metadata: true,
        },
      });
      if (chunk.length === 0) break;
      for (const r of chunk) {
        const meta =
          r.metadata === null || r.metadata === undefined ? '' : JSON.stringify(r.metadata);
        rows.push(
          [
            csvEscape(r.id),
            csvEscape(r.createdAt.toISOString()),
            csvEscape(r.adminId),
            csvEscape(r.adminLogin),
            csvEscape(r.action),
            csvEscape(meta),
          ].join(','),
        );
      }
      skip += batch;
    }
  } catch (e) {
    console.error('[admin/audit/export]', e);
    return NextResponse.json({ ok: false, error: 'Export failed' }, { status: 503 });
  }

  const body = header + rows.join('\n') + '\n';
  const filename = `admin-audit-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
