import type { AuthTokens, RefreshTokens } from "../types/auth";

const TOKEN_BASE_KEY = "motosos.auth";
const INVALID_REFRESH_MARKER = "invalidated-locally-for-dev";

function tokenKeyFor(userId: string): string {
  return `${TOKEN_BASE_KEY}.${userId}`;
}

function normalizeTokens(parsed: Partial<AuthTokens>): AuthTokens | null {
  if (
    typeof parsed.accessToken !== "string" ||
    typeof parsed.refreshToken !== "string"
  ) {
    return null;
  }

  return {
    accessToken: parsed.accessToken,
    refreshToken: parsed.refreshToken,
    accessTokenExpiresAtUtc:
      typeof parsed.accessTokenExpiresAtUtc === "string" ? parsed.accessTokenExpiresAtUtc : undefined,
    refreshTokenExpiresAtUtc:
      typeof parsed.refreshTokenExpiresAtUtc === "string" ? parsed.refreshTokenExpiresAtUtc : undefined,
  };
}

export function saveAuthTokens(userId: string, tokens: RefreshTokens | AuthTokens): AuthTokens {
  const nextTokens: AuthTokens = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    accessTokenExpiresAtUtc: tokens.accessTokenExpiresAtUtc,
    refreshTokenExpiresAtUtc: tokens.refreshTokenExpiresAtUtc,
  };

  window.sessionStorage.setItem(tokenKeyFor(userId), JSON.stringify(nextTokens));
  return nextTokens;
}

export function getAuthTokens(userId: string): AuthTokens | null {
  const stored = window.sessionStorage.getItem(tokenKeyFor(userId));

  if (!stored) {
    return null;
  }

  try {
    return normalizeTokens(JSON.parse(stored) as Partial<AuthTokens>);
  } catch {
    return null;
  }
}

export function getAccessTokenExpiry(userId: string): string | null {
  const tokens = getAuthTokens(userId);

  if (!tokens?.accessTokenExpiresAtUtc) {
    return null;
  }

  return tokens.accessTokenExpiresAtUtc;
}

// DEV-only: overwrite the local access-token expiry to force a refresh on the next protected call.
// It never modifies the JWT itself.
export function overrideAccessTokenExpiry(userId: string, expiresAtUtc: string): void {
  if (!import.meta.env.DEV) {
    return;
  }

  const tokens = getAuthTokens(userId);

  if (!tokens) {
    return;
  }

  saveAuthTokens(userId, {
    ...tokens,
    accessTokenExpiresAtUtc: expiresAtUtc,
  });
}

// DEV-only: replace the refresh token with a clearly-invalid marker to test the invalid-refresh path.
export function invalidateRefreshToken(userId: string): void {
  if (!import.meta.env.DEV) {
    return;
  }

  const tokens = getAuthTokens(userId);

  if (!tokens) {
    return;
  }

  saveAuthTokens(userId, {
    ...tokens,
    refreshToken: INVALID_REFRESH_MARKER,
  });
}

export function isRefreshTokenMarkedInvalid(userId: string): boolean {
  return getAuthTokens(userId)?.refreshToken === INVALID_REFRESH_MARKER;
}

export function clearAuthTokens(userId: string) {
  window.sessionStorage.removeItem(tokenKeyFor(userId));
}