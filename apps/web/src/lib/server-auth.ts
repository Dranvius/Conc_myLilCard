import { cookies } from 'next/headers';
import { serverApiRequest } from './api-client';
import type { CurrentUser } from './types';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  if (!cookieHeader) return null;

  return serverApiRequest<CurrentUser>('/auth/me', cookieHeader);
}
