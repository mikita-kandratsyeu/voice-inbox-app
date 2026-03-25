import { writeAdminAudit } from '@/lib/admin-audit';
import { parseAmountToCents } from '@/lib/admin-budget-money';
import { getAdminSession } from '@/lib/admin-session';
import { HttpStatus, parseJsonBody } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

const DESC_MAX = 500;
const CAT_MAX = 80;
const ALLOWED_CURRENCY = /^[A-Z]{3}$/;

function parseSpentAt(s: string): Date | null {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function serializeRow(r: {
  id: string;
  spentAt: Date;
  category: string | null;
  description: string;
  amountCents: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: r.id,
    spentAt: r.spentAt.toISOString(),
    category: r.category,
    description: r.description,
    amountCents: r.amountCents,
    currency: r.currency,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function GET(): Promise<NextResponse> {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatus.UNAUTHORIZED });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'DATABASE_URL is not configured' },
      { status: 503 },
    );
  }

  try {
    const rows = await prisma.adminBudgetExpense.findMany({
      orderBy: [{ spentAt: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });

    const sums = await prisma.adminBudgetExpense.groupBy({
      by: ['currency'],
      _sum: { amountCents: true },
    });

    const totals: Record<string, number> = {};
    for (const g of sums) {
      totals[g.currency] = g._sum.amountCents ?? 0;
    }

    return NextResponse.json({
      ok: true,
      items: rows.map(serializeRow),
      totals,
    });
  } catch (e) {
    console.error('[admin/budget GET]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}

type PostBody = {
  spentAt?: unknown;
  category?: unknown;
  description?: unknown;
  amount?: unknown;
  currency?: unknown;
};

export async function POST(request: Request): Promise<NextResponse> {
  const path = new URL(request.url).pathname;
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatus.UNAUTHORIZED });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'DATABASE_URL is not configured' },
      { status: 503 },
    );
  }

  const body = await parseJsonBody<PostBody>(request);
  const descRaw = body?.description;
  const description =
    typeof descRaw === 'string'
      ? descRaw.trim()
      : typeof descRaw === 'number'
        ? String(descRaw)
        : '';
  if (!description || description.length > DESC_MAX) {
    return NextResponse.json(
      { ok: false, error: `description is required (max ${DESC_MAX} chars)` },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  let spentAt = new Date();
  if (body?.spentAt != null) {
    const s = typeof body.spentAt === 'string' ? body.spentAt.trim() : '';
    const d = parseSpentAt(s);
    if (!d) {
      return NextResponse.json({ ok: false, error: 'Invalid spentAt date' }, { status: 400 });
    }
    spentAt = d;
  }

  let category: string | null = null;
  if (body?.category != null) {
    const c = typeof body.category === 'string' ? body.category.trim() : '';
    if (c.length > CAT_MAX) {
      return NextResponse.json(
        { ok: false, error: `category max ${CAT_MAX} chars` },
        { status: HttpStatus.BAD_REQUEST },
      );
    }
    category = c.length ? c : null;
  }

  let currency = 'USD';
  if (body?.currency != null && typeof body.currency === 'string') {
    const cur = body.currency.trim().toUpperCase();
    if (!ALLOWED_CURRENCY.test(cur)) {
      return NextResponse.json(
        { ok: false, error: 'currency must be a 3-letter ISO code' },
        { status: HttpStatus.BAD_REQUEST },
      );
    }
    currency = cur;
  }

  const parsed = parseAmountToCents(body?.amount);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  try {
    const row = await prisma.adminBudgetExpense.create({
      data: {
        spentAt,
        category,
        description,
        amountCents: parsed.cents,
        currency,
      },
    });

    await writeAdminAudit(admin, 'budget.expense.create', {
      id: row.id,
      amountCents: row.amountCents,
      currency: row.currency,
    });

    const sums = await prisma.adminBudgetExpense.groupBy({
      by: ['currency'],
      _sum: { amountCents: true },
    });
    const totals: Record<string, number> = {};
    for (const g of sums) {
      totals[g.currency] = g._sum.amountCents ?? 0;
    }

    return NextResponse.json({ ok: true, item: serializeRow(row), totals });
  } catch (e) {
    console.error('[admin/budget POST]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}
