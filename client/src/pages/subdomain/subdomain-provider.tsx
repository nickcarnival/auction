import { BASE_URL } from '@/utils/environment-util';
import { TenantSubdomain } from '@shared/subdomain';
import { useQuery } from '@tanstack/react-query';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

interface SubdomainContextType {
  subdomainContext: TenantSubdomain | null;
  subDomain: string;
  isValidSubdomain: boolean;
  isInternal: boolean;
  isLoading: boolean;
}

const SubdomainContext = createContext<SubdomainContextType | undefined>(undefined);

export const SubdomainProvider = ({ children }: { children: ReactNode }) => {
  const subDomain = useMemo(() => window.location.hostname.split('.')[0], []);

  const [subdomainContext, setSubdomainContext] = useState<TenantSubdomain | null>(null);
  const [isValidSubdomain, setIsValidSubdomain] = useState<boolean>(false);

  const internalRoutes = useMemo(() => ['www', 'localhost'], []);

  const isInternal = useMemo(() => internalRoutes.includes(subDomain), [internalRoutes, subDomain]);

  const { data, isLoading } = useQuery<TenantSubdomain>({
    queryKey: ['subdomains-by-code', subDomain],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/api/subdomains/get-by-code?code=${subDomain}`, {
        credentials: 'include',
      });

      return await response.json();
    },
    retry: false,
    enabled: !!subDomain && !isInternal,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  useEffect(() => {
    if (data) {
      setSubdomainContext(data);
      setIsValidSubdomain(true);
    }
  }, [data]);

  return (
    <SubdomainContext.Provider
      value={{
        subdomainContext,
        subDomain,
        isValidSubdomain,
        isLoading,
        isInternal,
      }}
    >
      {children}
    </SubdomainContext.Provider>
  );
};

export const useSubdomainContext = () => {
  const context = useContext(SubdomainContext);
  if (!context) {
    throw new Error('useSubdomainContext must be used within a SubdomainProvider');
  }
  return context;
};
