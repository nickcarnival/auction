import { z } from 'zod';
import { tenantSchema } from '../tenant';

/**
 * Session user returned by login / signup / get-by-token (user + populated tenant).
 */
export const authSessionUserSchema = z
  .object({
    _id: z.string().min(1),
    name: z.string(),
    email: z.string().email(),
    password: z.string().optional().default(''),
    tenantId: z.string(),
    tenant: tenantSchema,
    phone: z.string().optional(),
    role: z.string().optional(),
    active: z.boolean().optional(),
    failedAttempts: z.number().optional(),
    lastLogin: z.string().nullable().optional(),
    lastActive: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
  })
  .passthrough();

export const authTokenPairSchema = z.object({
  token: z.string().min(1),
  user: authSessionUserSchema,
});

export type AuthSessionUser = z.infer<typeof authSessionUserSchema>;
export type AuthTokenPair = z.infer<typeof authTokenPairSchema>;
