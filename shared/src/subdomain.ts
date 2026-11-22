import { Tenant } from './tenant';

export type SubdomainConfig = {
  _id?: string;
  tenantCode: string;
  tenantId: string;
  redirectUrl?: string;

  backgroundColor?: string;

  created?: string;
  updated?: string;
};

export type TenantSubdomain = SubdomainConfig & { tenant: Tenant };
