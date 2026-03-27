/**
 * DOM Quiescence Detection
 *
 * Instead of waiting for specific selectors (which break under entropy),
 * we wait for the DOM to stop changing.
 */
import type { BrowserHandle } from "../adapter/types.js";
import type { QuiescenceOptions } from "../types.js";

/**
 * Wait for the DOM to reach quiescence (no mutations for `quietMs`).
 */
export async function waitForQuiescence(
  handle: BrowserHandle,
  opts: QuiescenceOptions = {}
): Promise<"quiet" | "timeout"> {
  const { quietMs = 500, timeoutMs = 10000 } = opts;
  return handle.evaluate(
    ([q, t]) => {
      return new Promise<"quiet" | "timeout">((resolve) => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        let settled = false;
        const start = Date.now();

        function reset() {
          if (settled) return;
          if (timer) clearTimeout(timer);
          if (Date.now() - start > t) {
            settled = true;
            resolve("timeout");
            return;
          }
          timer = setTimeout(() => {
            settled = true;
            observer.disconnect();
            resolve("quiet");
          }, q);
        }

        const observer = new MutationObserver(reset);
        observer.observe(document.body || document.documentElement, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
        });
        reset();
      });
    },
    [quietMs, timeoutMs]
  );
}

/**
 * Wait for visible content to appear (at least `minLength` characters).
 */
export async function waitForVisibleContent(
  handle: BrowserHandle,
  minLength = 50,
  timeoutMs = 10000
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const len = await handle.evaluate(
      () => document.body?.innerText?.trim().length ?? 0
    );
    if (len >= minLength) return true;
    await handle.waitForTimeout(100);
  }
  return false;
}

/**
 * Wait for a text pattern to appear in the page.
 */
export async function waitForText(
  handle: BrowserHandle,
  pattern: string | RegExp,
  timeoutMs = 10000
): Promise<boolean> {
  const start = Date.now();
  const source = typeof pattern === "string" ? pattern : pattern.source;
  const flags = typeof pattern === "string" ? "i" : pattern.flags;
  while (Date.now() - start < timeoutMs) {
    const found = await handle.evaluate(
      ([src, fl]) => {
        const re = new RegExp(src, fl);
        return re.test(document.body?.innerText ?? "");
      },
      [source, flags]
    );
    if (found) return true;
    await handle.waitForTimeout(100);
  }
  return false;
}
