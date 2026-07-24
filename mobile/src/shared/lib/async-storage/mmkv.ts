import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({ id: 'voice-inbox-storage' });

export function getMmkvKeyCount(): number {
  return storage.getAllKeys().length;
}

export function clearMmkvStorage(): number {
  const count = getMmkvKeyCount();
  storage.clearAll();
  return count;
}
