import { calculateOptimalConcurrency } from '@/features/git-remote-sync/lib/syncOptimization';
import { nitroFetch } from '@/shared/lib/fetch';
import { isArray, isRecord, isString } from '@/shared/lib/type-guards';

import {
  GITHUB_API_BASE,
  GITHUB_FETCH_MAX_RETRIES,
  GITHUB_FETCH_RETRY_BASE_MS,
  GITHUB_FETCH_TIMEOUT_MS,
  GITHUB_REF_CONFLICT_MAX_RETRIES,
} from './constants';

export type GithubRepoSummary = {
  id: number;
  fullName: string;
  owner: string;
  name: string;
  private: boolean;
  defaultBranch: string;
};

export type GithubCommitSummary = {
  sha: string;
  message: string;
  htmlUrl: string;
  committedAt: string;
};

export type GithubBranchSummary = {
  name: string;
};

export type GithubApiError = Error & { status?: number; code?: string };

export function isGithubApiError(err: unknown): err is GithubApiError {
  return err instanceof Error && ('status' in err || 'code' in err);
}

export function createGithubError(message: string, status?: number, code?: string): GithubApiError {
  const err = new Error(message) as GithubApiError;
  err.status = status;
  err.code = code;
  return err;
}

const RETRYABLE_HTTP_STATUSES = new Set([429, 502, 503, 504]);

function buildGithubHeaders(
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
  out.Accept = 'application/vnd.github+json';
  out.Authorization = `Bearer ${accessToken}`;
  out['X-GitHub-Api-Version'] = '2022-11-28';
  return out;
}

function encodeRepoSegment(segment: string): string {
  return encodeURIComponent(segment);
}

function repoApiPath(owner: string, repo: string, suffix: string): string {
  return `/repos/${encodeRepoSegment(owner)}/${encodeRepoSegment(repo)}${suffix}`;
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
  return GITHUB_FETCH_RETRY_BASE_MS * (attempt + 1);
}

function isRetryableNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === 'AbortError') return false;
  return true;
}

async function githubFetchOnce(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${GITHUB_API_BASE}${path}`;
  const headers = buildGithubHeaders(accessToken, init?.headers);

  return nitroFetch(url, {
    ...init,
    headers,
    timeoutMs: GITHUB_FETCH_TIMEOUT_MS,
  });
}

async function githubFetch(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= GITHUB_FETCH_MAX_RETRIES; attempt += 1) {
    try {
      const response = await githubFetchOnce(accessToken, path, init);
      const shouldRetry =
        !response.ok &&
        RETRYABLE_HTTP_STATUSES.has(response.status) &&
        attempt < GITHUB_FETCH_MAX_RETRIES;

      if (!shouldRetry) {
        return response;
      }

      await sleepMs(retryDelayMs(response, attempt));
    } catch (err) {
      lastError = err;
      const shouldRetry = isRetryableNetworkError(err) && attempt < GITHUB_FETCH_MAX_RETRIES;
      if (!shouldRetry) {
        throw err;
      }
      await sleepMs(GITHUB_FETCH_RETRY_BASE_MS * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : createGithubError('GitHub request failed');
}

async function readGithubErrorBody(response: Response): Promise<string> {
  try {
    return (await response.text()).trim();
  } catch {
    return '';
  }
}

async function throwGithubHttpError(
  fallbackMessage: string,
  response: Response,
  code?: string,
): Promise<never> {
  const body = await readGithubErrorBody(response);
  throw createGithubError(body || fallbackMessage, response.status, code);
}

async function isRetryableRefUpdateConflict(response: Response): Promise<boolean> {
  if (response.status === 409) {
    return true;
  }
  if (response.status !== 422) {
    return false;
  }
  const body = await readGithubErrorBody(response);
  return body.length === 0 || /not a fast forward/i.test(body);
}

async function retryGithubCommitAfterRefConflict(
  params: CreateGithubCommitParams & { refConflictAttempt: number },
  parentSha: string,
  message: string,
): Promise<string> {
  const { refConflictAttempt } = params;
  if (refConflictAttempt >= GITHUB_REF_CONFLICT_MAX_RETRIES) {
    throw createGithubError('Ref conflict', 422, 'ref_conflict');
  }
  const latestSha = await getBranchRefSha(
    params.accessToken,
    params.owner,
    params.repo,
    params.branch,
  );
  if (!latestSha || latestSha === parentSha) {
    throw createGithubError('Ref conflict', 422, 'ref_conflict');
  }
  return createGithubCommitWithFilesInternal({
    ...params,
    refConflictAttempt: refConflictAttempt + 1,
    message: `${message} (retry)`,
  });
}

export async function fetchGithubUserLogin(accessToken: string): Promise<string> {
  const response = await githubFetch(accessToken, '/user');
  if (!response.ok) {
    await throwGithubHttpError(`GitHub user failed: ${response.status}`, response);
  }
  const data: unknown = await response.json();
  if (!isRecord(data) || !isString(data.login)) {
    throw createGithubError('Invalid GitHub user response');
  }
  return data.login;
}

export async function listGithubRepos(accessToken: string): Promise<GithubRepoSummary[]> {
  const response = await githubFetch(
    accessToken,
    '/user/repos?per_page=100&sort=updated&affiliation=owner,organization_member',
  );
  if (!response.ok) {
    await throwGithubHttpError(`GitHub repos failed: ${response.status}`, response);
  }
  const data: unknown = await response.json();
  if (!isArray(data)) {
    throw createGithubError('Invalid GitHub repos response');
  }

  const repos: GithubRepoSummary[] = [];
  for (const item of data) {
    if (!isRecord(item)) continue;
    const id = item.id;
    const full_name = item.full_name;
    const name = item.name;
    const owner = item.owner;
    if (typeof id !== 'number' || !isString(full_name) || !isString(name) || !isRecord(owner)) {
      continue;
    }
    const ownerLogin = owner.login;
    if (!isString(ownerLogin)) continue;
    repos.push({
      id,
      fullName: full_name,
      owner: ownerLogin,
      name,
      private: item.private === true,
      defaultBranch: isString(item.default_branch) ? item.default_branch : 'main',
    });
  }
  return repos;
}

export async function listGithubBranches(
  accessToken: string,
  owner: string,
  repo: string,
): Promise<GithubBranchSummary[]> {
  const branches: GithubBranchSummary[] = [];
  let page = 1;

  while (page <= 10) {
    const response = await githubFetch(
      accessToken,
      repoApiPath(owner, repo, `/branches?per_page=100&page=${page}`),
    );
    if (!response.ok) {
      await throwGithubHttpError(`List branches failed: ${response.status}`, response);
    }
    const data: unknown = await response.json();
    if (!isArray(data)) {
      throw createGithubError('Invalid branches response');
    }
    if (data.length === 0) {
      break;
    }
    for (const item of data) {
      if (isRecord(item) && isString(item.name)) {
        branches.push({ name: item.name });
      }
    }
    if (data.length < 100) {
      break;
    }
    page += 1;
  }

  return branches.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export async function createGithubRepo(
  accessToken: string,
  name: string,
  isPrivate = true,
): Promise<GithubRepoSummary> {
  const response = await githubFetch(accessToken, '/user/repos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      private: isPrivate,
      auto_init: true,
      description: 'Voice Inbox AI notes sync',
    }),
  });
  if (!response.ok) {
    await throwGithubHttpError(`Create repo failed: ${response.status}`, response);
  }
  const data: unknown = await response.json();
  if (!isRecord(data) || typeof data.id !== 'number' || !isString(data.full_name)) {
    throw createGithubError('Invalid create repo response');
  }
  const owner = isRecord(data.owner) && isString(data.owner.login) ? data.owner.login : '';
  const repoName = isString(data.name) ? data.name : name;
  return {
    id: data.id,
    fullName: data.full_name,
    owner,
    name: repoName,
    private: data.private === true,
    defaultBranch: isString(data.default_branch) ? data.default_branch : 'main',
  };
}

export async function getBranchRefSha(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<string | null> {
  const response = await githubFetch(
    accessToken,
    repoApiPath(owner, repo, `/git/ref/heads/${encodeRepoSegment(branch)}`),
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    await throwGithubHttpError(`Get ref failed: ${response.status}`, response);
  }
  const data: unknown = await response.json();
  if (!isRecord(data) || !isRecord(data.object) || !isString(data.object.sha)) {
    throw createGithubError('Invalid ref response');
  }
  return data.object.sha;
}

export async function getGithubRepoDefaultBranch(
  accessToken: string,
  owner: string,
  repo: string,
): Promise<string> {
  const response = await githubFetch(accessToken, repoApiPath(owner, repo, ''));
  if (!response.ok) {
    await throwGithubHttpError(`Get repo failed: ${response.status}`, response);
  }
  const data: unknown = await response.json();
  return isRecord(data) && isString(data.default_branch) ? data.default_branch : 'main';
}

/** Creates `branch` from the repo default branch tip when it does not exist yet. */
export async function ensureGithubBranchExists(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<{ created: boolean }> {
  const existingSha = await getBranchRefSha(accessToken, owner, repo, branch);
  if (existingSha) {
    return { created: false };
  }

  const defaultBranch = await getGithubRepoDefaultBranch(accessToken, owner, repo);
  const baseSha =
    branch === defaultBranch
      ? null
      : await getBranchRefSha(accessToken, owner, repo, defaultBranch);
  if (!baseSha) {
    throw createGithubError('Base branch not found', 404, 'base_branch_not_found');
  }

  const createRefResponse = await githubFetch(accessToken, repoApiPath(owner, repo, '/git/refs'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ref: `refs/heads/${branch}`,
      sha: baseSha,
    }),
  });

  if (createRefResponse.status === 422) {
    const shaAfterRace = await getBranchRefSha(accessToken, owner, repo, branch);
    if (shaAfterRace) {
      return { created: false };
    }
  }

  if (!createRefResponse.ok) {
    await throwGithubHttpError(`Create ref failed: ${createRefResponse.status}`, createRefResponse);
  }

  return { created: true };
}

export async function deleteGithubBranch(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<void> {
  const response = await githubFetch(
    accessToken,
    repoApiPath(owner, repo, `/git/refs/heads/${encodeRepoSegment(branch)}`),
    { method: 'DELETE' },
  );
  if (response.status === 404) {
    return;
  }
  if (!response.ok) {
    await throwGithubHttpError(`Delete branch failed: ${response.status}`, response);
  }
}

type TreeEntry = {
  path: string;
  mode: '100644';
  type: 'blob';
  sha: string | null;
};

async function createBlob(
  accessToken: string,
  owner: string,
  repo: string,
  content: string,
): Promise<string> {
  const response = await githubFetch(accessToken, repoApiPath(owner, repo, '/git/blobs'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      encoding: 'utf-8',
    }),
  });
  if (!response.ok) {
    await throwGithubHttpError(`Create blob failed: ${response.status}`, response);
  }
  const data: unknown = await response.json();
  if (!isRecord(data) || !isString(data.sha)) {
    throw createGithubError('Invalid blob response');
  }
  return data.sha;
}

async function createBlobsParallel(
  accessToken: string,
  owner: string,
  repo: string,
  files: Map<string, string>,
  concurrency: number,
  onBlobUploaded?: (uploaded: number, total: number) => void,
): Promise<Map<string, string>> {
  const entries = [...files.entries()];
  if (entries.length === 0) {
    return new Map();
  }

  const blobShas = new Map<string, string>();
  let index = 0;
  let firstError: unknown;

  async function worker(): Promise<void> {
    while (index < entries.length) {
      if (firstError) {
        return;
      }
      const current = index;
      index += 1;
      const [path, content] = entries[current];
      try {
        const sha = await createBlob(accessToken, owner, repo, content);
        blobShas.set(path, sha);
        onBlobUploaded?.(blobShas.size, entries.length);
      } catch (err) {
        firstError = err;
        return;
      }
    }
  }

  const effectiveConcurrency = Math.min(concurrency, entries.length);
  const workers = Array.from({ length: effectiveConcurrency }, () => worker());
  await Promise.all(workers);

  if (firstError) {
    throw firstError;
  }

  return blobShas;
}

export async function listTreePathsAtCommit(
  accessToken: string,
  owner: string,
  repo: string,
  commitSha: string,
  prefix: string,
): Promise<string[]> {
  const response = await githubFetch(
    accessToken,
    repoApiPath(owner, repo, `/git/commits/${encodeRepoSegment(commitSha)}`),
  );
  if (!response.ok) {
    await throwGithubHttpError(`Get commit failed: ${response.status}`, response);
  }
  const commitData: unknown = await response.json();
  if (!isRecord(commitData) || !isRecord(commitData.tree) || !isString(commitData.tree.sha)) {
    throw createGithubError('Invalid commit response');
  }

  const treeSha = commitData.tree.sha;
  const treeResponse = await githubFetch(
    accessToken,
    repoApiPath(owner, repo, `/git/trees/${encodeRepoSegment(treeSha)}?recursive=1`),
  );
  if (!treeResponse.ok) {
    await throwGithubHttpError(`Get tree failed: ${treeResponse.status}`, treeResponse);
  }
  const treeData: unknown = await treeResponse.json();
  if (!isRecord(treeData) || !isArray(treeData.tree)) {
    throw createGithubError('Invalid tree response');
  }

  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
  const paths: string[] = [];
  for (const item of treeData.tree) {
    if (!isRecord(item) || item.type !== 'blob' || !isString(item.path)) continue;
    if (normalizedPrefix.length === 0 || item.path.startsWith(`${normalizedPrefix}/`)) {
      paths.push(item.path);
    }
  }
  return paths;
}

export async function getFileContentAtRef(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<string | null> {
  const encodedPath = path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const response = await githubFetch(
    accessToken,
    repoApiPath(owner, repo, `/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`),
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    await throwGithubHttpError(`Get file failed: ${response.status}`, response);
  }
  const data: unknown = await response.json();
  if (!isRecord(data) || !isString(data.content)) {
    throw createGithubError('Invalid file response');
  }
  const encoding = data.encoding;
  if (encoding === 'base64') {
    const cleaned = data.content.replace(/\n/g, '');
    const binary = atob(cleaned);
    let escaped = '';
    for (let i = 0; i < binary.length; i += 1) {
      escaped += `%${binary.charCodeAt(i).toString(16).padStart(2, '0')}`;
    }
    return decodeURIComponent(escaped);
  }
  return data.content;
}

export async function listGithubCommits(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  page = 1,
  perPage = 30,
): Promise<GithubCommitSummary[]> {
  const query = new URLSearchParams({
    sha: branch,
    path,
    per_page: String(perPage),
    page: String(page),
  });
  const response = await githubFetch(
    accessToken,
    repoApiPath(owner, repo, `/commits?${query.toString()}`),
  );
  if (!response.ok) {
    await throwGithubHttpError(`List commits failed: ${response.status}`, response);
  }
  const data: unknown = await response.json();
  if (!isArray(data)) {
    throw createGithubError('Invalid commits response');
  }

  const commits: GithubCommitSummary[] = [];
  for (const item of data) {
    if (!isRecord(item) || !isString(item.sha)) continue;
    const commit = item.commit;
    const htmlUrl = isString(item.html_url) ? item.html_url : '';
    if (!isRecord(commit)) continue;
    const message = isString(commit.message) ? commit.message : '';
    const author = commit.author;
    const committedAt =
      isRecord(author) && isString(author.date) ? author.date : new Date().toISOString();
    commits.push({
      sha: item.sha,
      message: message.split('\n')[0] ?? message,
      htmlUrl,
      committedAt,
    });
  }
  return commits;
}

type CreateGithubCommitParams = {
  accessToken: string;
  owner: string;
  repo: string;
  branch: string;
  basePath: string;
  files: Map<string, string>;
  deletions: string[];
  message: string;
  onUploadProgress?: (uploaded: number, total: number) => void;
  onCommitting?: () => void;
};

async function createGithubCommitWithFilesInternal(
  params: CreateGithubCommitParams & { refConflictAttempt: number },
): Promise<string> {
  const {
    accessToken,
    owner,
    repo,
    branch,
    basePath,
    files,
    deletions,
    message,
    refConflictAttempt,
    onUploadProgress,
    onCommitting,
  } = params;
  const parentSha = await getBranchRefSha(accessToken, owner, repo, branch);

  const normalizedBase = basePath.replace(/^\/+|\/+$/g, '');
  const relativeFiles = new Map<string, string>();
  for (const [path, content] of files.entries()) {
    const rel = path.startsWith(`${normalizedBase}/`)
      ? path.slice(normalizedBase.length + 1)
      : path;
    relativeFiles.set(rel, content);
  }

  const optimalConcurrency = calculateOptimalConcurrency(relativeFiles.size);
  const blobShas = await createBlobsParallel(
    accessToken,
    owner,
    repo,
    relativeFiles,
    optimalConcurrency,
    onUploadProgress,
  );

  onCommitting?.();

  const treeEntries: TreeEntry[] = [];
  for (const [relPath, blobSha] of blobShas.entries()) {
    treeEntries.push({
      path: relPath,
      mode: '100644',
      type: 'blob',
      sha: blobSha,
    });
  }

  for (const deletion of deletions) {
    const rel = deletion.startsWith(`${normalizedBase}/`)
      ? deletion.slice(normalizedBase.length + 1)
      : deletion;
    treeEntries.push({
      path: rel,
      mode: '100644',
      type: 'blob',
      sha: null,
    });
  }

  const treeBody: { base_tree?: string; tree: TreeEntry[] } = { tree: treeEntries };
  if (parentSha) {
    const parentCommitResponse = await githubFetch(
      accessToken,
      repoApiPath(owner, repo, `/git/commits/${encodeRepoSegment(parentSha)}`),
    );
    if (parentCommitResponse.ok) {
      const parentCommit: unknown = await parentCommitResponse.json();
      if (
        isRecord(parentCommit) &&
        isRecord(parentCommit.tree) &&
        isString(parentCommit.tree.sha)
      ) {
        treeBody.base_tree = parentCommit.tree.sha;
      }
    }
  }

  const treeResponse = await githubFetch(accessToken, repoApiPath(owner, repo, '/git/trees'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(treeBody),
  });
  if (!treeResponse.ok) {
    await throwGithubHttpError(`Create tree failed: ${treeResponse.status}`, treeResponse);
  }
  const treeData: unknown = await treeResponse.json();
  if (!isRecord(treeData) || !isString(treeData.sha)) {
    throw createGithubError('Invalid tree create response');
  }

  const commitResponse = await githubFetch(accessToken, repoApiPath(owner, repo, '/git/commits'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      tree: treeData.sha,
      parents: parentSha ? [parentSha] : [],
    }),
  });
  if (!commitResponse.ok) {
    await throwGithubHttpError(`Create commit failed: ${commitResponse.status}`, commitResponse);
  }
  const commitData: unknown = await commitResponse.json();
  if (!isRecord(commitData) || !isString(commitData.sha)) {
    throw createGithubError('Invalid commit create response');
  }

  const newSha = commitData.sha;

  if (parentSha) {
    const updateRefResponse = await githubFetch(
      accessToken,
      repoApiPath(owner, repo, `/git/refs/heads/${encodeRepoSegment(branch)}`),
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: newSha }),
      },
    );
    if (await isRetryableRefUpdateConflict(updateRefResponse)) {
      return retryGithubCommitAfterRefConflict(
        { ...params, refConflictAttempt },
        parentSha,
        message,
      );
    }
    if (!updateRefResponse.ok) {
      await throwGithubHttpError(
        `Update ref failed: ${updateRefResponse.status}`,
        updateRefResponse,
      );
    }
  } else {
    const createRefResponse = await githubFetch(
      accessToken,
      repoApiPath(owner, repo, '/git/refs'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: `refs/heads/${branch}`,
          sha: newSha,
        }),
      },
    );
    if (!createRefResponse.ok) {
      await throwGithubHttpError(
        `Create ref failed: ${createRefResponse.status}`,
        createRefResponse,
      );
    }
  }

  return newSha;
}

export async function createGithubCommitWithFiles(
  params: CreateGithubCommitParams,
): Promise<string> {
  return createGithubCommitWithFilesInternal({ ...params, refConflictAttempt: 0 });
}
