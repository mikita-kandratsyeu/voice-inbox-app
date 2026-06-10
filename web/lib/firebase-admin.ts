import * as admin from 'firebase-admin';

const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;

let initialized = false;

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(FIREBASE_SERVICE_ACCOUNT?.trim());
}

export function initFirebaseAdmin(): boolean {
  if (initialized) return admin.apps.length > 0;
  initialized = true;

  if (admin.apps.length > 0) return true;
  if (!FIREBASE_SERVICE_ACCOUNT?.trim()) return false;

  try {
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT) as admin.ServiceAccount;
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return true;
  } catch (err) {
    console.error('[firebase-admin] init failed:', err);
    return false;
  }
}

export function getFirebaseAdmin(): typeof admin | null {
  if (!initFirebaseAdmin()) return null;
  return admin;
}
