import { useEffect, useMemo } from 'react';
import { HOME_URL } from '@/utils/environment-util';
import { upsertCanonical, upsertMeta } from './marketing-meta';

const SITE_NAME = 'Plandry';
const TITLE = `${SITE_NAME} — Calendar for small motorcycle service shops`;
const DESCRIPTION =
  'Shared shop calendar, customer booking requests you approve before they book, and customer info next to the job. Built for small motorcycle service shops.';

/** Public page URL for meta; matches `HOME_URL` (prod: https://www.plandry.org). */
const PAGE_URL = `${HOME_URL.replace(/\/$/, '')}/`;

/**
 * Sets document title, standard + social meta tags, and JSON-LD for the marketing homepage.
 */
export function MarketingPageHead() {
  const jsonLd = useMemo(
    () =>
      JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            name: SITE_NAME,
            description: DESCRIPTION,
            url: HOME_URL,
          },
          {
            '@type': 'SoftwareApplication',
            name: SITE_NAME,
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
              description: 'Free trial available',
            },
            description: DESCRIPTION,
          },
        ],
      }),
    []
  );

  useEffect(() => {
    document.title = TITLE;
    upsertCanonical(PAGE_URL);
    upsertMeta('name', 'description', DESCRIPTION);
    upsertMeta('property', 'og:title', TITLE);
    upsertMeta('property', 'og:description', DESCRIPTION);
    upsertMeta('property', 'og:url', PAGE_URL);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', TITLE);
    upsertMeta('name', 'twitter:description', DESCRIPTION);
  }, []);

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />;
}
