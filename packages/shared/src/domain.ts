export const roles = ['ADMIN', 'MANAGER', 'SALES', 'OPERATOR'] as const;
export type RoleName = (typeof roles)[number];

export const businessUnitNames = ['Insumos', 'Medical', 'MYB'] as const;
export type BusinessUnitName = (typeof businessUnitNames)[number];

export const companyStatuses = [
  'LEAD',
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
] as const;
export type CompanyStatus = (typeof companyStatuses)[number];

export const opportunityStages = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'WON',
  'LOST',
] as const;
export type OpportunityStage = (typeof opportunityStages)[number];

export const proposalStatuses = [
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
] as const;
export type ProposalStatus = (typeof proposalStatuses)[number];

export const saleStatuses = [
  'PENDING',
  'CONFIRMED',
  'CLOSED',
  'CANCELLED',
] as const;
export type SaleStatus = (typeof saleStatuses)[number];

export const serviceOrderStatuses = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;
export type ServiceOrderStatus = (typeof serviceOrderStatuses)[number];

export const serviceOrderPriorities = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
] as const;
export type ServiceOrderPriority = (typeof serviceOrderPriorities)[number];

export const invoiceStatuses = [
  'DRAFT',
  'ISSUED',
  'PAID',
  'OVERDUE',
  'CANCELLED',
] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface StageBreakdownItem {
  stage: string;
  count: number;
}

export interface BusinessUnitSalesItem {
  businessUnit: string;
  totalSales: number;
  totalAmount: number;
}

export interface ProposalStatusBreakdownItem {
  status: string;
  count: number;
}

export interface SellerRankingItem {
  userId: string;
  sellerName: string;
  totalSales: number;
  totalAmount: number;
}

export interface DashboardMetrics {
  totals: {
    companies: number;
    contacts: number;
    openOpportunities: number;
    closedSales: number;
    totalSoldValue: number;
    pendingInvoices: number;
    openServiceOrders: number;
  };
  opportunitiesByStage: StageBreakdownItem[];
  salesByBusinessUnit: BusinessUnitSalesItem[];
  proposalsByStatus: ProposalStatusBreakdownItem[];
  sellerRanking: SellerRankingItem[];
  recentActivity: Array<{
    id: string;
    action: string;
    entity: string;
    createdAt: string;
    actorName: string | null;
  }>;
}
