import { normalizeCustomerNameWhileTyping } from '@shared/customer-name-utils';
import { BASE_URL } from '@/utils/environment-util';
import { fetchJsonArrayOrThrow } from '@/lib/api-response';
import { CustomerWithStats } from '@shared/customer';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/pages/auth/auth-provider';
import { useParams } from 'react-router';

interface CustomerContextType {
  customers: CustomerWithStats[];
  selectedCustomer: CustomerWithStats | null;
  isLoadingCustomers: boolean;
  /** True while a customer list request is in flight (including refetch after search changes). */
  isFetchingCustomers: boolean;
  isLoadingSelectedCustomer: boolean;
  searchCustomers: (search: string) => void;
  currentSearch: string;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const CustomerProvider = ({ children }: { children: ReactNode }) => {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const { customerId } = useParams();

  const {
    data: customersData,
    isLoading: isLoadingCustomers,
    isFetching: isFetchingCustomers,
  } = useQuery({
    queryKey: ['customers', user?.tenantId, search],
    queryFn: async () => {
      if (!user?.tenantId) return [];
      const response = await fetch(
        `${BASE_URL}/api/customers/get-by-tenant-id?search=${encodeURIComponent(search)}`,
        { credentials: 'include' }
      );
      return fetchJsonArrayOrThrow<CustomerWithStats>(response, 'Failed to load customers');
    },
    enabled: !!user?.tenantId,
    placeholderData: keepPreviousData,
  });

  const { data: selectedCustomer, isLoading: isLoadingSelectedCustomer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      if (!customerId || !user?.tenantId) return null;
      const response = await fetch(`${BASE_URL}/api/customers/get-by-id?customerId=${customerId}`, {
        credentials: 'include',
      });
      if (!response.ok) return null;
      return await response.json();
    },
    enabled: !!customerId && !!user?.tenantId,
  });

  useEffect(() => {
    if (customersData) {
      setCustomers(customersData);
    }
  }, [customersData]);

  const searchCustomers = useCallback((newSearch: string) => {
    setSearch(normalizeCustomerNameWhileTyping(newSearch));
  }, []);

  const value = useMemo(
    () => ({
      customers,
      selectedCustomer,
      isLoadingCustomers,
      isFetchingCustomers,
      isLoadingSelectedCustomer,
      searchCustomers,
      currentSearch: search,
    }),
    [
      customers,
      selectedCustomer,
      isLoadingCustomers,
      isFetchingCustomers,
      isLoadingSelectedCustomer,
      searchCustomers,
      search,
    ]
  );

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
};

export const useCustomerContext = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomerContext must be used within a CustomerProvider');
  }
  return context;
};
