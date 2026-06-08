import {
  createEmptyLandingTestimonial,
  getDefaultLandingSocialProof,
  LANDING_SOCIAL_PROOF_CACHE_TAG,
  LANDING_SOCIAL_PROOF_CONFIG_KEY,
  LANDING_SOCIAL_PROOF_REVALIDATE_SECONDS,
  MAX_LANDING_SOCIAL_PROOF_QUOTE_LENGTH,
  MAX_LANDING_SOCIAL_PROOF_SOURCE_LENGTH,
  MAX_LANDING_TESTIMONIALS,
  type LandingSocialProofConfig,
  type LandingTestimonial,
} from '@/lib/landing-social-proof-defaults';
import { prisma } from '@/lib/prisma';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';

export {
  createEmptyLandingTestimonial,
  getDefaultLandingSocialProof,
  LANDING_SOCIAL_PROOF_CACHE_TAG,
  LANDING_SOCIAL_PROOF_CONFIG_KEY,
  LANDING_SOCIAL_PROOF_REVALIDATE_SECONDS,
  type LandingSocialProofConfig,
  type LandingTestimonial,
} from '@/lib/landing-social-proof-defaults';

function clampRating(value: number): number {
  return Math.min(5, Math.max(0, Math.round(value * 10) / 10));
}

function normalizeTestimonial(input: LandingTestimonial): LandingTestimonial {
  return {
    quoteEn: input.quoteEn.trim().slice(0, MAX_LANDING_SOCIAL_PROOF_QUOTE_LENGTH),
    quoteRu: input.quoteRu.trim().slice(0, MAX_LANDING_SOCIAL_PROOF_QUOTE_LENGTH),
    sourceEn: input.sourceEn.trim().slice(0, MAX_LANDING_SOCIAL_PROOF_SOURCE_LENGTH),
    sourceRu: input.sourceRu.trim().slice(0, MAX_LANDING_SOCIAL_PROOF_SOURCE_LENGTH),
  };
}

function normalizeConfig(input: LandingSocialProofConfig): LandingSocialProofConfig {
  const testimonials = input.testimonials
    .map(normalizeTestimonial)
    .filter((item) => item.quoteEn && item.quoteRu && item.sourceEn && item.sourceRu)
    .slice(0, MAX_LANDING_TESTIMONIALS);

  return {
    enabled: Boolean(input.enabled),
    rating: clampRating(input.rating),
    ratingsCount: Math.max(0, Math.min(1_000_000, Math.round(input.ratingsCount))),
    testimonialsEnabled: Boolean(input.testimonialsEnabled),
    testimonials,
  };
}

function migrateLegacyBody(body: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(body.testimonials)) {
    return body;
  }

  if (typeof body.quoteEn !== 'string') {
    return body;
  }

  return {
    ...body,
    testimonialsEnabled: body.testimonialsEnabled !== false,
    testimonials: [
      {
        quoteEn: body.quoteEn,
        quoteRu: body.quoteRu,
        sourceEn: body.quoteSourceEn,
        sourceRu: body.quoteSourceRu,
      },
    ],
  };
}

function parseTestimonial(raw: unknown, index: number): LandingTestimonial | { error: string } {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: `testimonials[${index}] must be an object` };
  }

  const item = raw as Record<string, unknown>;
  for (const key of ['quoteEn', 'quoteRu', 'sourceEn', 'sourceRu'] as const) {
    if (typeof item[key] !== 'string') {
      return { error: `testimonials[${index}].${key} must be a string` };
    }
  }

  return {
    quoteEn: item.quoteEn as string,
    quoteRu: item.quoteRu as string,
    sourceEn: item.sourceEn as string,
    sourceRu: item.sourceRu as string,
  };
}

export function parseLandingSocialProofValue(
  raw: unknown,
): { ok: true; config: LandingSocialProofConfig } | { ok: false; error: string } {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Config must be a JSON object' };
  }

  const body = migrateLegacyBody(raw as Record<string, unknown>);
  const ratingRaw = body.rating;
  const ratingsCountRaw = body.ratingsCount;
  const rating =
    typeof ratingRaw === 'number'
      ? ratingRaw
      : typeof ratingRaw === 'string'
        ? parseFloat(ratingRaw)
        : NaN;
  const ratingsCount =
    typeof ratingsCountRaw === 'number'
      ? ratingsCountRaw
      : typeof ratingsCountRaw === 'string'
        ? parseInt(ratingsCountRaw, 10)
        : NaN;

  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    return { ok: false, error: 'rating must be a number between 0 and 5' };
  }
  if (!Number.isFinite(ratingsCount) || ratingsCount < 0) {
    return { ok: false, error: 'ratingsCount must be a non-negative integer' };
  }

  if (!Array.isArray(body.testimonials)) {
    return { ok: false, error: 'testimonials must be an array' };
  }
  if (body.testimonials.length > MAX_LANDING_TESTIMONIALS) {
    return { ok: false, error: `testimonials supports at most ${MAX_LANDING_TESTIMONIALS} items` };
  }

  const testimonials: LandingTestimonial[] = [];
  for (let index = 0; index < body.testimonials.length; index += 1) {
    const parsed = parseTestimonial(body.testimonials[index], index);
    if ('error' in parsed) {
      return { ok: false, error: parsed.error };
    }
    testimonials.push(parsed);
  }

  const config = normalizeConfig({
    enabled: body.enabled !== false,
    rating,
    ratingsCount,
    testimonialsEnabled: body.testimonialsEnabled !== false,
    testimonials,
  });

  if (config.testimonialsEnabled && config.testimonials.length === 0) {
    return { ok: false, error: 'Add at least one testimonial or disable the testimonials section' };
  }

  return { ok: true, config };
}

export function stringifyLandingSocialProof(config: LandingSocialProofConfig): string {
  return JSON.stringify(normalizeConfig(config));
}

async function readStoredConfig(): Promise<LandingSocialProofConfig | null> {
  if (!process.env.DATABASE_URL?.trim()) {
    return null;
  }

  try {
    const row = await prisma.appConfig.findUnique({
      where: { key: LANDING_SOCIAL_PROOF_CONFIG_KEY },
    });
    if (!row?.value?.trim()) {
      return null;
    }
    const parsed = parseLandingSocialProofValue(JSON.parse(row.value) as unknown);
    return parsed.ok ? parsed.config : null;
  } catch {
    console.error('[landing-social-proof] read failed');
    return null;
  }
}

async function loadLandingSocialProofForPublic(): Promise<LandingSocialProofConfig> {
  const stored = await readStoredConfig();
  return stored ?? getDefaultLandingSocialProof();
}

const getCachedLandingSocialProof = unstable_cache(
  loadLandingSocialProofForPublic,
  [LANDING_SOCIAL_PROOF_CONFIG_KEY],
  {
    revalidate: LANDING_SOCIAL_PROOF_REVALIDATE_SECONDS,
    tags: [LANDING_SOCIAL_PROOF_CACHE_TAG],
  },
);

export async function getLandingSocialProof(): Promise<LandingSocialProofConfig> {
  return getCachedLandingSocialProof();
}

export function revalidateLandingSocialProofCache(): void {
  revalidateTag(LANDING_SOCIAL_PROOF_CACHE_TAG, { expire: 0 });
  revalidatePath('/');
  revalidatePath('/ru');
}

export async function getLandingSocialProofForAdmin(): Promise<{
  config: LandingSocialProofConfig;
  hasStoredCopy: boolean;
}> {
  const stored = await readStoredConfig();
  return {
    config: stored ?? getDefaultLandingSocialProof(),
    hasStoredCopy: stored !== null,
  };
}

export async function upsertLandingSocialProof(config: LandingSocialProofConfig): Promise<void> {
  const normalized = normalizeConfig(config);
  await prisma.appConfig.upsert({
    where: { key: LANDING_SOCIAL_PROOF_CONFIG_KEY },
    create: {
      key: LANDING_SOCIAL_PROOF_CONFIG_KEY,
      value: stringifyLandingSocialProof(normalized),
    },
    update: { value: stringifyLandingSocialProof(normalized) },
  });
}
