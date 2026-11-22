import * as z from 'zod';
import { tenantSchema } from './tenant';

/**
 * Invite row from `invites` collection.
 * Normalize BSON (e.g. ObjectId on nested `tenant._id`) on the server before parsing.
 */
export const inviteSchema = z.object({
  email: z.string().email(),
  /** Legacy rows only; new invites store `tokenHash` server-side. */
  token: z.string().min(1).optional(),
  expiresAt: z.coerce.date(),
  tenant: tenantSchema,
});

export type Invite = z.infer<typeof inviteSchema>;
