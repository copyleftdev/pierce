/**
 * Adaptive Timing / Intelligent Waits
 *
 * Replaces hardcoded sleep() calls with strategies that respond
 * to actual page state.
 */
import type { BrowserHandle } from "../adapter/types.js";
import { waitForQuiescence, waitForText } from "../core/stability.js";

/**
 * Wait for delayed content to appear. Handles timing traps where
 * content loads after various setTimeout delays.
 */
export async function waitForDelayedContent(
  handle: BrowserHandle,
  opts?: { maxWaitMs?: number; quietMs?: number }
): Promise<string> {
  await waitForQuiescence(handle, {
    quietMs: opts?.quietMs ?? 500,
    timeoutMs: opts?.maxWaitMs ?? 10000,
  });
  return handle.evaluate(() => document.body?.innerText?.trim() || "");
}

/**
 * Wait for a stream of items to complete (WebSocket simulation, SSE, etc).
 * Detects completion by looking for "complete"/"done"/"finished" text,
 * or by DOM quiescence.
 */
export async function waitForStreamComplete(
  handle: BrowserHandle,
  opts?: {
    completionPattern?: string | RegExp;
    timeoutMs?: number;
  }
): Promise<boolean> {
  const pattern = opts?.completionPattern ?? /complete|finished|done|✅/i;
  const timeout = opts?.timeoutMs ?? 30000;

  const found = await waitForText(handle, pattern, timeout);
  if (found) return true;

  // Fallback: wait for quiescence with longer quiet period
  await waitForQuiescence(handle, { quietMs: 2000, timeoutMs: timeout });
  return false;
}

/**
 * Smart delay — uses human-like random variance instead of fixed ms.
 */
export async function humanDelay(
  handle: BrowserHandle,
  baseMs = 500,
  variance = 200
): Promise<void> {
  const delay = baseMs + (Math.random() - 0.5) * 2 * variance;
  await handle.waitForTimeout(Math.max(50, delay));
}
