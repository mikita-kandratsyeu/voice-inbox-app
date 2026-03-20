import type { AdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';

function trimPreview(s: string | null | undefined, max: number): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export async function writeBroadcastHistory(
  admin: AdminSession,
  input: {
    kind: 'broadcast' | 'single_device';
    notifyType: string;
    title?: string | null;
    body?: string | null;
    message?: string | null;
    sent: number;
    failed: number;
    total: number;
    errorSample?: string | null;
    deviceId?: string | null;
  },
): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  try {
    await prisma.broadcastHistory.create({
      data: {
        kind: input.kind,
        notifyType: input.notifyType,
        title: trimPreview(input.title, 200),
        bodyPreview: trimPreview(input.body, 500),
        messagePreview: trimPreview(input.message, 500),
        sent: input.sent,
        failed: input.failed,
        total: input.total,
        errorSample: input.errorSample?.trim() || null,
        adminId: admin.adminId,
        adminLogin: admin.login,
        deviceId: input.deviceId ?? null,
      },
    });
  } catch (e) {
    console.error('[broadcast-history-log]', e);
  }
}
