import { readResponseErrorMessage } from '@shared/read-response-error-message';

/** Dispatched when the API indicates the browser should clear session and return to login. */
export const PLANDRY_SESSION_INVALID_EVENT = 'plandry:session-invalid';

function shouldInvalidateClientSession(status: number, message: string): boolean {
  if (status === 401) return true;
  if (status === 403) {
    const m = message.toLowerCase();
    return (
      m.includes('invalid token') ||
      m.includes('session is no longer valid')
    );
  }
  return false;
}

/** Use when `response.ok` is false (e.g. after fetch). Dispatches session-invalid when appropriate. */
export async function throwApiFailure(response: Response, fallback: string): Promise<never> {
  const message = await readResponseErrorMessage(response, fallback);
  if (shouldInvalidateClientSession(response.status, message)) {
    window.dispatchEvent(new CustomEvent(PLANDRY_SESSION_INVALID_EVENT));
  }
  throw new Error(message);
}

/**
 * When `response` is not OK, reads a message, optionally notifies the app to log out, then throws.
 */
export async function throwIfNotOk(response: Response, fallback: string): Promise<void> {
  if (response.ok) return;
  await throwApiFailure(response, fallback);
}

export async function fetchJsonOrThrow<T>(response: Response, fallback: string): Promise<T> {
  await throwIfNotOk(response, fallback);
  return (await response.json()) as T;
}

export async function fetchJsonArrayOrThrow<T>(
  response: Response,
  fallback: string
): Promise<T[]> {
  const data = await fetchJsonOrThrow<unknown>(response, fallback);
  if (!Array.isArray(data)) {
    throw new TypeError(fallback);
  }
  return data;
}
