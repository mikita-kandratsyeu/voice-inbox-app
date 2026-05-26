import { getAdminSession } from '@/lib/admin-session';
import { apiError, HttpStatus, parseJsonBody } from '@/lib/api';
import {
  buildVoucherPreviewPdfInput,
  parseVoucherRequestBody,
} from '@/lib/pro-license-voucher-shared';
import { renderVoucherPdf } from '@/lib/pro-license-voucher-pdf';

type PostBody = {
  durationMonths?: unknown;
  durationDays?: unknown;
  locale?: unknown;
  printSize?: unknown;
};

export async function POST(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname;
  const admin = await getAdminSession();
  if (!admin) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED, { pathname: path });
  }

  const body = await parseJsonBody<PostBody>(request);
  const parsed = parseVoucherRequestBody(body ?? {});
  if (parsed == null) {
    return apiError(
      'Provide exactly one of durationMonths (1, 3, 6, 12) or durationDays (1, 7, 14)',
      HttpStatus.BAD_REQUEST,
      { pathname: path },
    );
  }

  let pdf: Buffer;
  try {
    pdf = await renderVoucherPdf(
      buildVoucherPreviewPdfInput(parsed.spec, parsed.locale, parsed.printSize, {
        promoLabel: parsed.promoLabel,
        includeEnvelope: parsed.includeEnvelope,
      }),
    );
  } catch (e) {
    console.error('[admin/pro-licenses/vouchers/preview POST]', e);
    return apiError('Failed to render preview', HttpStatus.SERVICE_UNAVAILABLE, {
      pathname: path,
    });
  }

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="voucher-preview.pdf"',
      'Cache-Control': 'no-store',
    },
  });
}
