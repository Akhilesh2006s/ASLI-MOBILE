/** Decode a JWT payload without verifying (client display / storage keys only). */
export function decodeJwtPayload(token?: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
    const json = typeof atob === 'function' ? atob(padded) : '';
    if (!json) return null;
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function jwtUserId(token?: string | null): string {
  const payload = decodeJwtPayload(token);
  if (!payload) return '';
  return String(payload.userId || payload.id || payload._id || '').trim();
}

export function jwtRole(token?: string | null): string {
  const payload = decodeJwtPayload(token);
  return String(payload?.role || '').toLowerCase();
}
