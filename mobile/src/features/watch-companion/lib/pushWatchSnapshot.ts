import { updateApplicationContext } from 'react-native-watch-connectivity';

import type { WatchSnapshot } from './watchPayload';

export async function pushWatchSnapshot(snapshot: WatchSnapshot): Promise<void> {
  const context = {
    updatedAt: snapshot.updatedAt,
    snapshotJson: JSON.stringify(snapshot),
    schemaVersion: snapshot.schemaVersion,
  };

  try {
    updateApplicationContext(context);
    // Success - snapshot pushed
  } catch (error) {
    console.error('[WatchCompanion] Failed to push snapshot:', error);
    throw error;
  }
}
