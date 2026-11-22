import * as z from 'zod';

import { normalizePhoneForLookup } from '../phone-utils';
import { customerEmailInputSchema } from './customer-update-schema';

/** Contact fields written onto the kept customer row when the merge completes. */
export const customerMergeProfileSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }).max(500),
  email: customerEmailInputSchema,
  phone: z
    .string()
    .max(40)
    .refine(
      s => {
        const t = s.trim();
        return t === '' || normalizePhoneForLookup(t) != null;
      },
      { message: 'Enter a valid phone number or leave blank.' }
    ),
});

/** Merge one or more duplicate profiles into the record to keep. */
export const customerMergeRequestSchema = z.object({
  keepCustomerId: z.string().min(1),
  mergeCustomerIds: z.array(z.string().min(1)).min(1).max(25),
  /** When set, updates the kept row to these values (and normalized lookups). */
  profile: customerMergeProfileSchema.optional(),
});

export type CustomerMergeRequest = z.infer<typeof customerMergeRequestSchema>;
export type CustomerMergeProfile = z.infer<typeof customerMergeProfileSchema>;
