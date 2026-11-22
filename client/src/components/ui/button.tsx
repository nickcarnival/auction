import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2 whitespace-nowrap
  rounded-xs text-sm font-medium transition-colors
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
  disabled:pointer-events-none disabled:opacity-50
  [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0`,
  {
    variants: {
      variant: {
        /** Tinted primary chip (outlined feel). Inverse is `solid`. */
        default:
          'border-2 border-solid border-primary bg-primary/10 text-primary shadow-sm hover:bg-primary/20 hover:border-primary hover:text-primary-deep',
        /** Filled primary: dark surface, light label — main irreversible actions, form Save, etc. */
        solid:
          'border-2 border-solid border-primary bg-primary text-primary-foreground shadow-sm transition-[color,background-color,border-color,box-shadow] hover:border-[hsl(var(--primary-hover))] hover:bg-[hsl(var(--primary-hover))] hover:text-primary-foreground hover:shadow-md focus-visible:ring-primary/35 focus-visible:ring-offset-background',
        destructive:
          'border-2 border-solid border-transparent bg-destructive text-destructive-foreground shadow-sm transition-[color,background-color,border-color,box-shadow] hover:border-transparent hover:bg-[hsl(var(--destructive-hover))] hover:text-destructive-foreground hover:shadow-md',
        /** Confirmations, positive outcomes (pair with `destructive` for danger). */
        success:
          'border-2 border-solid border-success bg-success text-success-foreground shadow-sm transition-[color,background-color,border-color,box-shadow] hover:border-[hsl(var(--success-hover))] hover:bg-[hsl(var(--success-hover))] hover:text-success-foreground hover:shadow-md focus-visible:ring-success/45 focus-visible:ring-offset-background',
        outline:
          'border-2 border-solid border-primary/50 bg-card text-primary shadow-sm hover:bg-muted/80 hover:border-primary hover:text-primary-deep',
        secondary:
          'border-2 border-solid border-border bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/90 hover:border-muted-foreground/40',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        /** Dark marketing header: solid CTA; avoids conflicting `default` + overrides. */
        'marketing-header-solid':
          'border-2 border-solid border-primary bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary-deep hover:text-primary-foreground focus-visible:ring-primary-foreground/45 focus-visible:ring-offset-[hsl(var(--html-background))]',
        /** Dark marketing header: bordered CTA on `bg-html-background`. */
        'marketing-header-quiet':
          'border-2 border-solid border-primary-foreground/50 bg-transparent text-primary-foreground shadow-sm transition-colors hover:border-primary-foreground/85 hover:bg-primary-foreground/12 hover:text-primary-foreground focus-visible:ring-primary-foreground/45 focus-visible:ring-offset-[hsl(var(--html-background))]',
        /** Cream marketing pages: primary CTA (e.g. contact). */
        'marketing-body-solid':
          'border-2 border-solid border-primary bg-primary text-primary-foreground shadow-sm transition-[color,background-color,border-color,box-shadow] hover:border-[hsl(var(--primary-hover))] hover:bg-[hsl(var(--primary-hover))] hover:text-primary-foreground hover:shadow-md focus-visible:ring-primary/35 focus-visible:ring-offset-background',
        /** Cream marketing pages: secondary / quiet CTA. */
        'marketing-body-quiet':
          'border-2 border-solid border-foreground/18 bg-background text-foreground shadow-sm transition-colors hover:border-foreground/30 hover:bg-muted/60 hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background',
        /** CTA band on `bg-primary-deep`: light pill, dark label; hovers stay readable. */
        'marketing-cta-inverted':
          'border-2 border-solid border-primary-foreground/35 bg-primary-foreground text-primary-deep shadow-sm transition-colors hover:border-primary-foreground/50 hover:bg-muted hover:text-primary-deep focus-visible:ring-primary-foreground/45 focus-visible:ring-offset-[hsl(var(--primary-deep))]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-xs px-3',
        lg: 'h-11 rounded-xs px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
