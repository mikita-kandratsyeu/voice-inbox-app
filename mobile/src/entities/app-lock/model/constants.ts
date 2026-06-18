export const DEFAULT_PIN_LENGTH = 6;
export const PIN_LENGTH_OPTIONS = [6, 4] as const;
export type PinLengthOption = (typeof PIN_LENGTH_OPTIONS)[number];

export const PIN_LOCKOUT_STEPS_MS = [5000, 15000, 60000] as const;

export const APP_LOCK_GRACE_PERIOD_OPTIONS = [0, 60_000, 300_000, 900_000] as const;
export type AppLockGracePeriodMs = (typeof APP_LOCK_GRACE_PERIOD_OPTIONS)[number];
export const DEFAULT_APP_LOCK_GRACE_PERIOD_MS: AppLockGracePeriodMs = 0;

export const BIOMETRY_LABELS: Record<string, string> = {
  FaceID: 'Face ID',
  TouchID: 'Touch ID',
  Fingerprint: 'Отпечаток пальца',
  Face: 'Распознавание лица',
  Iris: 'Радужная оболочка',
  OpticID: 'Optic ID',
};
