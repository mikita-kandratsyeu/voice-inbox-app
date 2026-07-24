import { useCallback, useEffect, useRef, useState } from 'react';

import { useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import { closeInAppBrowser } from '@/features/in-app-browser';
import { useProEntitlement } from '@/features/pro-license';

import { GITLAB_SYNC_DEFAULT_BRANCH } from '../lib/constants';
import { fetchGitlabSyncHistory } from '../lib/fetchGitlabSyncHistory';
import {
  createGitlabRepo,
  deleteGitlabBranch,
  ensureGitlabBranchExists,
  fetchGitlabUserLogin,
  getGitlabRepoDefaultBranch,
  type GitlabBranchSummary,
  type GitlabCommitSummary,
  type GitlabRepoSummary,
  listGitlabBranches,
  listGitlabRepos,
} from '../lib/gitlabApi';
import {
  cancelGitlabDeviceFlow,
  type GitlabDeviceFlowChallenge,
  isGitlabOAuthConfigured,
  startGitlabDeviceFlow,
} from '../lib/gitlabAuth';
import {
  clearGitlabSyncSecrets,
  getGitlabSyncSecrets,
  type GitlabSyncSecrets,
  isGitlabSyncConnected,
  setGitlabSyncBranch,
  setGitlabSyncRepository,
} from '../lib/gitlabSecrets';
import {
  isValidGitlabSyncBranchName,
  normalizeGitlabSyncBranchName,
} from '../lib/gitlabSyncBranch';
import { registerGitlabConnectSession } from '../lib/gitlabSyncConnectSession';
import { runGitlabSyncNow } from '../lib/gitlabSyncNow';
import {
  getGitlabSyncPinnedRepos,
  setGitlabSyncPinnedRepos,
  syncGitlabSyncPinnedRepos,
} from '../lib/gitlabSyncPinnedRepos';
import { toggleGitlabSyncPinnedRepo } from '../lib/gitlabSyncPinnedReposPolicy';
import { beginGitlabSyncProgress, endGitlabSyncProgress } from '../lib/gitlabSyncProgress';
import { isGitlabSyncSessionActive, subscribeGitlabSyncSession } from '../lib/gitlabSyncSession';
import {
  clearGitlabSyncState,
  getGitlabSyncAutoEnabled,
  getGitlabSyncAutoIntervalHours,
  getGitlabSyncLastSyncedAt,
  getGitlabSyncLogin,
  type GitlabSyncAutoIntervalHours,
  setGitlabSyncAutoEnabled,
  setGitlabSyncAutoIntervalHours,
  setGitlabSyncLogin,
} from '../lib/gitlabSyncState';
import {
  buildGitlabBranchList,
  sortGitlabBranchList,
  unionGitlabBranchLists,
  withoutGitlabBranch,
} from '../lib/mergeGitlabBranchList';
import { pushGitlabCommit } from '../lib/pushGitlabCommit';
import {
  type RestoreGitlabSyncResult,
  restoreGitlabSyncVersion,
} from '../lib/restoreGitlabSyncVersion';

function getGitlabApiErrorStatus(err: unknown): number | undefined {
  if (err instanceof Error && 'status' in err && typeof err.status === 'number') {
    return err.status;
  }
  return undefined;
}

export function useGitlabSync() {
  const { isProActive } = useProEntitlement();
  const records = useRecordStore((s) => s.records);
  const folders = useFolderStore((s) => s.folders);

  const [secrets, setSecrets] = useState<GitlabSyncSecrets | null>(null);
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectChallenge, setConnectChallenge] = useState<GitlabDeviceFlowChallenge | null>(null);
  const [isSyncing, setIsSyncing] = useState(isGitlabSyncSessionActive());
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(getGitlabSyncLastSyncedAt());
  const [repos, setRepos] = useState<GitlabRepoSummary[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [branches, setBranches] = useState<GitlabBranchSummary[]>([]);
  const [repoDefaultBranch, setRepoDefaultBranch] = useState<string | null>(null);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [history, setHistory] = useState<GitlabCommitSummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [gitlabLogin, setGitlabLogin] = useState<string | null>(getGitlabSyncLogin());
  const [pinnedRepoFullNames, setPinnedRepoFullNames] = useState<string[]>(() => {
    const login = getGitlabSyncLogin();
    return login ? getGitlabSyncPinnedRepos(login) : [];
  });
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(getGitlabSyncAutoEnabled());
  const [autoSyncIntervalHours, setAutoSyncIntervalHours] = useState(
    getGitlabSyncAutoIntervalHours(),
  );
  /** Branches removed locally while GitHub list may still be stale. */
  const excludedBranchesRef = useRef<Set<string>>(new Set());
  /** Branches seen locally but not yet returned by GitHub list API. */
  const knownBranchesRef = useRef<Set<string>>(new Set());
  const oauthConfigured = isGitlabOAuthConfigured();

  const persistGitlabLogin = useCallback(async (accessToken: string) => {
    try {
      const login = await fetchGitlabUserLogin(accessToken);
      setGitlabSyncLogin(login);
      setGitlabLogin(login);
      return login;
    } catch {
      return null;
    }
  }, []);

  const refreshSecrets = useCallback(async () => {
    const next = await getGitlabSyncSecrets();
    setSecrets(next);
    setConnected(await isGitlabSyncConnected());
    setLastSyncedAt(getGitlabSyncLastSyncedAt());
    const login = getGitlabSyncLogin();
    setGitlabLogin(login);
    setPinnedRepoFullNames(login ? getGitlabSyncPinnedRepos(login) : []);
    setAutoSyncEnabled(getGitlabSyncAutoEnabled());
    setAutoSyncIntervalHours(getGitlabSyncAutoIntervalHours());
    if (next?.accessToken && !getGitlabSyncLogin()) {
      await persistGitlabLogin(next.accessToken);
    }
  }, [persistGitlabLogin]);

  useEffect(() => {
    void refreshSecrets();
  }, [refreshSecrets]);

  useEffect(() => {
    return subscribeGitlabSyncSession(() => {
      const active = isGitlabSyncSessionActive();
      setIsSyncing(active);
      if (!active) {
        setLastSyncedAt(getGitlabSyncLastSyncedAt());
      }
    });
  }, []);

  const cancelConnect = useCallback(() => {
    cancelGitlabDeviceFlow();
    setConnectChallenge(null);
    setIsConnecting(false);
  }, []);

  useEffect(() => {
    const unregister = registerGitlabConnectSession(cancelConnect);
    return () => {
      unregister();
      cancelConnect();
    };
  }, [cancelConnect]);

  const connectGitlab = useCallback(async () => {
    if (!isProActive) {
      return { ok: false as const, code: 'pro_required' };
    }
    if (!oauthConfigured) {
      return { ok: false as const, code: 'oauth_not_configured' };
    }
    setIsConnecting(true);
    setConnectChallenge(null);
    try {
      await startGitlabDeviceFlow((challenge) => {
        setConnectChallenge(challenge);
      });
      await closeInAppBrowser();
      const nextSecrets = await getGitlabSyncSecrets();
      if (nextSecrets?.accessToken) {
        await persistGitlabLogin(nextSecrets.accessToken);
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
  }, [isProActive, oauthConfigured, persistGitlabLogin, refreshSecrets]);

  const loadRepos = useCallback(async () => {
    const current = await getGitlabSyncSecrets();
    if (!current?.accessToken) {
      return { ok: false as const, code: 'not_connected' };
    }
    setIsLoadingRepos(true);
    try {
      const listed = await listGitlabRepos(current.accessToken);
      setRepos(listed);
      const login = getGitlabSyncLogin();
      if (login) {
        setPinnedRepoFullNames(
          syncGitlabSyncPinnedRepos(
            login,
            listed.map((repo) => repo.fullName),
          ),
        );
      }
      return { ok: true as const, repos: listed };
    } catch (err) {
      if (getGitlabApiErrorStatus(err) === 401) {
        await clearGitlabSyncSecrets();
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
    async (repo: GitlabRepoSummary) => {
      await setGitlabSyncRepository({
        owner: repo.owner,
        repo: repo.name,
        projectId: repo.id,
        branch: GITLAB_SYNC_DEFAULT_BRANCH,
      });
      await refreshSecrets();
    },
    [refreshSecrets],
  );

  const createAndSelectRepository = useCallback(
    async (name: string) => {
      const current = await getGitlabSyncSecrets();
      if (!current?.accessToken) {
        throw new Error('not_connected');
      }
      const created = await createGitlabRepo(current.accessToken, name, true);
      await setGitlabSyncRepository({
        owner: created.owner,
        repo: created.name,
        projectId: created.id,
        branch: GITLAB_SYNC_DEFAULT_BRANCH,
      });
      await refreshSecrets();
      return created;
    },
    [refreshSecrets],
  );

  const disconnect = useCallback(async () => {
    await clearGitlabSyncSecrets();
    clearGitlabSyncState();
    excludedBranchesRef.current.clear();
    knownBranchesRef.current.clear();
    setSecrets(null);
    setConnected(false);
    setRepos([]);
    setBranches([]);
    setHistory([]);
    setLastSyncedAt(null);
    setGitlabLogin(null);
    setPinnedRepoFullNames([]);
  }, []);

  const togglePinnedRepo = useCallback(
    (fullName: string): 'max' | 'ok' => {
      const login = gitlabLogin ?? getGitlabSyncLogin();
      if (!login) {
        return 'ok';
      }
      const result = toggleGitlabSyncPinnedRepo(getGitlabSyncPinnedRepos(login), fullName);
      if (!result.ok) {
        return 'max';
      }
      setGitlabSyncPinnedRepos(login, result.pinned);
      setPinnedRepoFullNames(result.pinned);
      return 'ok';
    },
    [gitlabLogin],
  );

  const resolveBranchList = useCallback(
    (
      listed: GitlabBranchSummary[],
      activeBranch: string,
      options?: { pruneExcluded?: boolean },
      defaultBranch?: string | null,
    ) => {
      const sortedDefaultBranch = defaultBranch ?? repoDefaultBranch;
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
      const combined = unionGitlabBranchLists(
        listed,
        supplementalNames.map((name) => ({ name })),
        sortedDefaultBranch,
      );
      const merged = buildGitlabBranchList(
        combined,
        activeBranch,
        excludedBranchesRef.current,
        sortedDefaultBranch,
      );

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
    [repoDefaultBranch],
  );

  const loadBranches = useCallback(async () => {
    const current = await getGitlabSyncSecrets();
    if (!current?.accessToken || current.projectId <= 0) {
      return { ok: false as const, code: 'not_connected' };
    }
    setIsLoadingBranches(true);
    try {
      const [listed, defaultBranch] = await Promise.all([
        listGitlabBranches(current.accessToken, current.projectId),
        getGitlabRepoDefaultBranch(current.accessToken, current.projectId),
      ]);
      setRepoDefaultBranch(defaultBranch);
      const merged = resolveBranchList(
        listed,
        current.branch,
        { pruneExcluded: true },
        defaultBranch,
      );
      setBranches(merged);
      return { ok: true as const, branches: merged };
    } catch (err) {
      if (getGitlabApiErrorStatus(err) === 401) {
        await clearGitlabSyncSecrets();
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
      const current = await getGitlabSyncSecrets();
      if (!silent) {
        beginGitlabSyncProgress(true);
      }
      try {
        const result = await runGitlabSyncNow({
          isProActive,
          isConnected: current != null,
          push: async () => {
            if (!current) {
              return { ok: false as const, code: 'not_connected' };
            }
            return pushGitlabCommit({
              secrets: current,
              records,
              folders,
              reportProgress: !silent,
            });
          },
        });
        if (result.ok) {
          setLastSyncedAt(getGitlabSyncLastSyncedAt());
        } else if (result.code === 'unauthorized') {
          await clearGitlabSyncSecrets();
          clearGitlabSyncState();
          setSecrets(null);
          setConnected(false);
          setGitlabLogin(null);
        }
        return result;
      } finally {
        if (!silent) {
          endGitlabSyncProgress();
        }
      }
    },
    [folders, isProActive, records],
  );

  const updateBranch = useCallback(
    async (branch: string) => {
      const normalized = normalizeGitlabSyncBranchName(branch);
      if (!isValidGitlabSyncBranchName(normalized)) {
        return { ok: false as const, code: 'invalid_branch' };
      }
      const current = await getGitlabSyncSecrets();
      if (!current) {
        return { ok: false as const, code: 'not_connected' };
      }
      try {
        await ensureGitlabBranchExists(current.accessToken, current.projectId, normalized);
        knownBranchesRef.current.add(normalized);
        await setGitlabSyncBranch(normalized);
        await refreshSecrets();
        const apiListed = await listGitlabBranches(current.accessToken, current.projectId);
        const listed = resolveBranchList(apiListed, normalized, { pruneExcluded: true });
        setBranches(listed);
        return { ok: true as const };
      } catch (err) {
        if (getGitlabApiErrorStatus(err) === 401) {
          await clearGitlabSyncSecrets();
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
      const normalized = normalizeGitlabSyncBranchName(branchName);
      if (!isValidGitlabSyncBranchName(normalized)) {
        return { ok: false as const, code: 'invalid_branch' };
      }
      const current = await getGitlabSyncSecrets();
      if (!current) {
        return { ok: false as const, code: 'not_connected' };
      }
      if (normalized === current.branch) {
        return { ok: false as const, code: 'active_branch' };
      }
      try {
        const defaultBranch =
          repoDefaultBranch ??
          (await getGitlabRepoDefaultBranch(current.accessToken, current.projectId));
        setRepoDefaultBranch(defaultBranch);
        if (normalized === defaultBranch) {
          return { ok: false as const, code: 'default_branch' };
        }

        excludedBranchesRef.current.add(normalized);
        knownBranchesRef.current.delete(normalized);
        setBranches((prev) =>
          sortGitlabBranchList(withoutGitlabBranch(prev, normalized), repoDefaultBranch),
        );

        await deleteGitlabBranch(current.accessToken, current.projectId, normalized);

        const listed = await listGitlabBranches(current.accessToken, current.projectId);
        setBranches(
          resolveBranchList(listed, current.branch, { pruneExcluded: true }, defaultBranch),
        );
        return { ok: true as const };
      } catch (err) {
        excludedBranchesRef.current.delete(normalized);
        if (getGitlabApiErrorStatus(err) === 401) {
          await clearGitlabSyncSecrets();
          setSecrets(null);
          setConnected(false);
          setBranches([]);
          return { ok: false as const, code: 'unauthorized' };
        }
        try {
          const listed = await listGitlabBranches(current.accessToken, current.projectId);
          setBranches(
            resolveBranchList(listed, current.branch, { pruneExcluded: true }, repoDefaultBranch),
          );
        } catch {
          setBranches((prev) => prev);
        }
        return { ok: false as const, code: 'failed' };
      }
    },
    [repoDefaultBranch, resolveBranchList],
  );

  const setAutoSyncEnabledState = useCallback((enabled: boolean) => {
    setGitlabSyncAutoEnabled(enabled);
    setAutoSyncEnabled(enabled);
  }, []);

  const setAutoSyncIntervalHoursState = useCallback((hours: GitlabSyncAutoIntervalHours) => {
    setGitlabSyncAutoIntervalHours(hours);
    setAutoSyncIntervalHours(hours);
  }, []);

  const loadHistory = useCallback(async () => {
    const current = await getGitlabSyncSecrets();
    if (!current) {
      return { ok: false as const, code: 'not_connected' };
    }
    setIsLoadingHistory(true);
    try {
      const commits = await fetchGitlabSyncHistory(current);
      setHistory(commits);
      return { ok: true as const, commits };
    } catch (err) {
      if (getGitlabApiErrorStatus(err) === 401) {
        await clearGitlabSyncSecrets();
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
    async (commitSha: string): Promise<RestoreGitlabSyncResult> => {
      if (!isProActive) {
        return { ok: false, code: 'pro_required' };
      }
      const current = await getGitlabSyncSecrets();
      if (!current) {
        return { ok: false, code: 'not_connected' };
      }
      setIsRestoring(true);
      try {
        return await restoreGitlabSyncVersion({ secrets: current, commitSha });
      } finally {
        setIsRestoring(false);
      }
    },
    [isProActive],
  );

  const resolveDefaultOwner = useCallback(async () => {
    const current = await getGitlabSyncSecrets();
    if (!current?.accessToken) return null;
    return fetchGitlabUserLogin(current.accessToken);
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
    gitlabLogin,
    pinnedRepoFullNames,
    autoSyncEnabled,
    autoSyncIntervalHours,
    repos,
    isLoadingRepos,
    branches,
    repoDefaultBranch,
    isLoadingBranches,
    history,
    isLoadingHistory,
    connectGitlab,
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
    togglePinnedRepo,
  };
}
