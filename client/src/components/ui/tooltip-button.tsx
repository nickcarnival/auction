import * as React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type TooltipButtonProps = ButtonProps & {
  /** Shown on hover/focus; keep concise for footers and icon-only controls. */
  tooltip: React.ReactNode;
  tooltipSide?: React.ComponentProps<typeof TooltipContent>['side'];
  tooltipContentClassName?: string;
  /**
   * When the button is `disabled`, wrap it in an `inline-flex` span so the tooltip still works
   * (disabled controls don’t receive pointer events).
   * @default true
   */
  tooltipDisabledWrapper?: boolean;
};

/**
 * Shadcn `Button` + Radix tooltip.
 *
 * Must sit under a {@link TooltipProvider} (e.g. page, sheet footer, or app shell). When the
 * button is `disabled`, wraps it in a focusable `span` by default so the tooltip still works.
 */
const TooltipButton = React.forwardRef<HTMLButtonElement, TooltipButtonProps>(
  (
    {
      tooltip,
      tooltipSide = 'top',
      tooltipContentClassName,
      tooltipDisabledWrapper = true,
      disabled,
      className,
      ...buttonProps
    },
    ref
  ) => {
    const wrapDisabled = tooltipDisabledWrapper && Boolean(disabled);

    const button = (
      <Button ref={ref} disabled={disabled} className={className} {...buttonProps} />
    );

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {wrapDisabled ? (
          <span className="inline-flex" tabIndex={0}>
            {button}
          </span>
        ) : (
          button
        )}
        </TooltipTrigger>
        <TooltipContent
          side={tooltipSide}
          className={cn('max-w-xs text-xs', tooltipContentClassName)}
        >
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }
);
TooltipButton.displayName = 'TooltipButton';

export { TooltipButton };
