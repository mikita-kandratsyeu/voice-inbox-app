import { SignJWT, jwtVerify } from 'jose';

const JWT_AUDIENCE = 'pro_account_portal';

function getPortalSecretKey(): Uint8Array | null {
  const raw = (process.env.PRO_ACCOUNT_PORTAL_SECRET ?? process.env.APP_SECRET ?? '').trim();

  if (!raw) {
    return null;
  }

  return new TextEncoder().encode(raw);
}

export function isProAccountPortalConfigured(): boolean {
  return getPortalSecretKey() != null;
}

export async function createProAccountPortalToken(deviceId: string): Promise<string | null> {
  const secret = getPortalSecretKey();

  if (!secret) {
    return null;
  }

  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(deviceId)
    .setIssuedAt()
    .setExpirationTime('15m')
    .setAudience(JWT_AUDIENCE)
    .sign(secret);
}

export async function verifyProAccountPortalToken(token: string): Promise<string | null> {
  const secret = getPortalSecretKey();
  if (!secret) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret, { audience: JWT_AUDIENCE });
    const sub = payload.sub;

    return typeof sub === 'string' && sub.trim() ? sub.trim() : null;
  } catch {
    return null;
  }
}
