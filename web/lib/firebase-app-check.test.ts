import { HEADER_FIREBASE_APP_CHECK } from '@/config/constants';

import { requireAppCheckForToken } from './firebase-app-check';

const verifyToken = jest.fn();
const recordAppCheckFailure = jest.fn();

jest.mock('@/lib/firebase-admin', () => ({
  isFirebaseAdminConfigured: jest.fn(() => true),
  getFirebaseAdmin: jest.fn(() => ({
    appCheck: () => ({ verifyToken }),
  })),
}));

jest.mock('@/lib/api-telemetry', () => ({
  recordAppCheckFailure: (...args: unknown[]) => recordAppCheckFailure(...args),
}));

jest.mock('@/lib/firebase-app-check-app-ids', () => ({
  isAllowedFirebaseAppCheckAppId: jest.fn(() => true),
}));

describe('requireAppCheckForToken', () => {
  beforeEach(() => {
    verifyToken.mockReset();
    recordAppCheckFailure.mockReset();
    verifyToken.mockResolvedValue({ appId: '1:828265085007:ios:1e2559c39ffa5bdbced23a' });
  });

  it('rejects when header is missing', async () => {
    const response = await requireAppCheckForToken(new Request('https://example.com/api/token'));
    expect(response?.status).toBe(401);
    expect(verifyToken).not.toHaveBeenCalled();
    expect(recordAppCheckFailure).toHaveBeenCalledWith('missing');
  });

  it('accepts a valid App Check token', async () => {
    const request = new Request('https://example.com/api/token', {
      headers: { [HEADER_FIREBASE_APP_CHECK]: 'valid-token' },
    });

    const response = await requireAppCheckForToken(request);
    expect(response).toBeNull();
    expect(verifyToken).toHaveBeenCalledWith('valid-token');
    expect(recordAppCheckFailure).not.toHaveBeenCalled();
  });

  it('rejects when verification fails', async () => {
    verifyToken.mockRejectedValue(new Error('invalid'));

    const request = new Request('https://example.com/api/token', {
      headers: { [HEADER_FIREBASE_APP_CHECK]: 'bad-token' },
    });

    const response = await requireAppCheckForToken(request);
    expect(response?.status).toBe(401);
    expect(recordAppCheckFailure).toHaveBeenCalledWith('invalid');
  });
});
