import { z } from 'zod';

const apiErrorBodySchema = z
  .object({
    message: z.string().optional(),
    error: z.string().optional(),
  })
  .passthrough();

/**
 * Best-effort message from a failed API JSON body, then `statusText`, then `fallback`.
 */
export async function readResponseErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const raw: unknown = await response.json();
    const parsed = apiErrorBodySchema.safeParse(raw);
    if (parsed.success) {
      const fromMessage = parsed.data.message?.trim();
      if (fromMessage) return fromMessage;
      const fromError = parsed.data.error?.trim();
      if (fromError) return fromError;
    }
  } catch {
    /* body not JSON */
  }
  const status = response.statusText?.trim();
  if (status) return status;
  return fallback;
}
