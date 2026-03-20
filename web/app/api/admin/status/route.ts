import { NextResponse } from 'next/server';

import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import { getAllDeviceIdsWithPushTokens } from '@/lib/push-tokens';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

type VercelDeployment = {
  uid: string;
  state: string;
  created: number;
  meta?: { githubCommitRef?: string };
  url?: string | null;
  target?: string | null;
  source?: string;
  name?: string;
  inspectorUrl?: string | null;
  buildingAt?: number | null;
  ready?: number | null;
  errorMessage?: string | null;
};

type VercelApiResponse = {
  deployments?: VercelDeployment[];
  error?: { message?: string };
};

type VercelDeploymentInfo = {
  uid: string;
  state: string;
  created: number;
  branch?: string;
  url?: string | null;
  target?: string | null;
  source?: string;
  name?: string;
  inspectorUrl?: string | null;
  buildingAt?: number | null;
  ready?: number | null;
  errorMessage?: string | null;
};

async function getVercelStatus(): Promise<{
  ok: boolean;
  deployments?: VercelDeploymentInfo[];
  error?: string;
}> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token?.trim()) {
    return { ok: false, error: 'VERCEL_TOKEN not set' };
  }

  const url = new URL('https://api.vercel.com/v6/deployments');
  if (projectId?.trim()) url.searchParams.set('projectId', projectId.trim());
  url.searchParams.set('limit', '5');

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    });
    const data = (await res.json()) as VercelApiResponse;
    if (!res.ok) {
      return {
        ok: false,
        error: data.error?.message ?? `HTTP ${res.status}`,
      };
    }
    const deployments = (data.deployments ?? []).map((d) => ({
      uid: d.uid,
      state: d.state,
      created: d.created,
      branch: d.meta?.githubCommitRef,
      url: d.url ?? null,
      target: d.target ?? null,
      source: d.source,
      name: d.name,
      inspectorUrl: d.inspectorUrl ?? null,
      buildingAt: d.buildingAt ?? null,
      ready: d.ready ?? null,
      errorMessage: d.errorMessage ?? null,
    }));
    return { ok: true, deployments };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed';
    return { ok: false, error: msg };
  }
}

async function getDatabaseStatus(): Promise<{
  ok: boolean;
  latencyMs?: number;
  error?: string;
}> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { ok: false, error: 'DATABASE_URL not set' };
  }
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - started };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Query failed';
    return { ok: false, error: msg };
  }
}

async function getUpstashStatus(): Promise<{ ok: boolean; error?: string }> {
  if (
    !process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    !process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  ) {
    return { ok: false, error: 'Upstash not configured' };
  }

  try {
    await redis.set('admin:ping', '1', { ex: 10 });
    const val = await redis.get('admin:ping');

    const ok = val !== null && String(val) === '1';
    return { ok, error: ok ? undefined : 'Ping check failed' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Ping failed';
    return { ok: false, error: msg };
  }
}

export async function GET(): Promise<NextResponse> {
  const [vercel, upstash, database, deviceIds] = await Promise.all([
    getVercelStatus(),
    getUpstashStatus(),
    getDatabaseStatus(),
    getAllDeviceIdsWithPushTokens(),
  ]);

  return NextResponse.json({
    vercel,
    upstash,
    database,
    app: {
      baseUrl: BASE_URL_OR_FALLBACK,
      env: process.env.NODE_ENV,
      devicesWithPush: deviceIds.length,
    },
  });
}
