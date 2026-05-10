'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import type {
  BusinessUnit,
  Company,
  CurrentUser,
  Opportunity,
  Product,
  Role,
  Sale,
  ServiceOrder,
  Contact,
} from '@/lib/types';

export function useBusinessUnits() {
  return useQuery({
    queryKey: ['business-units'],
    queryFn: () => apiRequest<BusinessUnit[]>('/business-units'),
  });
}

export function useCompanies() {
  return useQuery({
    queryKey: ['companies-reference'],
    queryFn: async () => {
      const response = await apiRequest<{ data: Company[] }>(
        '/companies?limit=100',
      );
      return response.data;
    },
  });
}

export function useContacts() {
  return useQuery({
    queryKey: ['contacts-reference'],
    queryFn: async () => {
      const response = await apiRequest<{ data: Contact[] }>(
        '/contacts?limit=100',
      );
      return response.data;
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['users-reference'],
    queryFn: async () => {
      const response = await apiRequest<{ data: CurrentUser[] }>(
        '/users?limit=100',
      );
      return response.data;
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles-reference'],
    queryFn: () => apiRequest<Role[]>('/roles'),
  });
}

export function useProducts() {
  return useQuery({
    queryKey: ['products-reference'],
    queryFn: async () => {
      const response = await apiRequest<{ data: Product[] }>(
        '/products?limit=100',
      );
      return response.data;
    },
  });
}

export function useOpportunities() {
  return useQuery({
    queryKey: ['opportunities-reference'],
    queryFn: async () => {
      const response = await apiRequest<{ data: Opportunity[] }>(
        '/opportunities?limit=100',
      );
      return response.data;
    },
  });
}

export function useSales() {
  return useQuery({
    queryKey: ['sales-reference'],
    queryFn: async () => {
      const response = await apiRequest<{ data: Sale[] }>('/sales?limit=100');
      return response.data;
    },
  });
}

export function useServiceOrders() {
  return useQuery({
    queryKey: ['service-orders-reference'],
    queryFn: async () => {
      const response = await apiRequest<{ data: ServiceOrder[] }>(
        '/service-orders?limit=100',
      );
      return response.data;
    },
  });
}
