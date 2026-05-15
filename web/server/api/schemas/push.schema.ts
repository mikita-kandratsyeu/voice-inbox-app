import { z } from 'zod';

const platformSchema = z.preprocess(
  (v) => (typeof v === 'string' && (v === 'ios' || v === 'android') ? v : null),
  z.enum(['ios', 'android']).nullable().optional(),
);

const localeSchema = z.preprocess(
  (v) => (typeof v === 'string' && /^[a-z]{2}$/.test(v) ? v : null),
  z.string().length(2).nullable().optional(),
);

/** POST /api/push/register */
export const pushRegisterBodySchema = z
  .object({
    deviceToken: z.string().trim().min(64, 'Invalid deviceToken format'),
    locale: localeSchema,
    platform: platformSchema,
    deviceModel: z.unknown().optional(),
    appVersion: z.unknown().optional(),
    buildNumber: z.unknown().optional(),
    osVersion: z.unknown().optional(),
  })
  .passthrough();

export type PushRegisterBody = z.infer<typeof pushRegisterBodySchema>;

const optionalStringField = z.preprocess(
  (v) => (typeof v === 'string' ? v : undefined),
  z.string().optional(),
);

/** POST /api/push/send */
export const pushSendBodySchema = z
  .object({
    deviceId: z.preprocess(
      (v) => (typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined),
      z.string().min(1).optional(),
    ),
    type: z.enum(['ai_complete', 'policy_update', 'limit_warning', 'limit_exceeded']).optional(),
    title: optionalStringField,
    body: optionalStringField,
    recordId: optionalStringField,
    message: optionalStringField,
  })
  .passthrough();

export type PushSendBody = z.infer<typeof pushSendBodySchema>;
