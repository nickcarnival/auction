import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const STALE_CHUNK_RELOAD_KEY = 'plandry:stale-chunk-reload';

function isStaleChunkLoadError(error: unknown): boolean {
  if (error instanceof TypeError) {
    const msg = error.message;
    return (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('error loading dynamically imported module') ||
      msg.includes('Importing a module script failed')
    );
  }
  if (typeof error === 'object' && error !== null && 'name' in error) {
    return (error as { name: string }).name === 'ChunkLoadError';
  }
  return false;
}

/**
 * Like `React.lazy`, but recovers when a deploy removes hashed chunks while the tab still runs an old
 * entry bundle: one full reload fetches a fresh `index.html` and asset graph.
 *
 * **Hosting:** also set `Cache-Control: no-cache` (or short TTL + `must-revalidate`) on `index.html`
 * so users do not keep a cached shell for days.
 */
export function lazyRoute<T extends ComponentType<object>>(
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(STALE_CHUNK_RELOAD_KEY);
      return mod;
    } catch (err) {
      if (!isStaleChunkLoadError(err)) {
        throw err;
      }
      if (sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY) === '1') {
        sessionStorage.removeItem(STALE_CHUNK_RELOAD_KEY);
        throw err;
      }
      sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, '1');
      window.location.reload();
      return await new Promise<{ default: T }>(() => {
        /* reload replaces the document */
      });
    }
  });
}
