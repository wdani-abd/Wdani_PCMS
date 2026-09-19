import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();
const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class SupabaseHttpError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(supabaseErrorMessage(detail));
    this.name = "SupabaseHttpError";
  }
}

function supabaseErrorMessage(detail: string): string {
  try {
    const parsed = JSON.parse(detail) as Record<string, unknown>;
    for (const key of ["message", "error_description", "error", "msg"]) {
      if (typeof parsed[key] === "string" && parsed[key]) return parsed[key];
    }
  } catch {
    // Supabase can return plain text for gateway errors.
  }
  return detail || "تعذر تنفيذ الطلب في قاعدة البيانات";
}

export async function supabaseRequest<T>(
  path: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
  accessToken?: string,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await connectors.proxy("supabase", path, {
      ...init,
      headers: {
        ...init.headers,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
    if (response.ok) {
      if (response.status === 204 || response.headers.get("content-length") === "0") {
        return undefined as T;
      }
      const text = await response.text();
      return (text ? JSON.parse(text) : undefined) as T;
    }
    const detail = await response.text();
    if (response.status !== 429 || attempt === 2) {
      throw new SupabaseHttpError(response.status, detail);
    }
    const retryAfter = Number(response.headers.get("retry-after") ?? 1);
    await sleep(Math.max(retryAfter, 1) * 1000);
  }
  throw new Error("Supabase request failed after retries");
}
