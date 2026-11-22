import { Tenant } from './tenant';

export type User = {
  _id?: string;
  name: string;
  email: string;
  password: string;

  failedAttempts?: number;
  tenantId: string;
  phone?: string;
  role?: string;
  active?: boolean;
  lastLogin?: string;
  lastActive?: string;
  created?: string;
  updated?: string;
};

export type ReqUser = {
  _id: string;
  role: string;
  phone?: string;
  email?: string;
  name?: string;
  tenantId: string;
  tenant: Tenant;
};

export type UserAndTenant = User & {
  tenant: Tenant;
};
