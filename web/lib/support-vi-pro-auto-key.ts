import bcrypt from 'bcryptjs';

import {
  ALLOWED_PRO_LICENSE_DAYS,
  ALLOWED_PRO_LICENSE_MONTHS,
  type ProLicenseDurationSpec,
} from '@/lib/pro-license-admin';
import { prisma } from '@/lib/prisma';

const AUTO_KEY_LINE_RE = /^([^:\r\n]+):([^:\r\n]+):(\d+)([mMdD])\s*$/;

function parseDurationToken(numStr: string, unitRaw: string): ProLicenseDurationSpec | null {
  const n = parseInt(numStr, 10);
  if (!Number.isFinite(n)) return null;
  const u = unitRaw.toLowerCase();
  if (u === 'd' && ALLOWED_PRO_LICENSE_DAYS.has(n)) return { kind: 'days', days: n };
  if (u === 'm' && ALLOWED_PRO_LICENSE_MONTHS.has(n)) return { kind: 'months', months: n };
  return null;
}

export type ViProAutoKeyAttempt = {
  login: string;
  password: string;
  spec: ProLicenseDurationSpec;
};

/**
 * If the message contains a line with valid duration suffix (same values as admin UI),
 * that line is treated as admin credentials and removed from the stored text so passwords
 * are not persisted.
 */
export function extractAndRedactViProAutoKeyLine(message: string): {
  storedMessage: string;
  attempt: ViProAutoKeyAttempt | null;
} {
  const lines = message.split(/\r?\n/);
  let attempt: ViProAutoKeyAttempt | null = null;
  let lineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    const m = trimmed.match(AUTO_KEY_LINE_RE);
    if (!m) continue;
    const spec = parseDurationToken(m[3], m[4]);
    if (!spec) continue;
    attempt = { login: m[1].trim(), password: m[2], spec };
    lineIndex = i;
    break;
  }

  if (!attempt || lineIndex < 0) {
    return { storedMessage: message, attempt: null };
  }

  const redactedLine = lines[lineIndex].replace(
    lines[lineIndex].trim(),
    '[admin credentials removed]',
  );
  const newLines = lines.slice();
  newLines[lineIndex] = redactedLine;
  const storedMessage = newLines.join('\n');

  return { storedMessage, attempt };
}

export async function verifyAdminForViProAutoKey(
  login: string,
  password: string,
): Promise<{ adminId: string; login: string } | null> {
  const user = await prisma.adminUser.findUnique({ where: { login } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
  return { adminId: user.id, login: user.login };
}
