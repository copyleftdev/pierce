/**
 * Entropy-Tolerant Selector Engine
 *
 * The #1 reason scrapers break under entropy: they rely on IDs and class names.
 * This engine finds elements by semantic role, content, structure, and computed
 * properties — never by ID/class unless as a last resort.
 */
import type { BrowserHandle } from "../adapter/types.js";

// ---------------------------------------------------------------------------
// Find elements by semantic HTML tags (most entropy-resistant)
// Returns an array of text contents for matching elements.
// ---------------------------------------------------------------------------
export async function findBySemanticTag(
  handle: BrowserHandle,
  tags: string | string[]
): Promise<string[]> {
  const selector = (Array.isArray(tags) ? tags : [tags]).join(", ");
  return handle.evaluate((sel) => {
    return Array.from(document.querySelectorAll(sel)).map(
      (el) => el.textContent?.trim() || ""
    );
  }, selector);
}

// ---------------------------------------------------------------------------
// Find elements by visible text content (second most stable)
// Returns array of matching element text contents.
// ---------------------------------------------------------------------------
export async function findByVisibleText(
  handle: BrowserHandle,
  pattern: string | RegExp
): Promise<string[]> {
  const source = typeof pattern === "string" ? pattern : pattern.source;
  const flags = typeof pattern === "string" ? "i" : pattern.flags;
  return handle.evaluate(
    ([src, fl]) => {
      const re = new RegExp(src, fl);
      const results: string[] = [];
      document.querySelectorAll("*").forEach((el) => {
        if (el.children.length === 0) {
          const text = el.textContent?.trim() || "";
          if (text && re.test(text)) results.push(text);
        }
      });
      return results;
    },
    [source, flags]
  );
}

// ---------------------------------------------------------------------------
// Find elements by ARIA role
// Returns array of matching element text contents.
// ---------------------------------------------------------------------------
export async function findByRole(
  handle: BrowserHandle,
  role: string,
  options?: { name?: string | RegExp }
): Promise<string[]> {
  const nameSource = options?.name
    ? typeof options.name === "string"
      ? options.name
      : options.name.source
    : null;
  const nameFlags = options?.name
    ? typeof options.name === "string"
      ? "i"
      : options.name.flags
    : null;
  return handle.evaluate(
    ([r, ns, nf]) => {
      const results: string[] = [];
      const els = document.querySelectorAll(`[role="${r}"]`);
      // Also check implicit roles via tag mapping
      const implicitMap: Record<string, string[]> = {
        button: ["button"],
        link: ["a"],
        heading: ["h1", "h2", "h3", "h4", "h5", "h6"],
        navigation: ["nav"],
        main: ["main"],
        complementary: ["aside"],
        list: ["ul", "ol"],
        listitem: ["li"],
        textbox: ["input", "textarea"],
      };
      const implicit = implicitMap[r] || [];
      const allEls = [
        ...Array.from(els),
        ...implicit.flatMap((tag) =>
          Array.from(document.querySelectorAll(tag))
        ),
      ];
      for (const el of allEls) {
        const text = el.textContent?.trim() || "";
        if (ns) {
          const re = new RegExp(ns, nf || "i");
          if (re.test(text) || re.test(el.getAttribute("aria-label") || "")) {
            results.push(text);
          }
        } else {
          results.push(text);
        }
      }
      return results;
    },
    [role, nameSource, nameFlags] as [string, string | null, string | null]
  );
}

// ---------------------------------------------------------------------------
// Find interactive elements (buttons, links) by their visible text
// Returns the text of the first matching element, or null.
// ---------------------------------------------------------------------------
export async function findAction(
  handle: BrowserHandle,
  textPattern: string | RegExp
): Promise<string | null> {
  const source =
    typeof textPattern === "string" ? textPattern : textPattern.source;
  const flags =
    typeof textPattern === "string" ? "i" : textPattern.flags;
  return handle.evaluate(
    ([src, fl]) => {
      const re = new RegExp(src, fl);
      for (const selector of ["button", "a", '[role="button"]', "[onclick]"]) {
        for (const el of document.querySelectorAll(selector)) {
          const text = el.textContent?.trim() || "";
          if (text && re.test(text)) return text;
        }
      }
      return null;
    },
    [source, flags]
  );
}

// ---------------------------------------------------------------------------
// Find form inputs by proximity to label text (not by name/id)
// Returns the count of matching labeled inputs.
// ---------------------------------------------------------------------------
export async function findInputNear(
  handle: BrowserHandle,
  labelPattern: string | RegExp
): Promise<number> {
  const source =
    typeof labelPattern === "string" ? labelPattern : labelPattern.source;
  const flags =
    typeof labelPattern === "string" ? "i" : labelPattern.flags;
  return handle.evaluate(
    ([src, fl]) => {
      const re = new RegExp(src, fl);
      let count = 0;
      for (const label of document.querySelectorAll("label")) {
        if (re.test(label.textContent || "")) {
          const input =
            label.querySelector("input, textarea, select") ||
            (label.getAttribute("for")
              ? document.getElementById(label.getAttribute("for")!)
              : null);
          if (input) count++;
        }
      }
      // Also check aria-label
      for (const el of document.querySelectorAll(
        "input, textarea, select"
      )) {
        const ariaLabel = el.getAttribute("aria-label") || "";
        if (re.test(ariaLabel)) count++;
      }
      return count;
    },
    [source, flags]
  );
}

// ---------------------------------------------------------------------------
// Find the "main content" area — works regardless of class/id naming
// Returns the text content of the main area.
// ---------------------------------------------------------------------------
export async function findMainContent(handle: BrowserHandle): Promise<string> {
  return handle.evaluate(() => {
    for (const sel of [
      "main",
      '[role="main"]',
      "article",
      "#content",
      "#app",
    ]) {
      const el = document.querySelector(sel);
      if (el) return (el as HTMLElement).innerText?.trim() || "";
    }
    return document.body?.innerText?.trim() || "";
  });
}

// ---------------------------------------------------------------------------
// Find elements by data-* attribute presence (prefix scanning, not exact name)
// ---------------------------------------------------------------------------
export async function findByDataAttr(
  handle: BrowserHandle,
  attrPattern: string | RegExp
): Promise<string[]> {
  return handle.evaluate((pattern) => {
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let re: RegExp;
    // nosemgrep: detect-non-literal-regexp — guarded by try/catch with escape fallback
    try { re = new RegExp(pattern); } catch { re = new RegExp(esc(pattern)); }
    const results: string[] = [];
    document.querySelectorAll("*").forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith("data-") && re.test(attr.name)) {
          results.push(attr.value);
        }
      }
    });
    return results;
  }, typeof attrPattern === "string" ? attrPattern : attrPattern.source);
}

// ---------------------------------------------------------------------------
// Smart element finder — cascading strategy
// ---------------------------------------------------------------------------
export interface FindOptions {
  semantic?: string | string[];     // HTML tags to try
  role?: string;                    // ARIA role
  text?: string | RegExp;           // Visible text pattern
  dataAttr?: string | RegExp;       // data-* attribute pattern
}

/**
 * Find an element using a cascading strategy.
 * Returns the text content of the first match, or null.
 */
export async function findElement(
  handle: BrowserHandle,
  opts: FindOptions
): Promise<string | null> {
  // 1. Semantic tags
  if (opts.semantic) {
    const results = await findBySemanticTag(handle, opts.semantic);
    if (results.length > 0) return results[0];
  }
  // 2. ARIA role
  if (opts.role) {
    const results = await findByRole(handle, opts.role);
    if (results.length > 0) return results[0];
  }
  // 3. Visible text
  if (opts.text) {
    const results = await findByVisibleText(handle, opts.text);
    if (results.length > 0) return results[0];
  }
  return null;
}
