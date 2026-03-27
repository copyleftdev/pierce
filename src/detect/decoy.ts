/**
 * Decoy Filtering
 *
 * Separates real data from plausible-but-fake decoy elements.
 * Uses computed visibility, aria-hidden, and structural signals.
 */
import type { BrowserHandle } from "../adapter/types.js";

export interface DecoyResult {
  real: string[];
  decoys: string[];
}

/**
 * Filter real vs decoy records from the page.
 * Checks: computed visibility, aria-hidden, opacity, color tricks.
 */
export async function filterDecoys(
  handle: BrowserHandle,
  containerSelector?: string
): Promise<DecoyResult> {
  return handle.evaluate((container) => {
    const scope = container
      ? document.querySelector(container) || document.body
      : document.body;
    const real: string[] = [];
    const decoys: string[] = [];

    scope
      .querySelectorAll("tr, li, article, section, [class], div")
      .forEach((el: Element) => {
        const s = getComputedStyle(el);
        const text = el.textContent?.trim() || "";
        if (text.length < 3) return;

        const isDecoy =
          el.getAttribute("aria-hidden") === "true" ||
          s.display === "none" ||
          s.visibility === "hidden" ||
          parseFloat(s.opacity) === 0 ||
          // Same fg/bg color = invisible text
          (s.color === s.backgroundColor &&
            s.color !== "rgba(0, 0, 0, 0)") ||
          // Element or its data attrs explicitly mark it
          (el as HTMLElement).dataset?.decoy === "true";

        const isReal = (el as HTMLElement).dataset?.real === "true";

        if (isDecoy && !isReal) {
          decoys.push(text.slice(0, 150));
        } else if (
          el.tagName === "TR" ||
          el.tagName === "LI" ||
          el.tagName === "ARTICLE" ||
          isReal
        ) {
          real.push(text.slice(0, 150));
        }
      });

    return {
      real: real.slice(0, 50),
      decoys: decoys.slice(0, 50),
    };
  }, containerSelector ?? null);
}
