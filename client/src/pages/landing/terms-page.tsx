import { Link } from 'react-router';
import { MarketingDocumentMeta } from './marketing-document-meta';
import { LegalPageShell } from './legal-page-shell';

const TITLE = 'Terms of Service';
const DESCRIPTION =
  'Terms governing use of Plandry scheduling software, booking pages, and related services for shops and their customers.';

export function TermsPage() {
  return (
    <>
      <MarketingDocumentMeta title={TITLE} description={DESCRIPTION} path="/terms" />
      <LegalPageShell title={TITLE}>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern access to and use of Plandry&apos;s
          websites, applications, and related services (the &ldquo;Services&rdquo;). If you use the
          Services on behalf of a business, you represent that you have authority to bind that
          business.
        </p>

        <h2>Using the Services</h2>
        <p>
          You agree to provide accurate information, keep credentials secure, and use the Services only
          in compliance with applicable law. You are responsible for content and data you submit and
          for how you configure booking pages shown to your customers.
        </p>

        <h2>Service changes</h2>
        <p>
          We may modify, suspend, or discontinue parts of the Services with reasonable notice where
          practicable. We are not liable for third-party integrations or outages outside our control.
        </p>

        <h2>Fees and trials</h2>
        <p>
          Paid plans, billing cycles, and trial terms are presented in-product or in an order form. If
          you subscribe to a paid plan, you agree to pay applicable fees and taxes.
        </p>

        <h2>Disclaimer and limitation of liability</h2>
        <p>
          The Services are provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; To the maximum extent
          permitted by law, Plandry disclaims implied warranties and limits liability for indirect or
          consequential damages. Our total liability arising out of these Terms will not exceed amounts
          you paid us for the Services in the twelve months before the claim (if any).
        </p>

        <h2>Indemnity</h2>
        <p>
          You will defend and indemnify Plandry against claims arising from your misuse of the
          Services, your content, or your violation of these Terms, subject to our prompt notice and
          reasonable cooperation.
        </p>

        <h2>Governing law</h2>
        <p>
          These Terms are governed by the laws of the United States and the State of Delaware, excluding
          conflict-of-law rules, unless otherwise required by law.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these Terms? See our{' '}
          <Link to="/contact" className="font-medium text-primary underline-offset-4 hover:underline">
            contact page
          </Link>
          .
        </p>

        <p className="text-sm text-muted-foreground/90">
          <strong className="text-foreground">Effective:</strong> April 3, 2026. A separate agreement or
          order form between your organization and Plandry may supersede or supplement these Terms where
          stated.
        </p>
      </LegalPageShell>
    </>
  );
}
