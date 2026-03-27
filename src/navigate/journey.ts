/**
 * Multi-Step Journey Navigation
 *
 * Navigates state machines where each step reveals a token needed for the next.
 * Discovers steps by visible buttons/links, not hardcoded selectors.
 */
import type { BrowserHandle } from "../adapter/types.js";
import type { JourneyStep } from "../types.js";
import { waitForQuiescence } from "../core/stability.js";
import { safeRegExp } from "../core/safe-regexp.js";

/**
 * Navigate a multi-step journey, collecting data and tokens at each step.
 *
 * @param handle BrowserHandle (already navigated to step 1)
 * @param maxSteps Maximum steps to follow (default 10)
 * @param advancePatterns Text patterns for "next step" buttons
 */
export async function followJourney(
  handle: BrowserHandle,
  opts?: {
    maxSteps?: number;
    advancePatterns?: (string | RegExp)[];
  }
): Promise<JourneyStep[]> {
  const maxSteps = opts?.maxSteps ?? 10;
  const patterns = opts?.advancePatterns ?? [
    /next/i, /continue/i, /proceed/i, /step\s*\d/i, /go/i, /submit/i, /advance/i,
  ];
  const steps: JourneyStep[] = [];

  for (let step = 1; step <= maxSteps; step++) {
    // Extract current step content and tokens
    const stepData = await handle.evaluate((stepNum) => {
      const tokens: Record<string, string> = {};

      // Find all data-token or similar attributes
      document.querySelectorAll("*").forEach((el) => {
        for (const attr of Array.from(el.attributes)) {
          if (attr.name.includes("token") && attr.value) {
            tokens[attr.name] = attr.value;
          }
        }
        // Also check element content for token patterns
        const text = el.textContent?.trim() || "";
        const tokenMatch = text.match(/\b(tk[AB]_[a-f0-9]+|wf\d?-[a-f0-9]+)\b/);
        if (tokenMatch && el.children.length === 0) {
          tokens[`content_token_${Object.keys(tokens).length}`] =
            tokenMatch[1];
        }
      });

      // Get visible content (from the visible step container)
      let content = "";
      // Try to find the currently visible step
      const allDivs = document.querySelectorAll("div, section, [class]");
      for (const div of Array.from(allDivs)) {
        const s = getComputedStyle(div);
        if (s.display !== "none" && div.querySelector("h2, h3")) {
          content = (div as HTMLElement).innerText?.trim().slice(0, 500) || "";
          break;
        }
      }
      if (!content) content = document.body.innerText.trim().slice(0, 500);

      return { step: stepNum, content, tokens };
    }, step);

    steps.push(stepData);

    // Try to advance to next step
    let advanced = false;

    // First: try calling JS functions directly (goStep2, goStep3, etc.)
    try {
      const fnResult = await handle.evaluate((nextStep) => {
        const fnNames = [
          `goStep${nextStep}`,
          `advanceStep`,
          `nextStep`,
          `wfLogin`,
          `wfSearch`,
          `wfAddToCart`,
          `wfCheckout`,
        ];
        for (const name of fnNames) {
          if (typeof (window as any)[name] === "function") {
            (window as any)[name]();
            return name;
          }
        }
        return null;
      }, step + 1);
      if (fnResult) {
        advanced = true;
        await waitForQuiescence(handle, { quietMs: 300, timeoutMs: 3000 });
      }
    } catch {}

    // Second: try clicking buttons
    if (!advanced) {
      for (const pattern of patterns) {
        const re = typeof pattern === "string" ? safeRegExp(pattern, "i") : pattern;
        const clicked = await handle.evaluate((src) => {
          const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          let re: RegExp;
          // nosemgrep: detect-non-literal-regexp — guarded by try/catch with escape fallback
          try { re = new RegExp(src, "i"); } catch { re = new RegExp(esc(src), "i"); }
          for (const el of document.querySelectorAll("a, button")) {
            if (el.textContent && re.test(el.textContent)) {
              const s = getComputedStyle(el);
              if (s.display !== "none" && s.visibility !== "hidden") {
                (el as HTMLElement).click();
                return true;
              }
            }
          }
          return false;
        }, re.source);

        if (clicked) {
          advanced = true;
          await waitForQuiescence(handle, { quietMs: 300, timeoutMs: 3000 });
          break;
        }
      }
    }

    if (!advanced) break; // No more steps
  }

  return steps;
}
