type TtlEntry = { value: string; expiresAt: number };
type CounterEntry = { count: number; expiresAt: number };

const kvStore = new Map<string, TtlEntry>();
const counterStore = new Map<string, CounterEntry>();

const cleanupExpired = (): void => {
  const now = Date.now();
  for (const [k, v] of kvStore) {
    if (v.expiresAt > 0 && v.expiresAt <= now) kvStore.delete(k);
  }
  for (const [k, v] of counterStore) {
    if (v.expiresAt <= now) counterStore.delete(k);
  }
};

export const memoryStore = {
  set: async (key: string, value: string, options?: { ex?: number }): Promise<void> => {
    const expiresAt = options?.ex ? Date.now() + options.ex * 1000 : 0;
    kvStore.set(key, { value, expiresAt });
  },

  get: async (key: string): Promise<string | null> => {
    cleanupExpired();
    const counterEntry = counterStore.get(key);

    if (counterEntry && counterEntry.expiresAt > Date.now()) {
      return String(counterEntry.count);
    }

    const entry = kvStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt > 0 && entry.expiresAt <= Date.now()) {
      kvStore.delete(key);
      return null;
    }

    return entry.value;
  },

  incr: async (key: string): Promise<number> => {
    cleanupExpired();
    const entry = counterStore.get(key);
    const now = Date.now();
    if (!entry || entry.expiresAt <= now) {
      counterStore.set(key, { count: 1, expiresAt: now + 60_000 });
      return 1;
    }
    entry.count += 1;
    return entry.count;
  },

  decr: async (key: string): Promise<number> => {
    cleanupExpired();
    const entry = counterStore.get(key);
    const now = Date.now();

    if (!entry || entry.expiresAt <= now) return 0;
    entry.count = Math.max(0, entry.count - 1);

    return entry.count;
  },

  expire: async (key: string, seconds: number): Promise<void> => {
    const entry = counterStore.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + seconds * 1000;
    }
  },

  setIfNotExists: async (
    key: string,
    value: string,
    options?: { ex?: number },
  ): Promise<boolean> => {
    cleanupExpired();
    const entry = kvStore.get(key);
    if (entry && (entry.expiresAt === 0 || entry.expiresAt > Date.now())) {
      return false;
    }

    const expiresAt = options?.ex ? Date.now() + options.ex * 1000 : 0;
    kvStore.set(key, { value, expiresAt });

    return true;
  },

  del: async (key: string): Promise<void> => {
    kvStore.delete(key);
    counterStore.delete(key);
  },
};
