import { useCallback, useEffect, useState } from 'react';

import { useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import { useProEntitlement } from '@/features/pro-license';
import type { ImportResult } from '@/features/sync-data';

import { GITHUB_SYNC_DEFAULT_BRANCH } from '../lib/constants';
import { fetchGithubSyncHistory } from '../lib/fetchGithubSyncHistory';
import {
  createGithubRepo,
  fetchGithubUserLogin,
  type GithubCommitSummary,
  type GithubRepoSummary,
  listGithubRepos,
} from '../lib/githubApi';
import {
  cancelGithubDeviceFlow,
  type GithubDeviceFlowChallenge,
  isGithubOAuthConfigured,
  startGithubDeviceFlow,
} from '../lib/githubAuth';
import {
  clearGithubSyncSecrets,
  getGithubSyncSecrets,
  type GithubSyncSecrets,
  isGithubSyncConnected,
  setGithubSyncRepository,
} from '../lib/githubSecrets';
import { registerGithubConnectSession } from '../lib/githubSyncConnectSession';
import { runGithubSyncNow } from '../lib/githubSyncNow';
import { isGithubSyncSessionActive, subscribeGithubSyncSession } from '../lib/githubSyncSession';
import { clearGithubSyncState, getGithubSyncLastSyncedAt } from '../lib/githubSyncState';
import { pushGithubCommit } from '../lib/pushGithubCommit';
import { restoreGithubSyncVersion } from '../lib/restoreGithubSyncVersion';

function getGithubApiErrorStatus(err: unknown): number | undefined {
  if (err instanceof Error && 'status' in err && typeof err.status === 'number') {
    return err.status;
  }
  return undefined;
}

export function useGithubSync() {
  const { isProActive } = useProEntitlement();
  const records = useRecordStore((s) => s.records);
  const folders = useFolderStore((s) => s.folders);

  const [secrets, setSecrets] = useState<GithubSyncSecrets | null>(null);
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectChallenge, setConnectChallenge] = useState<GithubDeviceFlowChallenge | null>(null);
  const [isSyncing, setIsSyncing] = useState(isGithubSyncSessionActive());
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(getGithubSyncLastSyncedAt());
  const [repos, setRepos] = useState<GithubRepoSummary[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [history, setHistory] = useState<GithubCommitSummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const oauthConfigured = isGithubOAuthConfigured();

  const refreshSecrets = useCallback(async () => {
    const next = await getGithubSyncSecrets();
    setSecrets(next);
    setConnected(await isGithubSyncConnected());
    setLastSyncedAt(getGithubSyncLastSyncedAt());
  }, []);

  useEffect(() => {
    void refreshSecrets();
  }, [refreshSecrets]);

  useEffect(() => {
    return subscribeGithubSyncSession(() => {
      const active = isGithubSyncSessionActive();
      setIsSyncing(active);
      if (!active) {
        setLastSyncedAt(getGithubSyncLastSyncedAt());
      }
    });
  }, []);

  const cancelConnect = useCallback(() => {
    cancelGithubDeviceFlow();
    setConnectChallenge(null);
    setIsConnecting(false);
  }, []);

  useEffect(() => {
    const unregister = registerGithubConnectSession(cancelConnect);
    return () => {
      unregister();
      cancelConnect();
    };
  }, [cancelConnect]);

  const connectGithub = useCallback(async () => {
    if (!isProActive) {
      return { ok: false as const, code: 'pro_required' };
    }
    if (!oauthConfigured) {
      return { ok: false as const, code: 'oauth_not_configured' };
    }
    setIsConnecting(true);
    setConnectChallenge(null);
    try {
      await startGithubDeviceFlow((challenge) => {
        setConnectChallenge(challenge);
      });
      await refreshSecrets();
      return { ok: true as const };
    } catch (err) {
      const code = err instanceof Error ? err.message : 'connect_failed';
      if (code === 'device_flow_cancelled') {
        return { ok: false as const, code: 'cancelled' };
      }
      return { ok: false as const, code };
    } finally {
      setConnectChallenge(null);
      setIsConnecting(false);
    }
  }, [isProActive, oauthConfigured, refreshSecrets]);

  const loadRepos = useCallback(async () => {
    const current = await getGithubSyncSecrets();
    if (!current?.accessToken) {
      return { ok: false as const, code: 'not_connected' };
    }
    setIsLoadingRepos(true);
    try {
      const listed = await listGithubRepos(current.accessToken);
      setRepos(listed);
      return { ok: true as const, repos: listed };
    } catch (err) {
      if (getGithubApiErrorStatus(err) === 401) {
        await clearGithubSyncSecrets();
        setSecrets(null);
        setConnected(false);
        setRepos([]);
        return { ok: false as const, code: 'unauthorized' };
      }
      return { ok: false as const, code: 'failed' };
    } finally {
      setIsLoadingRepos(false);
    }
  }, []);

  const selectRepository = useCallback(
    async (repo: GithubRepoSummary) => {
      await setGithubSyncRepository({
        owner: repo.owner,
        repo: repo.name,
        branch: GITHUB_SYNC_DEFAULT_BRANCH,
      });
      await refreshSecrets();
    },
    [refreshSecrets],
  );

  const createAndSelectRepository = useCallback(
    async (name: string) => {
      const current = await getGithubSyncSecrets();
      if (!current?.accessToken) {
        throw new Error('not_connected');
      }
      const created = await createGithubRepo(current.accessToken, name, true);
      await setGithubSyncRepository({
        owner: created.owner,
        repo: created.name,
        branch: GITHUB_SYNC_DEFAULT_BRANCH,
      });
      await refreshSecrets();
      return created;
    },
    [refreshSecrets],
  );

  const disconnect = useCallback(async () => {
    await clearGithubSyncSecrets();
    clearGithubSyncState();
    setSecrets(null);
    setConnected(false);
    setRepos([]);
    setHistory([]);
    setLastSyncedAt(null);
  }, []);

  const syncNow = useCallback(async () => {
    const current = await getGithubSyncSecrets();
    const result = await runGithubSyncNow({
      isProActive,
      isConnected: current != null,
      push: async () => {
        if (!current) {
          return { ok: false as const, code: 'not_connected' };
        }
        return pushGithubCommit({
          secrets: current,
          records,
          folders,
        });
      },
    });
    if (result.ok) {
      setLastSyncedAt(getGithubSyncLastSyncedAt());
    } else if (result.code === 'unauthorized') {
      await clearGithubSyncSecrets();
      setSecrets(null);
      setConnected(false);
    }
    return result;
  }, [folders, isProActive, records]);

  const loadHistory = useCallback(async () => {
    const current = await getGithubSyncSecrets();
    if (!current) {
      return { ok: false as const, code: 'not_connected' };
    }
    setIsLoadingHistory(true);
    try {
      const commits = await fetchGithubSyncHistory(current);
      setHistory(commits);
      return { ok: true as const, commits };
    } catch (err) {
      if (getGithubApiErrorStatus(err) === 401) {
        await clearGithubSyncSecrets();
        setSecrets(null);
        setConnected(false);
        setHistory([]);
        return { ok: false as const, code: 'unauthorized' };
      }
      return { ok: false as const, code: 'failed' };
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const restoreVersion = useCallback(
    async (
      commitSha: string,
    ): Promise<
      | { ok: true; importResult: Extract<ImportResult, { success: true }> }
      | { ok: false; code: string; message?: string }
    > => {
      if (!isProActive) {
        return { ok: false, code: 'pro_required' };
      }
      const current = await getGithubSyncSecrets();
      if (!current) {
        return { ok: false, code: 'not_connected' };
      }
      setIsRestoring(true);
      try {
        return await restoreGithubSyncVersion({ secrets: current, commitSha });
      } finally {
        setIsRestoring(false);
      }
    },
    [isProActive],
  );

  const resolveDefaultOwner = useCallback(async () => {
    const current = await getGithubSyncSecrets();
    if (!current?.accessToken) return null;
    return fetchGithubUserLogin(current.accessToken);
  }, []);

  return {
    isProActive,
    oauthConfigured,
    secrets,
    connected,
    isConnecting,
    connectChallenge,
    isSyncing,
    isRestoring,
    lastSyncedAt,
    repos,
    isLoadingRepos,
    history,
    isLoadingHistory,
    connectGithub,
    cancelConnect,
    loadRepos,
    selectRepository,
    createAndSelectRepository,
    disconnect,
    syncNow,
    loadHistory,
    restoreVersion,
    resolveDefaultOwner,
    refreshSecrets,
  };
}
