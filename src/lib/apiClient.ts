import { existsSync } from "node:fs";
import { request, type APIRequestContext } from "playwright";
import pLimit from "p-limit";
import type { ZodType } from "zod";
import { env } from "../env.js";

const BASE_URL = "https://www.filmweb.pl";
const MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 500;

export class SessionExpiredError extends Error {
  constructor() {
    super("Filmweb session expired or invalid — run `pnpm login` again.");
  }
}

let contextPromise: Promise<APIRequestContext> | null = null;

function getContext(): Promise<APIRequestContext> {
  if (!contextPromise) {
    if (!existsSync(env.STORAGE_STATE_PATH)) {
      throw new Error(
        `No storage state found at ${env.STORAGE_STATE_PATH} — run \`pnpm login\` first.`,
      );
    }
    contextPromise = request.newContext({
      baseURL: BASE_URL,
      storageState: env.STORAGE_STATE_PATH,
      extraHTTPHeaders: { Accept: "application/json" },
    });
  }
  return contextPromise;
}

export async function closeApiClient(): Promise<void> {
  if (contextPromise) {
    const ctx = await contextPromise;
    await ctx.dispose();
    contextPromise = null;
  }
}

const limit = pLimit(4);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function apiGet<T>(
  path: string,
  schema: ZodType<T>,
  params?: Record<string, string | number>,
): Promise<T> {
  return limit(async () => {
    const ctx = await getContext();
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const res = await ctx.get(path, { params });

      if (res.status() === 401 || res.status() === 403) {
        throw new SessionExpiredError();
      }

      if (res.status() >= 500) {
        const body = await res.text();
        // Filmweb's edge masks auth failures on private endpoints as a bare
        // "ERROR" 500 body instead of a proper 401 — treat it as such.
        if (body.trim() === "ERROR") {
          throw new SessionExpiredError();
        }
        lastError = new Error(`${res.status()} ${res.statusText()} on ${path}: ${body}`);
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
        continue;
      }

      if (res.status() === 429) {
        const retryAfter = Number(res.headers()["retry-after"]) || RETRY_BASE_DELAY_MS / 1000;
        await sleep(retryAfter * 1000);
        continue;
      }

      if (!res.ok()) {
        throw new Error(`${res.status()} ${res.statusText()} on ${path}: ${await res.text()}`);
      }

      const json = await res.json();
      return schema.parse(json);
    }

    throw lastError ?? new Error(`Failed ${path} after ${MAX_RETRIES} retries`);
  });
}
