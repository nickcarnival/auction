import { Link } from 'react-router';
import { MarketingDocumentMeta } from './marketing-document-meta';
import { LegalPageShell } from './legal-page-shell';
import { Button } from '@/components/ui/button';

const TITLE = 'Contact';
const DESCRIPTION =
  'Contact Plandry about the calendar product, support, or anything else.';

const SUPPORT_EMAIL = 'support@plandry.org';

export function ContactPage() {
  return (
    <>
      <MarketingDocumentMeta title={TITLE} description={DESCRIPTION} path="/contact" />
      <LegalPageShell title={TITLE}>
        <p>
          It’s a small team. Email us for support or questions about whether the product fits your
          shop.
        </p>

        <h2>Email</h2>
        <p>
          For product questions and account support:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>

        <h2>Product feedback</h2>
        <p>
          Share feature ideas or report issues on our <Link to="/feedback">feedback page</Link>.
        </p>

        <h2>Try Plandry</h2>
        <p>New shops can start from the marketing site or sign up directly.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="marketing-body-solid">
            <Link to="/signup">Get started</Link>
          </Button>
          <Button asChild variant="marketing-body-quiet">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </LegalPageShell>
    </>
  );
}
