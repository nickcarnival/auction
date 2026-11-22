import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type LegalPageShellProps = {
  title: string;
  children: ReactNode;
};

/**
 * Inline link styles scoped to `p a` / `li a` only so `Button asChild` / `<Link>` in layout blocks
 * are not forced to `text-primary` (which would hide labels on `bg-primary` CTAs).
 */
const inlineLinkClassName =
  '[&_li_a]:rounded-xs [&_p_a]:rounded-xs [&_li_a]:font-medium [&_p_a]:font-medium [&_li_a]:text-primary [&_p_a]:text-primary [&_li_a]:underline [&_p_a]:underline [&_li_a]:decoration-primary/35 [&_p_a]:decoration-primary/35 [&_li_a]:underline-offset-4 [&_p_a]:underline-offset-4 [&_li_a]:outline-none [&_p_a]:outline-none [&_li_a]:transition-[color,text-decoration-color,background-color] [&_p_a]:transition-[color,text-decoration-color,background-color] [&_li_a]:hover:bg-primary/5 [&_p_a]:hover:bg-primary/5 [&_li_a]:hover:text-primary-deep [&_p_a]:hover:text-primary-deep [&_li_a]:hover:decoration-primary [&_p_a]:hover:decoration-primary [&_li_a]:focus-visible:bg-primary/5 [&_p_a]:focus-visible:bg-primary/5 [&_li_a]:focus-visible:ring-2 [&_p_a]:focus-visible:ring-2 [&_li_a]:focus-visible:ring-ring [&_p_a]:focus-visible:ring-ring [&_li_a]:focus-visible:ring-offset-2 [&_p_a]:focus-visible:ring-offset-2 [&_li_a]:focus-visible:ring-offset-background [&_p_a]:focus-visible:ring-offset-background';

/** Content column on marketing routes (privacy, terms, contact). */
export function LegalPageShell({ title, children }: LegalPageShellProps) {
  return (
    <div className="w-full bg-background py-12 px-4 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl">
        <h1 className="font-merriweather text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <div
          className={cn(
            'mt-8 space-y-4 text-base leading-relaxed text-muted-foreground [&_h2]:mt-10 [&_h2]:scroll-mt-24 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:marker:text-muted-foreground [&_p+p]:mt-4 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5',
            inlineLinkClassName
          )}
        >
          {children}
        </div>
      </article>
    </div>
  );
}
