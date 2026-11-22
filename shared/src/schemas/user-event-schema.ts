import { z } from 'zod';

/**
 * Structured dimensions for `user_events.metadata`.
 * Add fields here when new analytics facets are needed (prefer enums / small strings).
 */
export const userEventMetadataSchema = z.object({
  /** Logical area (e.g. `customers`, `billing`). */
  category: z.string().max(64).optional(),
  /** Route path, screen id, or API path fragment when useful. */
  path: z.string().max(512).optional(),
  /** Optional non-negative integer (e.g. rows affected). */
  count: z.number().int().min(0).max(1_000_000).optional(),
});

export type UserEventMetadata = z.infer<typeof userEventMetadataSchema>;

export const trackUserEventBodySchema = z.object({
  action: z.string().trim().min(1).max(128),
  metadata: userEventMetadataSchema.optional(),
});

export type TrackUserEventBody = z.infer<typeof trackUserEventBodySchema>;

/** `GET /api/analytics/tenant-summary` — counts of tracked server events for one workspace. */
export type UserEventTenantSummary = {
  total: number;
  byAction: Record<string, number>;
};
