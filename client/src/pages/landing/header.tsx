import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router';

const navLinkClassName =
  'rounded-xs px-1.5 py-1 text-sm font-medium text-primary-foreground/90 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--html-background))]';

export function Header() {
  return (
    <header className="shrink-0 bg-html-background shadow-sm">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex w-full items-center justify-between border-b border-primary py-3 sm:py-3.5 lg:border-none">
          <div className="flex items-center">
            <Link
              to="/"
              className="rounded-xs outline-none ring-offset-2 ring-offset-[hsl(var(--html-background))] focus-visible:ring-2 focus-visible:ring-primary-foreground/40"
            >
              <span className="sr-only">Plandry</span>
              <Logo className="!size-9 text-primary-foreground sm:!size-10" />
            </Link>
            <div className="ml-6 hidden flex-wrap items-center gap-x-1 sm:ml-8 md:flex">
              <a href="/#how-it-works" className={navLinkClassName}>
                How it works
              </a>
              <a href="/#features" className={navLinkClassName}>
                Features
              </a>
              <a href="/#faq" className={navLinkClassName}>
                FAQ
              </a>
            </div>
          </div>
          <div className="ml-4 flex flex-wrap items-center gap-2 sm:ml-6 md:ml-8">
            <Button asChild size="sm" variant="marketing-header-solid">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" variant="marketing-header-quiet">
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
}
