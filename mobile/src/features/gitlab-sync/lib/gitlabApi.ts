import { nitroFetch } from '@/shared/lib/fetch';
import { isArray, isRecord, isString } from '@/shared/lib/type-guards';

import {
  GITLAB_API_BASE,
  GITLAB_FETCH_MAX_RETRIES,
  GITLAB_FETCH_RETRY_BASE_MS,
  GITLAB_FETCH_TIMEOUT_MS,
  GITLAB_REF_CONFLICT_MAX_RETRIES,
} from './constants';

export type GitlabRepoSummary = {
  id: number;
  fullName: string;
  owner: string;
  name: string;
  private: boolean;
  defaultBranch: string;
};

export type GitlabCommitSummary = {
  sha: string;
  message: string;
  htmlUrl: string;
  committedAt: string;
};

export type GitlabBranchSummary = {
  name: string;
};

export type GitlabApiError = Error & { status?: number; code?: string };

export function isGitlabApiError(err: unknown): err is GitlabApiError {
  return err instanceof Error && ('status' in err || 'code' in err);
}

export function createGitlabError(message: string, status?: number, code?: string): GitlabApiError {
  const err = new Error(message) as GitlabApiError;
  err.status = status;
  err.code = code;
  return err;
}

const RETRYABLE_HTTP_STATUSES = new Set([429, 502, 503, 504]);

function buildGitlabHeaders(
  accessToken: string,
  initHeaders?: HeadersInit,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (initHeaders) {
    const h = new Headers(initHeaders);
    h.forEach((value, key) => {
      out[key] = value;
    });
  }
  out.Accept = 'application/json';
  out.Authorization = `Bearer ${accessToken}`;
  return out;
}

function encodeProjectPath(owner: string, repo: string): string {
  return encodeURIComponent(`${owner}/${repo}`);
}

function projectApiPath(projectId: number, suffix: string): string {
  return `/projects/${projectId}${suffix}`;
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function retryDelayMs(response: Response, attempt: number): number {
  const retryAfterHeader = response.headers.get('retry-after');
  if (retryAfterHeader) {
    const retryAfterSec = Number(retryAfterHeader);
    if (Number.isFinite(retryAfterSec) && retryAfterSec > 0) {
      return retryAfterSec * 1_000;
    }
  }
  return GITLAB_FETCH_RETRY_BASE_MS * (attempt + 1);
}

async function gitlabFetchOnce(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${GITLAB_API_BASE}${path}`;
  return nitroFetch(url, {
    ...init,
    headers: buildGitlabHeaders(accessToken, init?.headers),
    timeoutMs: GITLAB_FETCH_TIMEOUT_MS,
  });
}

async function gitlabFetch(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= GITLAB_FETCH_MAX_RETRIES; attempt += 1) {
    try {
      const response = await gitlabFetchOnce(accessToken, path, init);
      if (RETRYABLE_HTTP_STATUSES.has(response.status) && attempt < GITLAB_FETCH_MAX_RETRIES) {
        await sleepMs(retryDelayMs(response, attempt));
        continue;
      }
      return response;
    } catch (err) {
      lastError = err;
      if (attempt >= GITLAB_FETCH_MAX_RETRIES) break;
      await sleepMs(GITLAB_FETCH_RETRY_BASE_MS * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : createGitlabError('GitLab request failed');
}

async function throwGitlabHttpError(message: string, response: Response): Promise<never> {
  const text = await response.text().catch(() => '');
  throw createGitlabError(text ? `${message}: ${text}` : message, response.status);
}

export async function fetchGitlabUserLogin(accessToken: string): Promise<string> {
  const response = await gitlabFetch(accessToken, '/user');
  if (!response.ok) {
    await throwGitlabHttpError(`GitLab user failed: ${response.status}`, response);
  }
  const data: unknown = await response.json();
  if (!isRecord(data) || !isString(data.username)) {
    throw createGitlabError('Invalid GitLab user response');
  }
  return data.username;
}

export async function listGitlabRepos(accessToken: string): Promise<GitlabRepoSummary[]> {
  const response = await gitlabFetch(
    accessToken,
    '/projects?membership=true&order_by=last_activity_at&per_page=100',
  );
  if (!response.ok) {
    await throwGitlabHttpError(`GitLab projects failed: ${response.status}`, response);
  }
  const data: unknown = await response.json();
  if (!isArray(data)) {
    throw createGitlabError('Invalid GitLab projects response');
  }

  const repos: GitlabRepoSummary[] = [];
  for (const item of data) {
    if (!isRecord(item)) continue;
    const id = item.id;
    const path_with_namespace = item.path_with_namespace;
    const name = item.name;
    const namespace = item.namespace;
    if (
      typeof id !== 'number' ||
      !isString(path_with_namespace) ||
      !isString(name) ||
      !isRecord(namespace) ||
      !isString(namespace.path)
    ) {
      continue;
    }
    repos.push({
      id,
      fullName: path_with_namespace,
      owner: namespace.path,
      name,
      private: item.visibility !== 'public',
      defaultBranch: isString(item.default_branch) ? item.default_branch : 'main',
    });
  }
  return repos;
}

export async function createGitlabRepo(
  accessToken: string,
  name: string,
  isPrivate = true,
): Promise<GitlabRepoSummary> {
  const response = await gitlabFetch(accessToken, '/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      path: name,
      visibility: isPrivate ? 'private' : 'public',
    }),
  });
  if (!response.ok) {
    await throwGitlabHttpError(`Create GitLab project failed: ${response.status}`, response);
  }
  const item: unknown = await response.json();
  if (!isRecord(item) || typeof item.id !== 'number' || !isString(item.path_with_namespace)) {
    throw createGitlabError('Invalid create project response');
  }
  const namespace = item.namespace;
  return {
    id: item.id,
    fullName: item.path_with_namespace,
    owner: isRecord(namespace) && isString(namespace.path) ? namespace.path : '',
    name: isString(item.name) ? item.name : name,
    private: item.visibility !== 'public',
    defaultBranch: isString(item.default_branch) ? item.default_branch : 'main',
  };
}

export async function getGitlabRepoDefaultBranch(
  accessToken: string,
  projectId: number,
): Promise<string> {
  const response = await gitlabFetch(accessToken, projectApiPath(projectId, ''));
  if (!response.ok) {
    await throwGitlabHttpError(`GitLab project failed: ${response.status}`, response);
  }
  const data: unknown = await response.json();
  if (!isRecord(data) || !isString(data.default_branch)) {
    throw createGitlabError('Invalid GitLab project response');
  }
  return data.default_branch;
}

export async function listGitlabBranches(
  accessToken: string,
  projectId: number,
): Promise<GitlabBranchSummary[]> {
  const response = await gitlabFetch(
    accessToken,
    projectApiPath(projectId, '/repository/branches?per_page=100'),
  );
  if (!response.ok) {
    await throwGitlabHttpError(`GitLab branches failed: ${response.status}`, response);
  }
  const data: unknown = await response.json();
  if (!isArray(data)) {
    throw createGitlabError('Invalid GitLab branches response');
  }
  const branches: GitlabBranchSummary[] = [];
  for (const item of data) {
    if (!isRecord(item) || !isString(item.name)) continue;
    branches.push({ name: item.name });
  }
  return branches;
}

export async function getBranchRefSha(
  accessToken: string,
  projectId: number,
  branch: string,
): Promise<string | null> {
  const response = await gitlabFetch(
    accessToken,
    projectApiPath(projectId, `/repository/branches/${encodeURIComponent(branch)}`),
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    await throwGitlabHttpError(`GitLab branch ref failed: ${response.status}`, response);
  }
  const data: unknown = await response.json();
  if (!isRecord(data) || !isRecord(data.commit) || !isString(data.commit.id)) {
    return null;
  }
  return data.commit.id;
}

export async function ensureGitlabBranchExists(
  accessToken: string,
  projectId: number,
  branch: string,
): Promise<void> {
  const existingSha = await getBranchRefSha(accessToken, projectId, branch);
  if (existingSha) return;

  const defaultBranch = await getGitlabRepoDefaultBranch(accessToken, projectId);
  const response = await gitlabFetch(
    accessToken,
    projectApiPath(projectId, '/repository/branches'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch, ref: defaultBranch }),
    },
  );
  if (!response.ok && response.status !== 400) {
    await throwGitlabHttpError(`Create GitLab branch failed: ${response.status}`, response);
  }
}

export async function deleteGitlabBranch(
  accessToken: string,
  projectId: number,
  branch: string,
): Promise<void> {
  const response = await gitlabFetch(
    accessToken,
    projectApiPath(projectId, `/repository/branches/${encodeURIComponent(branch)}`),
    { method: 'DELETE' },
  );
  if (!response.ok && response.status !== 404) {
    await throwGitlabHttpError(`Delete GitLab branch failed: ${response.status}`, response);
  }
}

export async function listGitlabCommits(
  accessToken: string,
  projectId: number,
  branch: string,
): Promise<GitlabCommitSummary[]> {
  const query = new URLSearchParams({ ref_name: branch, per_page: '30' });
  const response = await gitlabFetch(
    accessToken,
    projectApiPath(projectId, `/repository/commits?${query.toString()}`),
  );
  if (!response.ok) {
    await throwGitlabHttpError(`GitLab commits failed: ${response.status}`, response);
  }
  const data: unknown = await response.json();
  if (!isArray(data)) {
    throw createGitlabError('Invalid GitLab commits response');
  }

  const commits: GitlabCommitSummary[] = [];
  for (const item of data) {
    if (!isRecord(item) || !isString(item.id)) continue;
    commits.push({
      sha: item.id,
      message: isString(item.title) ? item.title : isString(item.message) ? item.message : '',
      htmlUrl: isString(item.web_url) ? item.web_url : '',
      committedAt: isString(item.committed_date) ? item.committed_date : new Date().toISOString(),
    });
  }
  return commits;
}

export async function getFileContentAtRef(
  accessToken: string,
  projectId: number,
  filePath: string,
  ref: string,
): Promise<string | null> {
  const encodedPath = encodeURIComponent(filePath.replace(/^\/+/, ''));
  const response = await gitlabFetch(
    accessToken,
    projectApiPath(
      projectId,
      `/repository/files/${encodedPath}/raw?ref=${encodeURIComponent(ref)}`,
    ),
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    await throwGitlabHttpError(`GitLab file read failed: ${response.status}`, response);
  }
  return response.text();
}

function toFullRepoTreePath(itemPath: string, pathFilter: string | undefined): string {
  const normalized = pathFilter?.replace(/^\/+|\/+$/g, '') ?? '';
  if (!normalized) return itemPath.replace(/^\/+/, '');
  if (itemPath === normalized || itemPath.startsWith(`${normalized}/`)) {
    return itemPath;
  }
  return `${normalized}/${itemPath}`;
}

async function listTreePathsAtCommitInternal(
  accessToken: string,
  projectId: number,
  commitSha: string,
  pathFilter: string | undefined,
): Promise<string[]> {
  const normalizedFilter = pathFilter?.replace(/^\/+|\/+$/g, '') || undefined;
  const paths: string[] = [];
  let page = 1;

  while (page <= 10) {
    const query = new URLSearchParams({
      ref: commitSha,
      recursive: 'true',
      per_page: '100',
      page: String(page),
    });
    if (normalizedFilter) {
      query.set('path', normalizedFilter);
    }
    const response = await gitlabFetch(
      accessToken,
      projectApiPath(projectId, `/repository/tree?${query.toString()}`),
    );
    if (!response.ok) {
      await throwGitlabHttpError(`GitLab tree failed: ${response.status}`, response);
    }
    const data: unknown = await response.json();
    if (!isArray(data) || data.length === 0) break;

    for (const item of data) {
      if (!isRecord(item) || item.type !== 'blob' || !isString(item.path)) continue;
      const fullPath = toFullRepoTreePath(item.path, normalizedFilter);
      paths.push(fullPath);
    }

    if (data.length < 100) break;
    page += 1;
  }

  return paths;
}

export async function listTreePathsAtCommit(
  accessToken: string,
  projectId: number,
  commitSha: string,
  basePath: string,
): Promise<string[]> {
  const normalizedBase = basePath.replace(/^\/+|\/+$/g, '');
  if (!normalizedBase) {
    return listTreePathsAtCommitInternal(accessToken, projectId, commitSha, undefined);
  }

  try {
    return await listTreePathsAtCommitInternal(accessToken, projectId, commitSha, normalizedBase);
  } catch (err) {
    if (isGitlabApiError(err) && err.status === 404) {
      return listTreePathsAtCommitInternal(accessToken, projectId, commitSha, undefined);
    }
    throw err;
  }
}

type CommitAction =
  | { action: 'create' | 'update'; file_path: string; content: string }
  | { action: 'delete'; file_path: string };

function toRelativeRepoPath(fullPath: string, basePath: string): string {
  const normalizedBase = basePath.replace(/^\/+|\/+$/g, '');
  if (!normalizedBase) return fullPath.replace(/^\/+/, '');
  if (fullPath.startsWith(`${normalizedBase}/`)) {
    return fullPath.slice(normalizedBase.length + 1);
  }
  return fullPath.replace(/^\/+/, '');
}

async function createGitlabCommitWithFilesInternal(params: {
  accessToken: string;
  projectId: number;
  branch: string;
  basePath: string;
  files: Map<string, string>;
  deletions: string[];
  existingRelativePaths?: ReadonlySet<string>;
  message: string;
  refConflictAttempt: number;
  onUploadProgress?: (uploaded: number, total: number) => void;
  onCommitting?: () => void;
}): Promise<string> {
  const {
    accessToken,
    projectId,
    branch,
    basePath,
    files,
    deletions,
    existingRelativePaths,
    message,
    refConflictAttempt,
    onUploadProgress,
    onCommitting,
  } = params;

  const actions: CommitAction[] = [];
  let uploaded = 0;
  const total = files.size + deletions.length;

  for (const [fullPath, content] of files.entries()) {
    const file_path = toRelativeRepoPath(fullPath, basePath);
    const action =
      existingRelativePaths && existingRelativePaths.has(file_path) ? 'update' : 'create';
    actions.push({
      action,
      file_path,
      content,
    });
    uploaded += 1;
    onUploadProgress?.(uploaded, total);
  }

  for (const deletion of deletions) {
    actions.push({
      action: 'delete',
      file_path: toRelativeRepoPath(deletion, basePath),
    });
    uploaded += 1;
    onUploadProgress?.(uploaded, total);
  }

  onCommitting?.();

  const response = await gitlabFetch(
    accessToken,
    projectApiPath(projectId, '/repository/commits'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branch,
        commit_message: refConflictAttempt > 0 ? `${message} (retry)` : message,
        actions,
      }),
    },
  );

  if (response.status === 400 && refConflictAttempt < GITLAB_REF_CONFLICT_MAX_RETRIES) {
    throw createGitlabError('Ref conflict', 400, 'ref_conflict');
  }

  if (!response.ok) {
    await throwGitlabHttpError(`Create GitLab commit failed: ${response.status}`, response);
  }

  const data: unknown = await response.json();
  if (!isRecord(data) || !isString(data.id)) {
    throw createGitlabError('Invalid GitLab commit response');
  }
  return data.id;
}

export async function createGitlabCommitWithFiles(params: {
  accessToken: string;
  projectId: number;
  branch: string;
  basePath: string;
  files: Map<string, string>;
  deletions: string[];
  existingRelativePaths?: ReadonlySet<string>;
  message: string;
  onUploadProgress?: (uploaded: number, total: number) => void;
  onCommitting?: () => void;
}): Promise<string> {
  let refConflictAttempt = 0;
  while (refConflictAttempt <= GITLAB_REF_CONFLICT_MAX_RETRIES) {
    try {
      return await createGitlabCommitWithFilesInternal({
        ...params,
        refConflictAttempt,
      });
    } catch (err) {
      if (isGitlabApiError(err) && err.code === 'ref_conflict') {
        refConflictAttempt += 1;
        continue;
      }
      throw err;
    }
  }
  throw createGitlabError('Ref conflict', 400, 'ref_conflict');
}

export async function resolveGitlabProjectId(
  accessToken: string,
  owner: string,
  repo: string,
  projectId?: number,
): Promise<number> {
  if (projectId && projectId > 0) return projectId;
  const response = await gitlabFetch(accessToken, `/projects/${encodeProjectPath(owner, repo)}`);
  if (!response.ok) {
    await throwGitlabHttpError(`Resolve GitLab project failed: ${response.status}`, response);
  }
  const data: unknown = await response.json();
  if (!isRecord(data) || typeof data.id !== 'number') {
    throw createGitlabError('Invalid GitLab project response');
  }
  return data.id;
}
