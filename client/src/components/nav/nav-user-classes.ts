import { cn } from '@/lib/utils';

/** Profile chip — same look open or closed (no shape/surface hacks when menu is open). */
export const navUserTriggerButtonClassName = [
  'mr-1 h-auto gap-1 rounded-xs border border-border bg-card px-1.5 py-1 text-foreground',
  'shadow-sm transition-[background-color,box-shadow,border-color] duration-150 ease-out',
  'hover:border-muted-foreground/45 hover:bg-muted/70',
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
].join(' ');

/** Compact panel, sits near the trigger; not visually fused to the nav bar. */
export const navUserMenuContentClassName = cn(
  'z-50 w-[11.5rem] rounded-sm border border-border bg-popover p-2 text-popover-foreground !shadow-sm'
);

/** Technician-tree–style rows: muted label, soft hover. */
export const navUserMenuItemClassName = cn(
  'cursor-pointer gap-2 rounded-sm px-2 py-1.5 text-sm font-normal text-muted-foreground',
  'focus:bg-muted/70 focus:text-foreground data-[highlighted]:bg-muted/70 data-[highlighted]:text-foreground'
);

export const navUserMenuLogoutItemClassName = cn(
  navUserMenuItemClassName,
  'focus:text-destructive data-[highlighted]:text-destructive'
);
