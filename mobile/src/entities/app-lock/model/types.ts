export type AppLockState = {
  isEnabled: boolean;
  useBiometrics: boolean;
  isLocked: boolean;
  pinLength: number;
  biometryType: BiometryType | null;
  setEnabled: (enabled: boolean) => Promise<void>;
  setUseBiometrics: (use: boolean) => Promise<void>;
  setPinLength: (length: number) => void;
  setLocked: (locked: boolean) => void;
  setPin: (pin: string) => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  lock: () => Promise<void>;
  unlock: () => void;
  checkBiometryAvailable: () => Promise<BiometryType | null>;
  removePin: () => Promise<void>;
};

export type BiometryType = 'FaceID' | 'TouchID' | 'Fingerprint' | 'Face' | 'Iris' | 'OpticID';
