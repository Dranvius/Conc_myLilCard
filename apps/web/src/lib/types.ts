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
  latitude?: number | null;
  longitude?: number | null;
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
  source?: string | null;
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
  source?: string | null;
  stageChangedAt?: string;
  leadScore?: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  leadScoreValue?: number;
  leadScoreReasons?: string[];
  daysWithoutMovement?: number;
  isStale?: boolean;
  staleSeverity?: 'warning' | 'critical' | null;
  lastActivityAt?: string | null;
  nextActivityAt?: string | null;
  openActivitiesCount?: number;
  overdueActivitiesCount?: number;
  totalActivitiesCount?: number;
  company?: Company;
  contact?: Contact | null;
  owner?: Pick<CurrentUser, 'id' | 'name' | 'email'>;
  businessUnit?: BusinessUnit;
  proposals?: Proposal[];
  stageHistory?: Array<{
    id: string;
    fromStage?: string | null;
    toStage: string;
    changedAt: string;
    changedBy?: { id: string; name: string } | null;
  }>;
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
  type?: string;
  referenceType?: string | null;
  referenceId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  date: string;
  companyId?: string | null;
  opportunityId?: string | null;
  contactId?: string | null;
  status?: 'PLANNED' | 'COMPLETED';
  dueDate?: string | null;
  completedAt?: string | null;
  isOverdue?: boolean;
  createdBy?: { id: string; name: string };
}

export interface ActivityFeedItem {
  id: string;
  source: 'AUDIT' | 'ACTIVITY';
  eventType: string;
  entity: string;
  entityId: string;
  title: string;
  description: string;
  actorName: string;
  createdAt: string;
  dueDate?: string | null;
  completedAt?: string | null;
}

export interface PotentialDuplicate {
  entityType: 'company' | 'contact' | 'opportunity';
  id: string;
  title: string;
  subtitle: string;
  href: string;
  matchScore: number;
  reasons: string[];
}

export interface DuplicateErrorPayload {
  statusCode?: number;
  code?: string;
  message?: string | string[];
  details?: {
    code?: string;
    duplicates?: PotentialDuplicate[];
  };
  duplicates?: PotentialDuplicate[];
}

export interface FollowUpInboxItem extends Opportunity {
  companyName?: string;
  ownerName?: string;
  daysSinceLastContact?: number | null;
  followUpState:
    | 'OVERDUE'
    | 'TODAY'
    | 'UPCOMING'
    | 'NO_NEXT_ACTIVITY'
    | 'NO_RECENT_CONTACT'
    | 'NO_RESPONSE'
    | 'STALE'
    | 'NEW_LEAD'
    | 'ON_TRACK';
  actionRecommended: string;
}

export interface FollowUpInboxResponse {
  data: FollowUpInboxItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    overdue: number;
    today: number;
    upcoming: number;
    noNextActivity: number;
    noRecentContact: number;
    noResponse: number;
    stale: number;
    newLeads: number;
    mine: number;
    highPriority: number;
  };
}

export interface ForecastAccuracyItem {
  opportunityId: string;
  opportunityTitle: string;
  companyName: string;
  ownerId: string;
  ownerName: string;
  estimatedValue: number;
  probability: number;
  weightedValue: number;
  closedRealValue: number;
  differenceValue: number;
  accuracyPct: number;
  expectedCloseDate?: string | null;
}

export interface ForecastAccuracyBySeller {
  ownerId: string;
  ownerName: string;
  opportunities: number;
  estimatedValue: number;
  weightedValue: number;
  closedRealValue: number;
  differenceValue: number;
  accuracyPct: number;
}

export interface ForecastAccuracyResponse {
  range: {
    from: string;
    to: string;
  };
  summary: {
    opportunities: number;
    estimatedValue: number;
    weightedValue: number;
    closedRealValue: number;
    differenceValue: number;
    accuracyPct: number;
  };
  bySeller: ForecastAccuracyBySeller[];
  items: ForecastAccuracyItem[];
}

export interface CommercialSlaResponse {
  range: {
    from: string;
    to: string;
  };
  summary: {
    opportunities: number;
    avgFirstContactHours: number;
    firstContactWithin24hPct: number;
    abandonedOpportunities: number;
    withoutNextActivity: number;
    overdueActivities: number;
    completedOnTime: number;
    completedLate: number;
    completedOnTimePct: number;
    uncontactedLeads: number;
  };
  bySeller: Array<{
    ownerId: string;
    ownerName: string;
    opportunities: number;
    avgFirstContactHours: number;
    overdueActivities: number;
    withoutNextActivity: number;
    stale: number;
  }>;
  bySource: Array<{
    source: string;
    opportunities: number;
    avgFirstContactHours: number;
    overdueActivities: number;
  }>;
  stageDuration: Array<{
    stage: string;
    opportunities: number;
    avgDaysInStage: number;
  }>;
  atRisk: Array<{
    opportunityId: string;
    title: string;
    companyName: string;
    ownerName: string;
    stage: string;
    leadScore?: string;
    daysWithoutMovement?: number;
    nextActivityAt?: string | null;
    lastActivityAt?: string | null;
    overdueActivitiesCount: number;
    followUpCompliance: string;
  }>;
}

export interface LeadSourcePerformanceResponse {
  range: {
    from: string;
    to: string;
  };
  summary: {
    leads: number;
    estimatedValue: number;
    closedRealValue: number;
    avgFirstContactHours: number;
    avgCloseDays: number;
    avgLeadScore: number;
  };
  bySource: Array<{
    source: string;
    leads: number;
    opportunities: number;
    leadToOpportunityPct: number;
    wonCount: number;
    wonPct: number;
    estimatedValue: number;
    closedRealValue: number;
    avgTicket: number;
    avgFirstContactHours: number;
    avgCloseDays: number;
    avgLeadScore: number;
    abandonmentRatePct: number;
  }>;
}

export interface AdvancedForecastGroupItem {
  key: string;
  label: string;
  opportunities: number;
  estimatedValue: number;
  weightedValue: number;
  closedRealValue: number;
  differenceValue: number;
  accuracyPct: number;
}

export interface AdvancedForecastResponse {
  range: {
    from: string;
    to: string;
  };
  summary: {
    opportunities: number;
    estimatedValue: number;
    weightedValue: number;
    closedRealValue: number;
    differenceValue: number;
    accuracyPct: number;
  };
  bySeller: AdvancedForecastGroupItem[];
  byStage: AdvancedForecastGroupItem[];
  bySource: AdvancedForecastGroupItem[];
  byBusinessUnit: AdvancedForecastGroupItem[];
  monthlyTrend: Array<{
    month: string;
    weightedForecast: number;
    closedRealValue: number;
  }>;
}

export type Paged<T> = PaginatedResponse<T>;
export type DashboardData = DashboardMetrics;
