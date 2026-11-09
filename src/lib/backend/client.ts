import "server-only";

import { getAccountAccess } from "@/lib/auth/server";

export class BackendApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId: string | null,
  ) {
    super(message);
    this.name = "BackendApiError";
  }
}

/** Server-only bridge. The API independently verifies the forwarded token. */
export async function backendRequest<T>(
  path: `/api/v1/${string}`,
  init: Omit<RequestInit, "headers"> & { headers?: HeadersInit } = {},
): Promise<T> {
  const base = process.env.SHOGHLY_API_URL;
  if (!base)
    throw new BackendApiError("Backend service is not configured.", 503, null);
  const endpoint = new URL(base);
  if (
    endpoint.username ||
    endpoint.password ||
    endpoint.pathname !== "/" ||
    endpoint.search ||
    endpoint.hash ||
    (endpoint.protocol !== "https:" &&
      !(
        process.env.NODE_ENV === "development" &&
        ["127.0.0.1", "localhost", "::1"].includes(endpoint.hostname)
      ))
  ) {
    throw new BackendApiError(
      "Backend service configuration is invalid.",
      503,
      null,
    );
  }

  const access = await getAccountAccess();
  if (access.kind !== "active")
    throw new BackendApiError(
      "A verified active session is required.",
      401,
      null,
    );
  const { data, error } = await access.supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token)
    throw new BackendApiError(
      "The verified session token is unavailable.",
      401,
      null,
    );

  const requestUrl = new URL(path, endpoint);
  if (
    requestUrl.origin !== endpoint.origin ||
    !requestUrl.pathname.startsWith("/api/v1/")
  ) {
    throw new BackendApiError("Backend request path is invalid.", 400, null);
  }

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      ...init,
      cache: "no-store",
      headers: {
        ...Object.fromEntries(new Headers(init.headers).entries()),
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new BackendApiError(
      "Backend service is temporarily unavailable.",
      503,
      null,
    );
  }
  const requestId = response.headers.get("x-request-id");
  if (!response.ok)
    throw new BackendApiError(
      "Backend request failed.",
      response.status,
      requestId,
    );
  return response.json() as Promise<T>;
}
