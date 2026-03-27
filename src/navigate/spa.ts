/**
 * SPA Navigation
 *
 * Handles single-page app navigation where content is rendered by JS.
 * Clicks navigation elements and waits for hydration/rendering.
 */
import type { BrowserHandle } from "../adapter/types.js";
import { waitForQuiescence } from "../core/stability.js";

/**
 * Navigate within a SPA by clicking a navigation element matching a pattern.
 * Waits for the DOM to re-render after navigation.
 */
export async function navigateSPA(
  handle: BrowserHandle,
  linkPattern: string | RegExp,
  opts?: { waitMs?: number; hydratedAttr?: string }
): Promise<boolean> {
  const re =
    typeof linkPattern === "string"
      ? new RegExp(linkPattern, "i")
      : linkPattern;

  // Find navigation element by text content or onclick attribute
  const clicked = await handle.evaluate((pattern) => {
    const re = new RegExp(pattern, "i");
    // Try links and buttons with matching text
    for (const el of document.querySelectorAll("a, button, [onclick]")) {
      const text = el.textContent?.trim() || "";
      const onclick = el.getAttribute("onclick") || "";
      if (re.test(text) || re.test(onclick)) {
        (el as HTMLElement).click();
        return true;
      }
    }
    return false;
  }, re.source);

  if (!clicked) return false;

  // Wait for hydration
  if (opts?.hydratedAttr) {
    try {
      await handle.waitForSelector(`[${opts.hydratedAttr}="true"]`, {
        timeout: opts?.waitMs ?? 5000,
      });
    } catch {
      await waitForQuiescence(handle, {
        quietMs: 300,
        timeoutMs: opts?.waitMs ?? 5000,
      });
    }
  } else {
    await waitForQuiescence(handle, {
      quietMs: 300,
      timeoutMs: opts?.waitMs ?? 5000,
    });
  }

  return true;
}

/**
 * Wait for a SPA to finish hydrating (initial render).
 */
export async function waitForHydration(
  handle: BrowserHandle,
  opts?: { attr?: string; timeoutMs?: number }
): Promise<boolean> {
  const attr = opts?.attr ?? "data-hydrated";
  try {
    await handle.waitForSelector(`[${attr}="true"]`, {
      timeout: opts?.timeoutMs ?? 5000,
    });
    return true;
  } catch {
    // Fallback: wait for quiescence
    await waitForQuiescence(handle, {
      quietMs: 500,
      timeoutMs: opts?.timeoutMs ?? 5000,
    });
    return false;
  }
}
