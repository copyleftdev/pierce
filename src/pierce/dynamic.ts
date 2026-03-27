/**
 * Dynamic Content Extraction
 *
 * Waits for AJAX/XHR/fetch/setTimeout content to appear using DOM
 * quiescence — NOT specific selectors that break under entropy.
 *
 * Fixes the 16% AJAX failure rate.
 */
import type { BrowserHandle } from "../adapter/types.js";
import { waitForQuiescence } from "../core/stability.js";

export interface DynamicContent {
  /** Content that was present on initial load */
  initial: string;
  /** Content after waiting for dynamic updates */
  final: string;
  /** New content that appeared dynamically */
  delta: string;
  /** Whether any content loaded dynamically */
  hadDynamicContent: boolean;
}

/**
 * Extract content that loads dynamically (AJAX, setTimeout, etc).
 * Uses DOM quiescence instead of specific selectors.
 */
export async function extractDynamicContent(
  handle: BrowserHandle,
  opts?: { quietMs?: number; timeoutMs?: number }
): Promise<DynamicContent> {
  // Snapshot initial state
  const initial = await handle.evaluate(
    () => document.body?.innerText?.trim() || ""
  );

  // Wait for DOM to settle
  await waitForQuiescence(handle, {
    quietMs: opts?.quietMs ?? 800,
    timeoutMs: opts?.timeoutMs ?? 10000,
  });

  // Snapshot final state
  const final = await handle.evaluate(
    () => document.body?.innerText?.trim() || ""
  );

  // Compute delta
  const initialLines = new Set(initial.split("\n").map((l) => l.trim()));
  const finalLines = final.split("\n").map((l) => l.trim());
  const newLines = finalLines.filter((l) => l && !initialLines.has(l));

  return {
    initial: initial.slice(0, 1000),
    final: final.slice(0, 2000),
    delta: newLines.join("\n").slice(0, 1000),
    hadDynamicContent: newLines.length > 0,
  };
}

/**
 * Wait for loading indicators to disappear.
 * Looks for common patterns: "Loading", spinners, skeleton screens.
 */
export async function waitForLoadingComplete(
  handle: BrowserHandle,
  timeoutMs = 10000
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const hasLoading = await handle.evaluate(() => {
      const text = document.body?.innerText || "";
      // Common loading indicators
      if (/loading|please wait|spinner/i.test(text) && text.length < 200)
        return true;
      // Skeleton elements
      if (document.querySelector('[class*="skeleton"], [class*="shimmer"]'))
        return true;
      return false;
    });
    if (!hasLoading) return true;
    await handle.waitForTimeout(200);
  }
  return false;
}
