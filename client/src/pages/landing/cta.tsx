import { Button } from '@/components/ui/button';
import { Link } from 'react-router';

export function CTA() {
  return (
    <section className="bg-primary-deep" aria-labelledby="cta-heading">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
        <h2
          id="cta-heading"
          className="text-3xl font-extrabold text-primary-foreground sm:text-4xl"
        >
          Try it on your shop
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-primary-foreground/85">
          Free trial. You get the calendar, the booking link, and the customer list—same thing we
          described above, not a watered-down demo.
        </p>
        <div className="mt-8 flex justify-center">
          <Button asChild size="lg" variant="marketing-cta-inverted">
            <Link to="/signup">Start your free trial</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
