import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

const STATUSES = ['open', 'closed'] as const;
type IssueStatus = (typeof STATUSES)[number];

function isIssueStatus(s: string): s is IssueStatus {
  return (STATUSES as readonly string[]).includes(s);
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const take = Math.min(Math.max(Number(searchParams.get('limit')) || 25, 1), 100);
  const cursor = searchParams.get('cursor')?.trim() || null;
  const statusFilter = searchParams.get('status')?.trim() || 'all';

  const where =
    statusFilter !== 'all' && isIssueStatus(statusFilter) ? { status: statusFilter } : {};

  try {
    const raw = await prisma.supportIssue.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = raw.length > take;
    const page = hasMore ? raw.slice(0, take) : raw;
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

    return NextResponse.json({
      ok: true,
      items: page.map((r) => ({
        id: r.id,
        deviceId: r.deviceId,
        email: r.email,
        subject: r.subject,
        message: r.message,
        diagnostics: r.diagnostics,
        appLogs: r.appLogs,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      nextCursor,
    });
  } catch (e) {
    console.error('[admin/support GET]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}

type PatchBody = { id?: unknown; status?: unknown };

export async function PATCH(request: Request): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) {
    return NextResponse.json({ ok: false, error: 'id is required' }, { status: 400 });
  }

  const st = typeof body.status === 'string' ? body.status.trim() : '';
  if (!isIssueStatus(st)) {
    return NextResponse.json(
      { ok: false, error: 'status must be open or closed' },
      { status: 400 },
    );
  }

  try {
    await prisma.supportIssue.update({
      where: { id },
      data: { status: st },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Not found or update failed' }, { status: 404 });
  }
}
