import { useCallback, useEffect, useRef, useState } from 'react';

import { useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import { useProEntitlement } from '@/features/pro-license';
import type { ImportResult } from '@/features/sync-data';

import { GITHUB_SYNC_DEFAULT_BRANCH } from '../lib/constants';
import { fetchGithubSyncHistory } from '../lib/fetchGithubSyncHistory';
import {
  createGithubRepo,
  deleteGithubBranch,
  ensureGithubBranchExists,
  fetchGithubUserLogin,
  getGithubRepoDefaultBranch,
  type GithubBranchSummary,
  type GithubCommitSummary,
  type GithubRepoSummary,
  listGithubBranches,
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
  setGithubSyncBranch,
  setGithubSyncRepository,
} from '../lib/githubSecrets';
import { isValidGithubSyncBranchName, normalizeGithubSyncBranchName } from '../lib/githubSyncBranch';
import {
  buildGithubBranchList,
  unionGithubBranchLists,
  withoutGithubBranch,
} from '../lib/mergeGithubBranchList';
import { registerGithubConnectSession } from '../lib/githubSyncConnectSession';
import { beginGithubSyncProgress, endGithubSyncProgress } from '../lib/githubSyncProgress';
import { runGithubSyncNow } from '../lib/githubSyncNow';
import { isGithubSyncSessionActive, subscribeGithubSyncSession } from '../lib/githubSyncSession';
import {
  clearGithubSyncState,
  getGithubSyncAutoEnabled,
  getGithubSyncAutoIntervalHours,
  getGithubSyncLastSyncedAt,
  getGithubSyncLogin,
  setGithubSyncAutoEnabled,
  setGithubSyncAutoIntervalHours,
  setGithubSyncLogin,
  type GithubSyncAutoIntervalHours,
} from '../lib/githubSyncState';
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
  const [branches, setBranches] = useState<GithubBranchSummary[]>([]);
  const [repoDefaultBranch, setRepoDefaultBranch] = useState<string | null>(null);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [history, setHistory] = useState<GithubCommitSummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [githubLogin, setGithubLogin] = useState<string | null>(getGithubSyncLogin());
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(getGithubSyncAutoEnabled());
  const [autoSyncIntervalHours, setAutoSyncIntervalHours] = useState(
    getGithubSyncAutoIntervalHours(),
  );
  /** Branches removed locally while GitHub list may still be stale. */
  const excludedBranchesRef = useRef<Set<string>>(new Set());
  /** Branches seen locally but not yet returned by GitHub list API. */
  const knownBranchesRef = useRef<Set<string>>(new Set());
  const oauthConfigured = isGithubOAuthConfigured();

  const persistGithubLogin = useCallback(async (accessToken: string) => {
    try {
      const login = await fetchGithubUserLogin(accessToken);
      setGithubSyncLogin(login);
      setGithubLogin(login);
      return login;
    } catch {
      return null;
    }
  }, []);

  const refreshSecrets = useCallback(async () => {
    const next = await getGithubSyncSecrets();
    setSecrets(next);
    setConnected(await isGithubSyncConnected());
    setLastSyncedAt(getGithubSyncLastSyncedAt());
    setGithubLogin(getGithubSyncLogin());
    setAutoSyncEnabled(getGithubSyncAutoEnabled());
    setAutoSyncIntervalHours(getGithubSyncAutoIntervalHours());
    if (next?.accessToken && !getGithubSyncLogin()) {
      await persistGithubLogin(next.accessToken);
    }
  }, [persistGithubLogin]);

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
      const nextSecrets = await getGithubSyncSecrets();
      if (nextSecrets?.accessToken) {
        await persistGithubLogin(nextSecrets.accessToken);
      }
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
  }, [isProActive, oauthConfigured, persistGithubLogin, refreshSecrets]);

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
    excludedBranchesRef.current.clear();
    knownBranchesRef.current.clear();
    setSecrets(null);
    setConnected(false);
    setRepos([]);
    setBranches([]);
    setHistory([]);
    setLastSyncedAt(null);
    setGithubLogin(null);
  }, []);

  const resolveBranchList = useCallback(
    (
      listed: GithubBranchSummary[],
      activeBranch: string,
      options?: { pruneExcluded?: boolean },
    ) => {
      const apiNameSet = new Set(listed.map((item) => item.name));

      for (const item of listed) {
        knownBranchesRef.current.add(item.name);
      }
      const trimmedActive = activeBranch.trim();
      if (trimmedActive) {
        knownBranchesRef.current.add(trimmedActive);
      }
      for (const excluded of excludedBranchesRef.current) {
        knownBranchesRef.current.delete(excluded);
      }

      const supplementalNames = [...knownBranchesRef.current].filter(
        (name) => !apiNameSet.has(name) && !excludedBranchesRef.current.has(name),
      );
      const combined = unionGithubBranchLists(
        listed,
        supplementalNames.map((name) => ({ name })),
      );
      const merged = buildGithubBranchList(combined, activeBranch, excludedBranchesRef.current);

      if (options?.pruneExcluded === true) {
        for (const excluded of [...excludedBranchesRef.current]) {
          if (listed.some((item) => item.name === excluded)) {
            continue;
          }
          excludedBranchesRef.current.delete(excluded);
        }
      }
      return merged;
    },
    [],
  );

  const loadBranches = useCallback(async () => {
    const current = await getGithubSyncSecrets();
    if (!current?.accessToken || !current.owner || !current.repo) {
      return { ok: false as const, code: 'not_connected' };
    }
    setIsLoadingBranches(true);
    try {
      const [listed, defaultBranch] = await Promise.all([
        listGithubBranches(current.accessToken, current.owner, current.repo),
        getGithubRepoDefaultBranch(current.accessToken, current.owner, current.repo),
      ]);
      setRepoDefaultBranch(defaultBranch);
      const merged = resolveBranchList(listed, current.branch, { pruneExcluded: true });
      setBranches(merged);
      return { ok: true as const, branches: merged };
    } catch (err) {
      if (getGithubApiErrorStatus(err) === 401) {
        await clearGithubSyncSecrets();
        setSecrets(null);
        setConnected(false);
        setBranches([]);
        return { ok: false as const, code: 'unauthorized' };
      }
      return { ok: false as const, code: 'failed' };
    } finally {
      setIsLoadingBranches(false);
    }
  }, [resolveBranchList]);

  const syncNow = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true;
      const current = await getGithubSyncSecrets();
      if (!silent) {
        beginGithubSyncProgress(true);
      }
      try {
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
              reportProgress: !silent,
            });
          },
        });
        if (result.ok) {
          setLastSyncedAt(getGithubSyncLastSyncedAt());
        } else if (result.code === 'unauthorized') {
          await clearGithubSyncSecrets();
          clearGithubSyncState();
          setSecrets(null);
          setConnected(false);
          setGithubLogin(null);
        }
        return result;
      } finally {
        if (!silent) {
          endGithubSyncProgress();
        }
      }
    },
    [folders, isProActive, records],
  );

  const updateBranch = useCallback(
    async (branch: string) => {
      const normalized = normalizeGithubSyncBranchName(branch);
      if (!isValidGithubSyncBranchName(normalized)) {
        return { ok: false as const, code: 'invalid_branch' };
      }
      const current = await getGithubSyncSecrets();
      if (!current) {
        return { ok: false as const, code: 'not_connected' };
      }
      try {
        await ensureGithubBranchExists(
          current.accessToken,
          current.owner,
          current.repo,
          normalized,
        );
        knownBranchesRef.current.add(normalized);
        await setGithubSyncBranch(normalized);
        await refreshSecrets();
        const apiListed = await listGithubBranches(
          current.accessToken,
          current.owner,
          current.repo,
        );
        const listed = resolveBranchList(apiListed, normalized, { pruneExcluded: true });
        setBranches(listed);
        return { ok: true as const };
      } catch (err) {
        if (getGithubApiErrorStatus(err) === 401) {
          await clearGithubSyncSecrets();
          setSecrets(null);
          setConnected(false);
          setBranches([]);
          return { ok: false as const, code: 'unauthorized' };
        }
        return { ok: false as const, code: 'failed' };
      }
    },
    [refreshSecrets, resolveBranchList],
  );

  const deleteBranch = useCallback(
    async (branchName: string) => {
      const normalized = normalizeGithubSyncBranchName(branchName);
      if (!isValidGithubSyncBranchName(normalized)) {
        return { ok: false as const, code: 'invalid_branch' };
      }
      const current = await getGithubSyncSecrets();
      if (!current) {
        return { ok: false as const, code: 'not_connected' };
      }
      if (normalized === current.branch) {
        return { ok: false as const, code: 'active_branch' };
      }
      try {
        const defaultBranch =
          repoDefaultBranch ??
          (await getGithubRepoDefaultBranch(
            current.accessToken,
            current.owner,
            current.repo,
          ));
        setRepoDefaultBranch(defaultBranch);
        if (normalized === defaultBranch) {
          return { ok: false as const, code: 'default_branch' };
        }

        excludedBranchesRef.current.add(normalized);
        knownBranchesRef.current.delete(normalized);
        setBranches((prev) => withoutGithubBranch(prev, normalized));

        await deleteGithubBranch(
          current.accessToken,
          current.owner,
          current.repo,
          normalized,
        );

        const listed = await listGithubBranches(
          current.accessToken,
          current.owner,
          current.repo,
        );
        setBranches(resolveBranchList(listed, current.branch, { pruneExcluded: true }));
        return { ok: true as const };
      } catch (err) {
        excludedBranchesRef.current.delete(normalized);
        if (getGithubApiErrorStatus(err) === 401) {
          await clearGithubSyncSecrets();
          setSecrets(null);
          setConnected(false);
          setBranches([]);
          return { ok: false as const, code: 'unauthorized' };
        }
        try {
          const listed = await listGithubBranches(
            current.accessToken,
            current.owner,
            current.repo,
          );
          setBranches(resolveBranchList(listed, current.branch, { pruneExcluded: true }));
        } catch {
          setBranches((prev) => prev);
        }
        return { ok: false as const, code: 'failed' };
      }
    },
    [repoDefaultBranch, resolveBranchList],
  );

  const setAutoSyncEnabledState = useCallback((enabled: boolean) => {
    setGithubSyncAutoEnabled(enabled);
    setAutoSyncEnabled(enabled);
  }, []);

  const setAutoSyncIntervalHoursState = useCallback((hours: GithubSyncAutoIntervalHours) => {
    setGithubSyncAutoIntervalHours(hours);
    setAutoSyncIntervalHours(hours);
  }, []);

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
    githubLogin,
    autoSyncEnabled,
    autoSyncIntervalHours,
    repos,
    isLoadingRepos,
    branches,
    repoDefaultBranch,
    isLoadingBranches,
    history,
    isLoadingHistory,
    connectGithub,
    cancelConnect,
    loadRepos,
    loadBranches,
    selectRepository,
    createAndSelectRepository,
    disconnect,
    syncNow,
    updateBranch,
    deleteBranch,
    setAutoSyncEnabled: setAutoSyncEnabledState,
    setAutoSyncIntervalHours: setAutoSyncIntervalHoursState,
    loadHistory,
    restoreVersion,
    resolveDefaultOwner,
    refreshSecrets,
  };
}
