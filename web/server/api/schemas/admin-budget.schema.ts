import { z } from 'zod';

const descriptionField = z.union([
  z.string().trim().min(1).max(500),
  z
    .number()
    .transform((n) => String(n).trim())
    .pipe(z.string().min(1).max(500)),
]);

/** Admin POST /api/admin/budget */
export const adminBudgetCreateBodySchema = z.object({
  spentAt: z.string().trim().optional(),
  category: z.union([z.string().trim().max(80), z.null()]).optional(),
  description: descriptionField,
  amount: z.union([z.string(), z.number()]),
  currency: z
    .string()
    .trim()
    .length(3)
    .regex(/^[A-Za-z]{3}$/, 'currency must be a 3-letter ISO code')
    .transform((s) => s.toUpperCase())
    .optional(),
});

export type AdminBudgetCreateBody = z.infer<typeof adminBudgetCreateBodySchema>;

/** Admin PATCH /api/admin/budget/:id */
export const adminBudgetPatchBodySchema = z
  .object({
    spentAt: z.string().trim().optional(),
    category: z.union([z.string().trim().max(80), z.null()]).optional(),
    description: descriptionField.optional(),
    amount: z.union([z.string(), z.number()]).optional(),
    currency: z
      .string()
      .trim()
      .length(3)
      .regex(/^[A-Za-z]{3}$/, 'currency must be a 3-letter ISO code')
      .transform((s) => s.toUpperCase())
      .optional(),
  })
  .strict()
  .refine(
    (o) =>
      o.spentAt !== undefined ||
      o.category !== undefined ||
      o.description !== undefined ||
      o.amount !== undefined ||
      o.currency !== undefined,
    { message: 'No fields to update' },
  );

export type AdminBudgetPatchBody = z.infer<typeof adminBudgetPatchBodySchema>;
