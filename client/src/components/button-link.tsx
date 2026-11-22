import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { Link } from 'react-router';

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

/** Router link with `button` `link` styling — do not wrap in `<Button asChild>` (nested colors break). */
export function ButtonLink({ href, children, className }: ButtonLinkProps) {
  return (
    <Link
      to={href}
      className={cn(buttonVariants({ variant: 'link', size: 'default' }), className)}
    >
      {children}
    </Link>
  );
}
