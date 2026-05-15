import { z } from 'zod';

/** Admin POST /api/admin/login */
export const adminLoginBodySchema = z.object({
  login: z
    .string({ required_error: 'Login required', invalid_type_error: 'Login required' })
    .trim()
    .min(1, 'Login required'),
  password: z
    .string({ required_error: 'Password required', invalid_type_error: 'Password required' })
    .transform((s) => s.trim())
    .pipe(z.string().min(1, 'Password required')),
});

export type AdminLoginBody = z.infer<typeof adminLoginBodySchema>;
