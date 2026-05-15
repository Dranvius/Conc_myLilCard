type CookieOptions = {
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  maxAge?: number;
};

export function parseSetCookie(header: string) {
  const parts = header.split(';').map((part) => part.trim());
  const [nameValue, ...attributes] = parts;
  const eqIndex = nameValue.indexOf('=');
  const name = nameValue.slice(0, eqIndex);
  const value = nameValue.slice(eqIndex + 1);

  const options: CookieOptions = {};
  for (const attr of attributes) {
    const [key, ...valueParts] = attr.split('=');
    const normalizedKey = key.trim().toLowerCase();
    const normalizedValue = valueParts.join('=').trim();

    if (normalizedKey === 'path') options.path = normalizedValue;
    if (normalizedKey === 'httponly') options.httpOnly = true;
    if (normalizedKey === 'secure') options.secure = true;
    if (normalizedKey === 'samesite') {
      options.sameSite = normalizedValue.toLowerCase() as
        | 'lax'
        | 'strict'
        | 'none';
    }
    if (normalizedKey === 'max-age') {
      options.maxAge = Number.parseInt(normalizedValue, 10);
    }
  }

  return { name, value, options };
}

function splitCombinedSetCookieHeader(header: string) {
  // Fallback para runtimes donde fetch no expone headers.getSetCookie().
  // En esta app las cookies usan Max-Age y no Expires, por eso este split
  // es suficiente para separar múltiples cookies combinadas en un solo header.
  return header
    .split(/,(?=\s*[^;,=\s]+=[^;,]+)/g)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getSetCookieHeaders(headers: Headers) {
  const headersWithGetter = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headersWithGetter.getSetCookie === 'function') {
    return headersWithGetter.getSetCookie();
  }

  const combinedHeader = headers.get('set-cookie');
  if (!combinedHeader) {
    return [];
  }

  return splitCombinedSetCookieHeader(combinedHeader);
}
