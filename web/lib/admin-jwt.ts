import * as jose from 'jose';

const ADMIN_JWT_EXPIRES_IN = process.env.ADMIN_JWT_EXPIRES_IN?.trim() || '24h';

const alg = 'HS256';

export type AdminJwtPayload = {
  adminId: string;
  login: string;
  typ: 'admin_session';
};

function getAdminSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET?.trim() || process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error('ADMIN_JWT_SECRET (or JWT_SECRET fallback) must be at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

export async function signAdminSessionToken(adminId: string, login: string): Promise<string> {
  const secret = getAdminSecretKey();
  return new jose.SignJWT({
    adminId,
    login,
    typ: 'admin_session' as const,
  })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(ADMIN_JWT_EXPIRES_IN)
    .sign(secret);
}

export async function verifyAdminSessionToken(token: string): Promise<AdminJwtPayload | null> {
  try {
    const secret = getAdminSecretKey();
    const { payload } = await jose.jwtVerify(token, secret);
    if (payload.typ !== 'admin_session') {
      return null;
    }
    const adminId = typeof payload.adminId === 'string' ? payload.adminId.trim() : '';
    const login = typeof payload.login === 'string' ? payload.login.trim() : '';
    if (!adminId || !login) {
      return null;
    }
    return { adminId, login, typ: 'admin_session' };
  } catch {
    return null;
  }
}
