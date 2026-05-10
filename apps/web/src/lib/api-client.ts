import { getApiBaseUrl } from './captcha';

interface ApiRequestOptions extends RequestInit {
  skipRetry?: boolean;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  return response.text() as T;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { skipRetry, headers, ...rest } = options;
  const response = await fetch(`${getApiBaseUrl()}/api${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });

  if (response.status === 401 && !skipRetry) {
    const refreshResponse = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshResponse.ok) {
      return apiRequest<T>(path, { ...options, skipRetry: true });
    }
  }

  if (!response.ok) {
    const payload = await readResponse<{
      message?: string | string[];
      details?: unknown;
      code?: string;
      duplicates?: unknown;
    }>(response);
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message || 'No fue posible completar la solicitud';
    throw new ApiError(message, response.status, payload);
  }

  return readResponse<T>(response);
}

export async function downloadApiFile(path: string, fallbackFileName: string) {
  const response = await fetch(`${getApiBaseUrl()}/api${path}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const payload = await readResponse<{
      message?: string | string[];
      details?: unknown;
      code?: string;
    }>(response);
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message || 'No fue posible descargar el archivo';
    throw new ApiError(message, response.status, payload);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const contentDisposition = response.headers.get('content-disposition') ?? '';
  const fileNameMatch = contentDisposition.match(/filename=\"?([^"]+)\"?/i);
  anchor.href = url;
  anchor.download = fileNameMatch?.[1] ?? fallbackFileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export async function serverApiRequest<T>(path: string, cookieHeader: string) {
  const response = await fetch(`${getApiBaseUrl()}/api${path}`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}
