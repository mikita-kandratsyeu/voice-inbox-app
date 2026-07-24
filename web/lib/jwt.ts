import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN?.trim() || '4h';

export type AppTokenPayload = {
  deviceId: string;
  iat: number;
  exp: number;
};

const alg = 'HS256';

function getSecretKey(): Uint8Array {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters');
  }
  return new TextEncoder().encode(JWT_SECRET);
}

export async function signAppToken(deviceId: string): Promise<string> {
  const secret = getSecretKey();
  const jwt = await new jose.SignJWT({ deviceId })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secret);
  return jwt;
}

export async function verifyAppToken(token: string): Promise<AppTokenPayload | null> {
  try {
    const secret = getSecretKey();
    const { payload } = await jose.jwtVerify(token, secret);
    const deviceId = payload.deviceId;
    if (typeof deviceId !== 'string' || !deviceId.trim()) {
      return null;
    }
    return {
      deviceId: deviceId.trim(),
      iat: typeof payload.iat === 'number' ? payload.iat : 0,
      exp: typeof payload.exp === 'number' ? payload.exp : 0,
    };
  } catch {
    return null;
  }
}

export function getExpiresInSeconds(): number {
  const match = JWT_EXPIRES_IN.match(/^(\d+)(s|m|h|d)?$/);
  if (!match) return 4 * 3600;
  const value = parseInt(match[1], 10);
  const unit = match[2] ?? 's';
  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 4 * 3600;
  }
}
