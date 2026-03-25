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

type PatchBody = {
  spentAt?: unknown;
  category?: unknown;
  description?: unknown;
  amount?: unknown;
  currency?: unknown;
};

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext): Promise<NextResponse> {
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

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
  }

  const body = await parseJsonBody<PatchBody>(request);
  if (!body) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const existing = await prisma.adminBudgetExpense.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  const data: {
    spentAt?: Date;
    category?: string | null;
    description?: string;
    amountCents?: number;
    currency?: string;
  } = {};

  if (body.spentAt !== undefined) {
    const s = typeof body.spentAt === 'string' ? body.spentAt.trim() : '';
    const d = s ? parseSpentAt(s) : null;
    if (!d) {
      return NextResponse.json({ ok: false, error: 'Invalid spentAt date' }, { status: 400 });
    }
    data.spentAt = d;
  }

  if (body.category !== undefined) {
    const c = typeof body.category === 'string' ? body.category.trim() : '';
    if (c.length > CAT_MAX) {
      return NextResponse.json(
        { ok: false, error: `category max ${CAT_MAX} chars` },
        { status: HttpStatus.BAD_REQUEST },
      );
    }
    data.category = c.length ? c : null;
  }

  if (body.description !== undefined) {
    const description =
      typeof body.description === 'string'
        ? body.description.trim()
        : typeof body.description === 'number'
          ? String(body.description)
          : '';
    if (!description || description.length > DESC_MAX) {
      return NextResponse.json(
        { ok: false, error: `description required (max ${DESC_MAX} chars)` },
        { status: HttpStatus.BAD_REQUEST },
      );
    }
    data.description = description;
  }

  if (body.amount !== undefined) {
    const parsed = parseAmountToCents(body.amount);
    if (!parsed.ok) {
      return NextResponse.json(
        { ok: false, error: parsed.error },
        { status: HttpStatus.BAD_REQUEST },
      );
    }
    data.amountCents = parsed.cents;
  }

  if (body.currency !== undefined) {
    const cur = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : '';
    if (!ALLOWED_CURRENCY.test(cur)) {
      return NextResponse.json(
        { ok: false, error: 'currency must be a 3-letter ISO code' },
        { status: HttpStatus.BAD_REQUEST },
      );
    }
    data.currency = cur;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: 'No fields to update' }, { status: 400 });
  }

  try {
    const row = await prisma.adminBudgetExpense.update({
      where: { id },
      data,
    });

    await writeAdminAudit(admin, 'budget.expense.update', { id: row.id });

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
    console.error('[admin/budget PATCH]', path, e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext): Promise<NextResponse> {
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

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
  }

  try {
    const existing = await prisma.adminBudgetExpense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    }

    await prisma.adminBudgetExpense.delete({ where: { id } });
    await writeAdminAudit(admin, 'budget.expense.delete', { id });

    const sums = await prisma.adminBudgetExpense.groupBy({
      by: ['currency'],
      _sum: { amountCents: true },
    });
    const totals: Record<string, number> = {};
    for (const g of sums) {
      totals[g.currency] = g._sum.amountCents ?? 0;
    }

    return NextResponse.json({ ok: true, totals });
  } catch (e) {
    console.error('[admin/budget DELETE]', path, e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}
