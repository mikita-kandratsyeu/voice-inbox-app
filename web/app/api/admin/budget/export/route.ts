import { NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toDateOnlyIso(iso: string): string {
  return iso.slice(0, 10);
}

function formatAmountWithCurrency(amountCents: number, currency: string): string {
  const upperCurrency = currency.toUpperCase();
  let fractionDigits = 2;
  try {
    const resolved = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: upperCurrency,
    }).resolvedOptions();
    fractionDigits = resolved.maximumFractionDigits ?? 2;
  } catch {
    fractionDigits = 2;
  }
  const amount = amountCents / 10 ** fractionDigits;
  return `${amount.toFixed(fractionDigits)} ${upperCurrency}`;
}

export async function GET(): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const header = 'id,spentAt,category,description,amount,currency,createdAt,updatedAt\n';

  const rows: string[] = [];
  const batch = 200;
  let skip = 0;

  try {
    for (;;) {
      const chunk = await prisma.adminBudgetExpense.findMany({
        orderBy: [{ spentAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        skip,
        take: batch,
        select: {
          id: true,
          spentAt: true,
          category: true,
          description: true,
          amountCents: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (chunk.length === 0) break;
      for (const r of chunk) {
        rows.push(
          [
            csvEscape(r.id),
            csvEscape(toDateOnlyIso(r.spentAt.toISOString())),
            csvEscape(r.category ?? ''),
            csvEscape(r.description),
            csvEscape(formatAmountWithCurrency(r.amountCents, r.currency)),
            csvEscape(r.currency),
            csvEscape(r.createdAt.toISOString()),
            csvEscape(r.updatedAt.toISOString()),
          ].join(','),
        );
      }
      skip += batch;
    }
  } catch (e) {
    console.error('[admin/budget/export]', e);
    return NextResponse.json({ ok: false, error: 'Export failed' }, { status: 503 });
  }

  const body = header + rows.join('\n') + '\n';
  const filename = `admin-budget-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
