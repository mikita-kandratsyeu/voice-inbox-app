import { HEADER_FIREBASE_APP_CHECK } from '@/config/constants';

import { requireAppCheckForToken } from './firebase-app-check';

const verifyToken = jest.fn();

jest.mock('@/lib/firebase-admin', () => ({
  isFirebaseAdminConfigured: jest.fn(() => true),
  getFirebaseAdmin: jest.fn(() => ({
    appCheck: () => ({ verifyToken }),
  })),
}));

describe('requireAppCheckForToken', () => {
  beforeEach(() => {
    verifyToken.mockReset();
    verifyToken.mockResolvedValue({ appId: 'test' });
  });

  it('rejects when header is missing', async () => {
    const response = await requireAppCheckForToken(new Request('https://example.com/api/token'));
    expect(response?.status).toBe(401);
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it('accepts a valid App Check token', async () => {
    const request = new Request('https://example.com/api/token', {
      headers: { [HEADER_FIREBASE_APP_CHECK]: 'valid-token' },
    });

    const response = await requireAppCheckForToken(request);
    expect(response).toBeNull();
    expect(verifyToken).toHaveBeenCalledWith('valid-token');
  });

  it('rejects when verification fails', async () => {
    verifyToken.mockRejectedValue(new Error('invalid'));

    const request = new Request('https://example.com/api/token', {
      headers: { [HEADER_FIREBASE_APP_CHECK]: 'bad-token' },
    });

    const response = await requireAppCheckForToken(request);
    expect(response?.status).toBe(401);
  });
});
