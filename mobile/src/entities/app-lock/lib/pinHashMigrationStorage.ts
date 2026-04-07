import { storage } from '@/shared/lib/async-storage';

const KEY = 'app-lock.pin-hash-needs-reset';

export function getPinHashNeedsReset(): boolean {
  return storage.getBoolean(KEY) ?? false;
}

export function setPinHashNeedsReset(value: boolean): void {
  storage.set(KEY, value);
}
