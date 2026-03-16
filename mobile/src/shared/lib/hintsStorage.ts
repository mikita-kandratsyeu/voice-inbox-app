import { storage } from '@/shared/lib/async-storage';

const KEY_HAS_SEEN_SWIPE_HINT = 'hints.hasSeenSwipeHint';

export const getHasSeenSwipeHint = (): boolean =>
  storage.getBoolean(KEY_HAS_SEEN_SWIPE_HINT) ?? false;

export const setHasSeenSwipeHint = (): void => {
  storage.set(KEY_HAS_SEEN_SWIPE_HINT, true);
};
