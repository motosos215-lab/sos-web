export const ACCESS_TOKEN_EXPIRY_MARGIN_MS = 30000;

function isValidDateLike(value: unknown): value is string | number | Date {
  return (typeof value === "string" && value.length > 0) || typeof value === "number" || value instanceof Date;
}

export function parseDate(value: unknown): Date | null {
  if (!isValidDateLike(value)) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function isExpiringSoon(expiresAtUtc: unknown, now: Date = new Date(), marginMs = ACCESS_TOKEN_EXPIRY_MARGIN_MS): boolean {
  const parsed = parseDate(expiresAtUtc);

  if (!parsed) {
    return true;
  }

  return parsed.getTime() - now.getTime() < marginMs;
}

export function isExpired(expiresAtUtc: unknown, now: Date = new Date()): boolean {
  const parsed = parseDate(expiresAtUtc);

  if (!parsed) {
    return true;
  }

  return parsed.getTime() <= now.getTime();
}

export function toValidDateIso(expiresAtUtc: unknown): string | undefined {
  const parsed = parseDate(expiresAtUtc);

  return parsed ? parsed.toISOString() : undefined;
}

export function isAccessTokenUsable(expiresAtUtc: string | null | undefined): boolean {
  if (!expiresAtUtc) {
    return false;
  }

  const expirationTime = Date.parse(expiresAtUtc);

  if (Number.isNaN(expirationTime)) {
    return false;
  }

  return expirationTime - ACCESS_TOKEN_EXPIRY_MARGIN_MS > Date.now();
}
