import { ReactNode } from 'react';

type PageProps = {
  children: ReactNode;
};

export const Page = ({ children }: PageProps) => {
  return (
    <div className="mx-1 mb-0 mt-0 flex min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
      {children}
    </div>
  );
};
