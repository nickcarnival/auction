import { CSSProperties, ReactNode } from 'react';
import { useSubdomainContext } from '../subdomain-provider';
import { getTenantDisplayTitle } from '@shared/tenant';

/** Peanut-butter + grape-jelly palette (hex); playful but WCAG-friendly on body copy. */
const PB = {
  /** Main “bread & peanut butter” field */
  wheat: '#e8cfad',
  wheatDeep: '#d4b896',
  /** Ink on tan */
  roast: '#2c1810',
  /** Grape jelly */
  jelly: '#5a1f52',
  jellySoft: '#7b3a6e',
  /** Honey / crust accent */
  honey: '#c9983a',
  /** Light cream on jelly */
  cream: '#fff8f0',
} as const;

const ApplegurtzLayout = ({ children }: { children: ReactNode }) => {
  const { subdomainContext, subDomain } = useSubdomainContext();

  return (
    <div
      className="flex min-h-dvh w-full flex-col font-merriweather"
      style={
        {
          backgroundColor: PB.wheat,
          color: PB.roast,
          '--primary': '291 54% 28%',
          '--primary-foreground': '40 100% 97%',
          '--popover': '40 50% 94%',
          '--popover-foreground': '20 40% 12%',
          '--muted-foreground': '20 25% 38%',
        } as CSSProperties
      }
    >
      <header
        className="w-full shrink-0 px-4 py-3 shadow-sm"
        style={{
          backgroundColor: PB.jelly,
          borderBottom: `6px solid ${PB.honey}`,
          color: PB.cream,
          boxShadow: `inset 0 -1px 0 0 ${PB.jellySoft}`,
        }}
      >
        <h1 className="text-xl font-bold tracking-tight md:text-2xl" style={{ color: PB.cream }}>
          {getTenantDisplayTitle(subdomainContext?.tenant, subdomainContext?.tenantCode, subDomain)}
        </h1>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 md:px-10"
        style={{
          background: `linear-gradient(180deg, ${PB.wheat} 0%, ${PB.wheatDeep} 100%)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ApplegurtzLayout;
