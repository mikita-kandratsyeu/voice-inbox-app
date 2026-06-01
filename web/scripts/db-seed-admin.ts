/**
 * Create the first superadmin when the database has no AdminUser rows.
 *
 * Usage (from web/):
 *   ADMIN_SEED_LOGIN=admin ADMIN_SEED_PASSWORD='…' yarn db:seed
 *
 * Idempotent: skips if any admin already exists.
 */

import bcrypt from 'bcryptjs';
import 'dotenv/config';

import { prisma } from '../lib/prisma';

const LOGIN_MAX = 64;
const PASSWORD_MIN = 10;
const PASSWORD_MAX = 128;

function validateLogin(login: string): string | null {
  if (login.length < 2 || login.length > LOGIN_MAX) return 'login length 2–64';
  if (!/^[a-zA-Z0-9._@-]+$/.test(login)) return 'login: letters, digits, . _ @ - only';
  return null;
}

function validatePassword(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `password at least ${PASSWORD_MIN} characters`;
  if (pw.length > PASSWORD_MAX) return 'password too long';
  return null;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is not set (see web/.env)');
  }

  const login = process.env.ADMIN_SEED_LOGIN?.trim() ?? '';
  const password = process.env.ADMIN_SEED_PASSWORD ?? '';

  if (!login || !password) {
    throw new Error('Set ADMIN_SEED_LOGIN and ADMIN_SEED_PASSWORD in the environment');
  }

  const loginError = validateLogin(login);
  if (loginError) throw new Error(loginError);
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);

  const existingCount = await prisma.adminUser.count();
  if (existingCount > 0) {
    console.log(`Skipped: ${existingCount} admin user(s) already exist`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const created = await prisma.adminUser.create({
    data: {
      login,
      passwordHash,
      isSuperadmin: true,
      permissions: [],
    },
    select: { id: true, login: true },
  });

  console.log(`Created superadmin: ${created.login} (${created.id})`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
