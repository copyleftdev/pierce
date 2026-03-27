/**
 * Human-Like Keyboard Input
 *
 * Types text with natural cadence variance — not constant-speed machine typing.
 */
import type { BrowserHandle } from "../adapter/types.js";

/**
 * Type text with human-like per-character delay variance.
 */
export async function humanType(
  handle: BrowserHandle,
  selector: string,
  text: string,
  opts?: { baseDelay?: number; variance?: number }
): Promise<void> {
  const base = opts?.baseDelay ?? 50;
  const variance = opts?.variance ?? 30;

  await handle.click(selector);
  for (const char of text) {
    await handle.type(selector, char);
    const delay = base + (Math.random() - 0.5) * 2 * variance;
    await handle.waitForTimeout(Math.max(10, delay));
  }
}

/**
 * Fill a form field by label text (entropy-tolerant — no ID/name needed).
 */
export async function fillByLabel(
  handle: BrowserHandle,
  labelPattern: string | RegExp,
  value: string
): Promise<boolean> {
  // Find input associated with label text and fill it
  const filled = await handle.evaluate(
    ({ pattern, val }) => {
      const re = new RegExp(pattern, "i");
      for (const label of document.querySelectorAll("label")) {
        if (re.test(label.textContent || "")) {
          const input =
            label.querySelector("input, textarea, select") ||
            (label.getAttribute("for")
              ? document.getElementById(label.getAttribute("for")!)
              : null);
          if (input && "value" in input) {
            (input as HTMLInputElement).value = val;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            return true;
          }
        }
      }
      // Also check aria-label
      for (const el of document.querySelectorAll(
        "input, textarea, select"
      )) {
        const ariaLabel = el.getAttribute("aria-label") || "";
        if (re.test(ariaLabel) && "value" in el) {
          (el as HTMLInputElement).value = val;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          return true;
        }
      }
      return false;
    },
    {
      pattern:
        typeof labelPattern === "string"
          ? labelPattern
          : labelPattern.source,
      val: value,
    }
  );
  return filled;
}
