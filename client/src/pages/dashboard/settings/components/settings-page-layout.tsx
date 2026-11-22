import { ReactNode } from 'react';

type SettingsPageLayoutProps = {
  children: ReactNode;
};

export function SettingsPageLayout({ children }: SettingsPageLayoutProps) {
  return (
    <div className="min-h-0 w-full flex-1 overflow-y-auto px-4 pb-4 pt-4">
      <div className="mx-auto max-w-6xl">
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
