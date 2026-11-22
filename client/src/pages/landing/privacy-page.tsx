import { Link } from 'react-router';
import { MarketingDocumentMeta } from './marketing-document-meta';
import { LegalPageShell } from './legal-page-shell';

const TITLE = 'Privacy Policy';
const DESCRIPTION =
  'How Plandry collects, uses, and protects information when you use our shop scheduling and booking software.';

export function PrivacyPage() {
  return (
    <>
      <MarketingDocumentMeta title={TITLE} description={DESCRIPTION} path="/privacy" />
      <LegalPageShell title={TITLE}>
        <p>
          This policy describes how Plandry (&ldquo;we,&rdquo; &ldquo;us&rdquo;) handles information when
          you use our websites, customer booking pages, and your shop account in Plandry (the
          &ldquo;Services&rdquo;). By
          using the Services, you agree to this policy. If you do not agree, do not use the Services.
        </p>

        <h2>Information we process</h2>
        <ul>
          <li>
            <strong>Account and business data</strong> you or your shop provide (for example, business
            name, users, schedules, and customer contact details entered into the product).
          </li>
          <li>
            <strong>Technical data</strong> such as IP address, device/browser type, and cookies or
            similar technologies needed to run and secure the Services.
          </li>
        </ul>

        <h2>How we use information</h2>
        <p>We use information to operate and improve the Services, provide support, secure accounts, and comply with law. We do not sell your personal information.</p>

        <h2>Sharing</h2>
        <p>
          We may share information with subprocessors that help us host, deliver, or support the Services
          (for example, cloud or email providers), subject to contractual protections. We may disclose
          information if required by law or to protect rights and safety.
        </p>

        <h2>Retention</h2>
        <p>We retain information as needed to provide the Services and as required by law or legitimate business needs.</p>

        <h2>Your choices</h2>
        <p>
          Depending on where you live, you may have rights to access, correct, or delete certain
          information.           Contact us using the details on our{' '}
          <Link to="/contact" className="font-medium text-primary underline-offset-4 hover:underline">
            contact page
          </Link>{' '}
          and we will respond consistent with applicable law.
        </p>

        <h2>Changes</h2>
        <p>We may update this policy from time to time. We will post the updated version on this page with a revised effective date.</p>

        <p className="text-sm text-muted-foreground/90">
          <strong className="text-foreground">Effective:</strong> April 3, 2026. This page is a general
          summary; your organization may also be bound by a separate agreement with Plandry.
        </p>
      </LegalPageShell>
    </>
  );
}
