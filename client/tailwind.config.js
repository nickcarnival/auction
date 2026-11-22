/** @type {import('tailwindcss').Config} */

import * as animate from 'tailwindcss-animate';

/** Maps to `src/global.css` :root — HSL values live only there. */
const hsl = (name) => `hsl(var(--${name}))`;

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        alfa: ['"Alfa Slab One"', 'Times New Roman', 'serif'],
        merriweather: ['"Merriweather Sans Variable"', 'sans-serif'],
      },
      backgroundImage: {
        slash: `linear-gradient(45deg, hsl(var(--foreground) / 0.08) 25%, transparent 25%, transparent 50%, hsl(var(--foreground) / 0.08) 50%, hsl(var(--foreground) / 0.08) 75%, transparent 75%, hsl(var(--background)))`,
      },
      borderRadius: {
        none: '0',
        xs: '0.25rem',
        sm: '0.375rem',
        md: '0.5rem',
        lg: 'var(--radius)',
        xl: '0.625rem',
      },
      colors: {
        background: hsl('background'),
        foreground: hsl('foreground'),
        card: {
          DEFAULT: hsl('card'),
          foreground: hsl('card-foreground'),
        },
        popover: {
          DEFAULT: hsl('popover'),
          foreground: hsl('popover-foreground'),
        },
        primary: {
          DEFAULT: hsl('primary'),
          foreground: hsl('primary-foreground'),
          deep: hsl('primary-deep'),
          muted: hsl('primary-muted'),
        },
        secondary: {
          DEFAULT: hsl('secondary'),
          foreground: hsl('secondary-foreground'),
        },
        muted: {
          DEFAULT: hsl('muted'),
          foreground: hsl('muted-foreground'),
        },
        accent: {
          DEFAULT: hsl('accent'),
          foreground: hsl('accent-foreground'),
        },
        destructive: {
          DEFAULT: hsl('destructive'),
          foreground: hsl('destructive-foreground'),
        },
        warning: {
          DEFAULT: hsl('warning'),
          foreground: hsl('warning-foreground'),
          subtle: hsl('warning-subtle'),
          'subtle-border': hsl('warning-subtle-border'),
          emphasis: hsl('warning-emphasis'),
          highlight: hsl('warning-highlight'),
        },
        success: {
          DEFAULT: hsl('success'),
          foreground: hsl('success-foreground'),
          subtle: hsl('success-subtle'),
          'subtle-foreground': hsl('success-subtle-foreground'),
        },
        info: {
          DEFAULT: hsl('info'),
          foreground: hsl('info-foreground'),
        },
        neutral: {
          DEFAULT: hsl('neutral'),
        },
        action: {
          DEFAULT: hsl('action'),
          hover: hsl('action-hover'),
        },
        border: hsl('border'),
        input: hsl('input'),
        ring: hsl('ring'),
        chart: {
          1: hsl('chart-1'),
          2: hsl('chart-2'),
          3: hsl('chart-3'),
          4: hsl('chart-4'),
          5: hsl('chart-5'),
        },
        html: {
          background: hsl('html-background'),
        },
        'chip-1': {
          background: hsl('chip-1-background'),
          foreground: hsl('chip-1-foreground'),
          border: hsl('chip-1-border'),
        },
        'chip-2': {
          background: hsl('chip-2-background'),
          foreground: hsl('chip-2-foreground'),
          border: hsl('chip-2-border'),
        },
        'chip-3': {
          background: hsl('chip-3-background'),
          foreground: hsl('chip-3-foreground'),
          border: hsl('chip-3-border'),
        },
        'chip-4': {
          background: hsl('chip-4-background'),
          foreground: hsl('chip-4-foreground'),
          border: hsl('chip-4-border'),
        },
        'chip-5': {
          background: hsl('chip-5-background'),
          foreground: hsl('chip-5-foreground'),
          border: hsl('chip-5-border'),
        },
        'chip-6': {
          background: hsl('chip-6-background'),
          foreground: hsl('chip-6-foreground'),
          border: hsl('chip-6-border'),
        },
        'chip-7': {
          background: hsl('chip-7-background'),
          foreground: hsl('chip-7-foreground'),
          border: hsl('chip-7-border'),
        },
        sidebar: {
          DEFAULT: hsl('sidebar-background'),
          foreground: hsl('sidebar-foreground'),
          primary: hsl('sidebar-primary'),
          'primary-foreground': hsl('sidebar-primary-foreground'),
          accent: hsl('sidebar-accent'),
          'accent-foreground': hsl('sidebar-accent-foreground'),
          border: hsl('sidebar-border'),
          ring: hsl('sidebar-ring'),
        },
        status: {
          dyno: hsl('status-dyno'),
          vacation: hsl('status-vacation'),
          'vacation-soft': hsl('status-vacation-soft'),
        },
        'email-preview': hsl('email-preview-bg'),
        overlay: hsl('overlay'),
      },
    },
  },
  plugins: [animate],
};
