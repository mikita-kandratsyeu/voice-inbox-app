import { writeAdminAudit } from '@/lib/admin-audit';
import { parseAmountToCents } from '@/lib/admin-budget-money';
import { getAdminSession } from '@/lib/admin-session';
import { ApiErrorCode } from '@/lib/api-error-codes';
import { apiError, HttpStatus } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import {
  adminBudgetCreateBodySchema,
  adminBudgetPatchBodySchema,
} from '@/server/api/schemas/admin-budget.schema';
import { zodValidationErrorResponse } from '@/server/api/schemas/zod-api-error';
import { NextResponse } from 'next/server';

const LIST_PATH = '/api/admin/budget';

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

export async function getAdminBudgetList(): Promise<NextResponse> {
  const admin = await getAdminSession();
  if (!admin) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED, {
      pathname: LIST_PATH,
      code: ApiErrorCode.Unauthorized,
    });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return apiError('DATABASE_URL is not configured', HttpStatus.SERVICE_UNAVAILABLE, {
      pathname: LIST_PATH,
      code: ApiErrorCode.ServiceUnavailable,
    });
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
    return apiError('Database error', HttpStatus.SERVICE_UNAVAILABLE, {
      pathname: LIST_PATH,
      code: ApiErrorCode.AdminDatabaseError,
    });
  }
}

export async function postAdminBudgetExpense(request: Request): Promise<NextResponse> {
  const admin = await getAdminSession();
  if (!admin) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED, {
      pathname: LIST_PATH,
      code: ApiErrorCode.Unauthorized,
    });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return apiError('DATABASE_URL is not configured', HttpStatus.SERVICE_UNAVAILABLE, {
      pathname: LIST_PATH,
      code: ApiErrorCode.ServiceUnavailable,
    });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('Invalid JSON', HttpStatus.BAD_REQUEST, {
      pathname: LIST_PATH,
      code: ApiErrorCode.InvalidJson,
    });
  }

  const zParsed = adminBudgetCreateBodySchema.safeParse(raw);
  if (!zParsed.success) {
    return zodValidationErrorResponse(LIST_PATH, zParsed.error);
  }
  const body = zParsed.data;

  const description = body.description;

  let spentAt = new Date();
  if (body.spentAt != null && body.spentAt.trim() !== '') {
    const d = parseSpentAt(body.spentAt.trim());
    if (!d) {
      return apiError('Invalid spentAt date', HttpStatus.BAD_REQUEST, {
        pathname: LIST_PATH,
        code: ApiErrorCode.ValidationError,
      });
    }
    spentAt = d;
  }

  let category: string | null = null;
  if (body.category !== undefined && body.category !== null) {
    const c = body.category.trim();
    category = c.length ? c : null;
  }

  let currency = 'USD';
  if (body.currency != null) {
    currency = body.currency;
  }

  const parsed = parseAmountToCents(body.amount);
  if (!parsed.ok) {
    return apiError(parsed.error, HttpStatus.BAD_REQUEST, {
      pathname: LIST_PATH,
      code: ApiErrorCode.ValidationError,
    });
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
    return apiError('Database error', HttpStatus.SERVICE_UNAVAILABLE, {
      pathname: LIST_PATH,
      code: ApiErrorCode.AdminDatabaseError,
    });
  }
}

type BudgetIdParams = { params: Promise<{ id: string }> };

export async function patchAdminBudgetExpense(
  request: Request,
  { params }: BudgetIdParams,
): Promise<NextResponse> {
  const pathname = new URL(request.url).pathname;
  const admin = await getAdminSession();
  if (!admin) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED, {
      pathname,
      code: ApiErrorCode.Unauthorized,
    });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return apiError('DATABASE_URL is not configured', HttpStatus.SERVICE_UNAVAILABLE, {
      pathname,
      code: ApiErrorCode.ServiceUnavailable,
    });
  }

  const { id } = await params;
  if (!id?.trim()) {
    return apiError('Missing id', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.ValidationError,
    });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('Invalid JSON', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.InvalidJson,
    });
  }

  const zParsed = adminBudgetPatchBodySchema.safeParse(raw);
  if (!zParsed.success) {
    return zodValidationErrorResponse(pathname, zParsed.error);
  }
  const body = zParsed.data;

  const existing = await prisma.adminBudgetExpense.findUnique({ where: { id } });
  if (!existing) {
    return apiError('Not found', HttpStatus.NOT_FOUND, {
      pathname,
      code: ApiErrorCode.NotFound,
    });
  }

  const data: {
    spentAt?: Date;
    category?: string | null;
    description?: string;
    amountCents?: number;
    currency?: string;
  } = {};

  if (body.spentAt !== undefined) {
    const s = body.spentAt.trim();
    const d = s ? parseSpentAt(s) : null;
    if (!d) {
      return apiError('Invalid spentAt date', HttpStatus.BAD_REQUEST, {
        pathname,
        code: ApiErrorCode.ValidationError,
      });
    }
    data.spentAt = d;
  }

  if (body.category !== undefined) {
    if (body.category === null) {
      data.category = null;
    } else {
      const c = body.category.trim();
      data.category = c.length ? c : null;
    }
  }

  if (body.description !== undefined) {
    data.description = body.description;
  }

  if (body.amount !== undefined) {
    const parsed = parseAmountToCents(body.amount);
    if (!parsed.ok) {
      return apiError(parsed.error, HttpStatus.BAD_REQUEST, {
        pathname,
        code: ApiErrorCode.ValidationError,
      });
    }
    data.amountCents = parsed.cents;
  }

  if (body.currency !== undefined) {
    data.currency = body.currency;
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
    console.error('[admin/budget PATCH]', pathname, e);
    return apiError('Database error', HttpStatus.SERVICE_UNAVAILABLE, {
      pathname,
      code: ApiErrorCode.AdminDatabaseError,
    });
  }
}

export async function deleteAdminBudgetExpense(
  request: Request,
  { params }: BudgetIdParams,
): Promise<NextResponse> {
  const pathname = new URL(request.url).pathname;
  const admin = await getAdminSession();
  if (!admin) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED, {
      pathname,
      code: ApiErrorCode.Unauthorized,
    });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return apiError('DATABASE_URL is not configured', HttpStatus.SERVICE_UNAVAILABLE, {
      pathname,
      code: ApiErrorCode.ServiceUnavailable,
    });
  }

  const { id } = await params;
  if (!id?.trim()) {
    return apiError('Missing id', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.ValidationError,
    });
  }

  try {
    const existing = await prisma.adminBudgetExpense.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Not found', HttpStatus.NOT_FOUND, {
        pathname,
        code: ApiErrorCode.NotFound,
      });
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
    console.error('[admin/budget DELETE]', pathname, e);
    return apiError('Database error', HttpStatus.SERVICE_UNAVAILABLE, {
      pathname,
      code: ApiErrorCode.AdminDatabaseError,
    });
  }
}
