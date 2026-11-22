import { AuthProvider } from '@/pages/auth/auth-provider';
import { SubdomainProvider } from '@/pages/subdomain/subdomain-provider';
import { TenantProvider } from '@/contexts/tenant-context';
import { Toaster } from '@/components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SubdomainProvider>
        <AuthProvider>
          <TenantProvider>
            {children}
            <Toaster />
          </TenantProvider>
        </AuthProvider>
      </SubdomainProvider>
    </QueryClientProvider>
  );
}
