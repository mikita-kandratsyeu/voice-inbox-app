import { APP_STORE_LISTING_RATING, APP_STORE_LISTING_RATINGS_COUNT } from '@/config/constants';

export type LandingTestimonial = {
  quoteEn: string;
  quoteRu: string;
  sourceEn: string;
  sourceRu: string;
};

export type LandingSocialProofConfig = {
  /** Show App Store rating row in hero. */
  enabled: boolean;
  rating: number;
  ratingsCount: number;
  /** Show testimonials section lower on the landing page. */
  testimonialsEnabled: boolean;
  testimonials: LandingTestimonial[];
};

export const LANDING_SOCIAL_PROOF_CONFIG_KEY = 'LANDING_SOCIAL_PROOF';

/** Public landing cache TTL (seconds). */
export const LANDING_SOCIAL_PROOF_REVALIDATE_SECONDS = 300;

export const LANDING_SOCIAL_PROOF_CACHE_TAG = 'landing-social-proof';

export const MAX_LANDING_SOCIAL_PROOF_QUOTE_LENGTH = 280;
export const MAX_LANDING_SOCIAL_PROOF_SOURCE_LENGTH = 80;
export const MAX_LANDING_TESTIMONIALS = 6;

const DEFAULT_TESTIMONIAL: LandingTestimonial = {
  quoteEn: 'Sleek design and great functionality',
  quoteRu: 'Стильный дизайн и отличный функционал',
  sourceEn: 'App Store review',
  sourceRu: 'Отзыв в App Store',
};

export function getDefaultLandingSocialProof(): LandingSocialProofConfig {
  return {
    enabled: true,
    rating: APP_STORE_LISTING_RATING,
    ratingsCount: APP_STORE_LISTING_RATINGS_COUNT,
    testimonialsEnabled: true,
    testimonials: [{ ...DEFAULT_TESTIMONIAL }],
  };
}

export function createEmptyLandingTestimonial(): LandingTestimonial {
  return {
    quoteEn: '',
    quoteRu: '',
    sourceEn: 'App Store review',
    sourceRu: 'Отзыв в App Store',
  };
}
