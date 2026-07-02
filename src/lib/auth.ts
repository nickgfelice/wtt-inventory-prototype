import type { AuthUser } from "./types";

type AuthResponse = {
  user: AuthUser | null;
};

async function authFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Auth request failed (${response.status})`);
  }
  return body as T;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const result = await authFetch<AuthResponse>("/api/auth");
  return result.user;
}

export async function loginWithGoogleCredential(
  credential: string,
): Promise<AuthUser> {
  const result = await authFetch<AuthResponse>("/api/auth", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
  if (!result.user) {
    throw new Error("Login did not return a user.");
  }
  return result.user;
}

export async function logout(): Promise<void> {
  await authFetch<{ ok: boolean }>("/api/auth", {
    method: "POST",
    body: JSON.stringify({ action: "logout" }),
  });
}
