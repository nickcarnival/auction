import { useEffect } from 'react';
import { HOME_URL } from '@/utils/environment-util';
import { upsertCanonical, upsertMeta } from './marketing-meta';

const SITE_NAME = 'Plandry';

export type MarketingDocumentMetaProps = {
  /** Full page title (shown in tab). */
  title: string;
  description: string;
  /** Path starting with `/`, e.g. `/privacy` */
  path: string;
};

/**
 * Sets document title, description, Open Graph / Twitter tags, and canonical for a marketing route.
 */
export function MarketingDocumentMeta({ title, description, path }: MarketingDocumentMetaProps) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const pageUrl = `${HOME_URL.replace(/\/$/, '')}${normalizedPath}`;

  useEffect(() => {
    document.title = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    upsertCanonical(pageUrl);
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', pageUrl);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('name', 'twitter:card', 'summary');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
  }, [title, description, pageUrl]);

  return null;
}
