/**
 * Entropy-Tolerant Text Extraction
 *
 * Handles: zero-width characters, Unicode lookalikes, HTML entities,
 * character splitting across spans, CSS pseudo-element content,
 * and base64-encoded text. Uses rendered DOM state, not source parsing.
 */
import type { BrowserHandle } from "../adapter/types.js";

/**
 * Extract all visible text from the page after the browser has rendered
 * everything — entities decoded, JS executed, CSS applied.
 */
export async function extractVisibleText(
  handle: BrowserHandle,
  selector?: string
): Promise<string> {
  return handle.evaluate((sel) => {
    const root = sel
      ? document.querySelector(sel) || document.body
      : document.querySelector("main") || document.body;
    return (root as HTMLElement).innerText?.trim() || "";
  }, selector ?? null);
}

/**
 * Extract text with zero-width characters stripped.
 */
export async function extractCleanText(
  handle: BrowserHandle,
  selector?: string
): Promise<string> {
  const text = await extractVisibleText(handle, selector);
  return text.replace(/[\u200b\u200c\u200d\u2060\ufeff\u00ad]/g, "");
}

/**
 * Extract all pseudo-element (::before, ::after) content from the page.
 * Crucial for CSS exfiltration challenges where data lives in stylesheets.
 */
export async function extractPseudoContent(
  handle: BrowserHandle,
  selector?: string
): Promise<{ element: string; pseudo: string; content: string }[]> {
  return handle.evaluate((sel) => {
    const scope = sel
      ? document.querySelector(sel) || document.body
      : document.body;
    const results: { element: string; pseudo: string; content: string }[] = [];

    scope.querySelectorAll("*").forEach((el: Element) => {
      for (const pseudo of ["::before", "::after"] as const) {
        const s = getComputedStyle(el, pseudo);
        const content = s.content;
        if (
          content &&
          content !== "none" &&
          content !== "normal" &&
          content !== '""'
        ) {
          results.push({
            element:
              el.id ||
              el.className?.toString().slice(0, 30) ||
              el.tagName.toLowerCase(),
            pseudo,
            content: content.replace(/^"|"$/g, ""),
          });
        }
      }
    });
    return results;
  }, selector ?? null);
}

/**
 * Reconstruct text from split-across-spans pattern.
 * Some obfuscation splits each character into its own <span>.
 */
export async function extractSplitText(
  handle: BrowserHandle,
  containerSelector: string
): Promise<string> {
  return handle.evaluate((sel) => {
    const container = document.querySelector(sel);
    if (!container) return "";
    const spans = container.querySelectorAll("span");
    if (spans.length > 0) {
      return Array.from(spans)
        .map((s: any) => s.textContent || "")
        .join("");
    }
    return container.textContent?.trim() || "";
  }, containerSelector);
}

/**
 * Extract text from all sections organized by heading.
 * Works regardless of class names — uses heading hierarchy.
 */
export async function extractByHeadings(
  handle: BrowserHandle,
  selector?: string
): Promise<Record<string, string[]>> {
  return handle.evaluate((sel) => {
    const scope = sel
      ? document.querySelector(sel) || document.body
      : document.querySelector("main") || document.body;
    const sections: Record<string, string[]> = {};
    let currentKey = "__intro";

    for (const child of scope.querySelectorAll("*")) {
      if (["H1", "H2", "H3", "H4", "H5", "H6"].includes(child.tagName)) {
        currentKey = child.textContent?.trim() || currentKey;
        if (!sections[currentKey]) sections[currentKey] = [];
      } else if (
        ["P", "DIV", "SPAN", "LI"].includes(child.tagName) &&
        child.children.length === 0
      ) {
        const text = child.textContent?.trim();
        if (text && text.length > 2) {
          if (!sections[currentKey]) sections[currentKey] = [];
          sections[currentKey].push(text);
        }
      }
    }
    return sections;
  }, selector ?? null);
}
