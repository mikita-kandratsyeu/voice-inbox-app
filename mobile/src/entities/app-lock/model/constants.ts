export const DEFAULT_PIN_LENGTH = 4;
export const PIN_LENGTH_OPTIONS = [4, 6] as const;
export type PinLengthOption = (typeof PIN_LENGTH_OPTIONS)[number];

export const BIOMETRY_LABELS: Record<string, string> = {
  FaceID: 'Face ID',
  TouchID: 'Touch ID',
  Fingerprint: 'Отпечаток пальца',
  Face: 'Распознавание лица',
  Iris: 'Радужная оболочка',
  OpticID: 'Optic ID',
};
