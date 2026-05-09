import type { DashboardMetrics, PaginatedResponse } from '@respira/shared';

export interface SelectOption {
  label: string;
  value: string;
}

export interface BusinessUnit {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface RolePermission {
  permission: {
    id: string;
    key: string;
    description?: string | null;
  };
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  permissions?: RolePermission[];
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  roleId: string;
  businessUnitId?: string | null;
  role: Role;
  businessUnit?: BusinessUnit | null;
}

export interface Company {
  id: string;
  name: string;
  legalName?: string | null;
  taxId: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  status: string;
  createdAt: string;
  businessUnit?: BusinessUnit;
  _count?: {
    contacts: number;
    opportunities: number;
    sales: number;
  };
}

export interface Contact {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  company?: Company;
  createdAt: string;
}

export interface Product {
  id: string;
  businessUnitId: string;
  name: string;
  sku: string;
  category: string;
  description?: string | null;
  unitPrice: number | string;
  stock: number;
  isActive: boolean;
  businessUnit?: BusinessUnit;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  companyId: string;
  contactId?: string | null;
  ownerId: string;
  businessUnitId: string;
  title: string;
  stage: string;
  estimatedValue: number | string;
  probability: number;
  expectedCloseDate?: string | null;
  notes?: string | null;
  company?: Company;
  contact?: Contact | null;
  owner?: Pick<CurrentUser, 'id' | 'name' | 'email'>;
  businessUnit?: BusinessUnit;
  proposals?: Proposal[];
  createdAt: string;
}

export interface ProposalItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number | string;
  discount: number | string;
  total: number | string;
  product?: Product;
}

export interface Proposal {
  id: string;
  opportunityId: string;
  code: string;
  title: string;
  status: string;
  subtotal: number | string;
  taxRate: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  validUntil?: string | null;
  notes?: string | null;
  opportunity?: Opportunity;
  items?: ProposalItem[];
  createdAt: string;
}

export interface Sale {
  id: string;
  opportunityId: string;
  proposalId?: string | null;
  companyId: string;
  ownerId: string;
  status: string;
  totalAmount: number | string;
  closedAt?: string | null;
  company?: Company;
  owner?: Pick<CurrentUser, 'id' | 'name' | 'email'>;
  opportunity?: Opportunity;
  proposal?: Proposal | null;
  createdAt: string;
}

export interface ServiceOrder {
  id: string;
  companyId: string;
  contactId?: string | null;
  saleId?: string | null;
  assignedOperatorId?: string | null;
  code: string;
  type: string;
  priority: string;
  status: string;
  description: string;
  scheduledAt?: string | null;
  completedAt?: string | null;
  company?: Company;
  contact?: Contact | null;
  sale?: Sale | null;
  assignedOperator?: Pick<CurrentUser, 'id' | 'name' | 'email'> | null;
  reviews?: Review[];
  createdAt: string;
}

export interface Invoice {
  id: string;
  saleId: string;
  companyId: string;
  invoiceNumber: string;
  status: string;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  issuedAt: string;
  dueDate: string;
  paidAt?: string | null;
  company?: Company;
  sale?: Sale;
  createdAt: string;
}

export interface Review {
  id: string;
  companyId: string;
  serviceOrderId?: string | null;
  rating: number;
  comment?: string | null;
  company?: Company;
  serviceOrder?: ServiceOrder | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email?: string;
  } | null;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export type Paged<T> = PaginatedResponse<T>;
export type DashboardData = DashboardMetrics;
