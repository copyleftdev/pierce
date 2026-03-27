/**
 * Cookie / Session Management
 */
import type { BrowserHandle, BrowserContextHandle } from "../adapter/types.js";

/**
 * Set a session cookie on the context.
 */
export async function setSessionCookie(
  contextHandle: BrowserContextHandle,
  name: string,
  value: string,
  domain: string,
  opts?: { path?: string }
): Promise<void> {
  await contextHandle.addCookie({
    name,
    value,
    domain,
    path: opts?.path ?? "/",
  });
}

/**
 * Get all cookies for the current context.
 */
export async function getCookies(
  contextHandle: BrowserContextHandle
): Promise<{ name: string; value: string; domain: string }[]> {
  return contextHandle.getCookies();
}

/**
 * Extract session-related cookies from the page's document.cookie.
 */
export async function getPageCookies(
  handle: BrowserHandle
): Promise<Record<string, string>> {
  return handle.evaluate(() => {
    const cookies: Record<string, string> = {};
    document.cookie.split(";").forEach((c) => {
      const [key, val] = c.trim().split("=");
      if (key) cookies[key] = val || "";
    });
    return cookies;
  });
}

/**
 * Revisit a page (simulates returning user for session gating).
 */
export async function revisit(
  handle: BrowserHandle,
  url: string,
  times = 2,
  delayMs = 200
): Promise<string> {
  let content = "";
  for (let i = 0; i < times; i++) {
    await handle.goto(url);
    await handle.waitForTimeout(500);
    if (i < times - 1) await handle.waitForTimeout(delayMs);
  }
  content = await handle.evaluate(() => document.body?.innerText?.trim() || "");
  return content;
}
