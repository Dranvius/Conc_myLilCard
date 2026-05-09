'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { buildQueryString } from '@/lib/query-string';

export function useApiList<T>(
  queryKey: unknown[],
  path: string,
  params: Record<string, unknown>,
) {
  return useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<T>(
        `${path}${buildQueryString(params as Record<string, string>)}`,
      ),
  });
}
