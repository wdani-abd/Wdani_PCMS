import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();
const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function supabaseRequest<T>(
  path: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await connectors.proxy("supabase", path, init);
    if (response.ok) {
      return (await response.json()) as T;
    }
    const detail = await response.text();
    if (response.status !== 429 || attempt === 2) {
      throw new Error(`Supabase request failed (${response.status}): ${detail}`);
    }
    const retryAfter = Number(response.headers.get("retry-after") ?? 1);
    await sleep(Math.max(retryAfter, 1) * 1000);
  }
  throw new Error("Supabase request failed after retries");
}
