import type { SessionTokenPayload } from "./types";
import { frontendEnv } from "./env";

const accessTokenStorageKey = "email-dashboard-access-token";
const refreshTokenStorageKey = "email-dashboard-refresh-token";

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return decodeURIComponent(escape(atob(padded)));
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresInSeconds: number;
}

function getAuthBaseUrl(): string {
  return frontendEnv.backendUrl;
}

export function saveAuthTokens(tokens: { accessToken: string; refreshToken: string }): void {
  window.localStorage.setItem(accessTokenStorageKey, tokens.accessToken);
  window.localStorage.setItem(refreshTokenStorageKey, tokens.refreshToken);
}

export function readAccessToken(): string | null {
  return window.localStorage.getItem(accessTokenStorageKey);
}

export function readRefreshToken(): string | null {
  return window.localStorage.getItem(refreshTokenStorageKey);
}

export function clearAuthTokens(): void {
  window.localStorage.removeItem(accessTokenStorageKey);
  window.localStorage.removeItem(refreshTokenStorageKey);
}

export async function loginWithCredentials(username: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${getAuthBaseUrl()}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error("Invalid username or password");
  }

  return (await response.json()) as AuthResponse;
}

export async function refreshSessionTokens(): Promise<string | null> {
  const refreshToken = readRefreshToken();

  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${getAuthBaseUrl()}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearAuthTokens();
    return null;
  }

  const tokens = (await response.json()) as AuthResponse;
  saveAuthTokens(tokens);
  return tokens.accessToken;
}

export async function logoutSession(): Promise<void> {
  const refreshToken = readRefreshToken();

  if (refreshToken) {
    await fetch(`${getAuthBaseUrl()}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }

  clearAuthTokens();
}

export function parseSessionToken(token: string | null): SessionTokenPayload | null {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  const payloadPart = parts[1];

  if (parts.length !== 3 || !payloadPart) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadPart)) as SessionTokenPayload;

    if (payload.exp * 1000 <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}