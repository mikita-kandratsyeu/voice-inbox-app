import { NextResponse, type NextRequest } from 'next/server';

import {
  buildProLicenseKeyEmail,
  type ProLicenseEmailDuration,
} from '@/lib/pro-license-email-template';

function parseDuration(req: NextRequest): ProLicenseEmailDuration {
  const monthsRaw = req.nextUrl.searchParams.get('months');
  const daysRaw = req.nextUrl.searchParams.get('days');
  const days = daysRaw != null ? Number.parseInt(daysRaw, 10) : NaN;

  if (Number.isFinite(days) && days > 0) {
    return { kind: 'days', days };
  }

  const months = monthsRaw != null ? Number.parseInt(monthsRaw, 10) : 12;
  const m = Number.isFinite(months) && months > 0 ? months : 12;

  return { kind: 'months', months: m };
}

/**
 * Renders the Pro license email HTML for local QA. Disabled in production.
 * Example: http://localhost:3000/api/dev/pro-license-email-preview?months=12&email=demo@example.com
 */
export function GET(req: NextRequest): NextResponse {
  console.log('NODE_ENV', process.env.NODE_ENV);
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const email = req.nextUrl.searchParams.get('email')?.trim() || 'you@example.com';
  const key = req.nextUrl.searchParams.get('key')?.trim() || 'SAMPLE-XXXX-XXXX-XXXX';

  const { html } = buildProLicenseKeyEmail({
    plainKey: key,
    duration: parseDuration(req),
    recipientEmail: email || null,
  });

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
