/**
 * Waiter appointments — hatch fill uses theme tokens only (`--primary-deep`, `--primary-foreground`).
 * Shared by day/week {@link RegularEvent} and compact month chips.
 */
export const WAITER_CALENDAR_BACKGROUND = `
  repeating-linear-gradient(
    -45deg,
    hsl(var(--primary-foreground) / 0.08),
    hsl(var(--primary-foreground) / 0.08) 8px,
    transparent 8px,
    transparent 16px
  ),
  hsl(var(--primary-deep))
`;
