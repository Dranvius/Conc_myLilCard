import { ApiError } from './api-client';
import type { DuplicateErrorPayload, PotentialDuplicate } from './types';

export function getPotentialDuplicates(error: unknown): PotentialDuplicate[] {
  if (!(error instanceof ApiError)) {
    return [];
  }

  const payload = (error.details ?? {}) as DuplicateErrorPayload;
  if (Array.isArray(payload.duplicates)) {
    return payload.duplicates;
  }
  if (Array.isArray(payload.details?.duplicates)) {
    return payload.details.duplicates;
  }

  return [];
}

export function isPotentialDuplicateError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return false;
  }

  const payload = (error.details ?? {}) as DuplicateErrorPayload;
  return (
    payload.code === 'POTENTIAL_DUPLICATE' ||
    payload.details?.code === 'POTENTIAL_DUPLICATE'
  );
}
