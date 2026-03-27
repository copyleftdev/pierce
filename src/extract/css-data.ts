/**
 * CSS Data Extraction
 *
 * Extracts data hidden in CSS — custom properties, pseudo-element content,
 * attr() references, and computed styles. Does NOT rely on variable names
 * matching a pattern — extracts everything exhaustively.
 *
 * This fixes the 12% CSS exfiltration failure under entropy, where variable
 * names shift between seeds.
 */
import type { BrowserHandle } from "../adapter/types.js";
import type { CSSData, ExtractionResult } from "../types.js";

export async function extractCSSData(
  handle: BrowserHandle,
  selector?: string
): Promise<ExtractionResult<CSSData>> {
  const start = Date.now();

  const data = await handle.evaluate((sel) => {
    const result: {
      variables: Record<string, string>;
      pseudoContent: { selector: string; pseudo: string; content: string }[];
      dataAttributes: Record<string, string>;
    } = { variables: {}, pseudoContent: [], dataAttributes: {} };

    // 1. Extract ALL CSS custom properties from ALL stylesheets
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          const text = rule.cssText;
          // Custom properties (--anything: value)
          const varMatches = text.matchAll(
            /--([\w-]+)\s*:\s*["']?([^;"']+?)["']?\s*[;}/]/g
          );
          for (const m of varMatches) {
            result.variables[`--${m[1]}`] = m[2].trim();
          }
          // Content properties
          const contentMatch = text.match(
            /content\s*:\s*["']([^"']+?)["']/
          );
          if (contentMatch) {
            const selectorMatch = text.match(/^([^{]+)\{/);
            result.pseudoContent.push({
              selector: selectorMatch?.[1]?.trim() || "unknown",
              pseudo: text.includes("::before")
                ? "::before"
                : text.includes("::after")
                  ? "::after"
                  : "direct",
              content: contentMatch[1],
            });
          }
        }
      } catch {
        // Cross-origin stylesheet — skip
      }
    }

    // 2. Scan all elements for computed pseudo-element content
    const scope = sel
      ? document.querySelector(sel) || document.body
      : document.body;

    scope.querySelectorAll("*").forEach((el: Element) => {
      for (const pseudo of ["::before", "::after"] as const) {
        const s = getComputedStyle(el, pseudo);
        const c = s.content;
        if (c && c !== "none" && c !== "normal" && c !== '""') {
          const id =
            el.id ||
            el.className?.toString().slice(0, 30) ||
            el.tagName.toLowerCase();
          result.pseudoContent.push({
            selector: id,
            pseudo,
            content: c.replace(/^"|"$/g, ""),
          });
        }
      }

      // 3. Extract ALL data-* attributes
      for (const attr of Array.from(el.attributes) as Attr[]) {
        if (attr.name.startsWith("data-") && attr.value) {
          const key = `${el.tagName.toLowerCase()}.${attr.name}`;
          result.dataAttributes[key] = attr.value;
        }
      }
    });

    return result;
  }, selector ?? null);

  const hasData =
    Object.keys(data.variables).length > 0 ||
    data.pseudoContent.length > 0 ||
    Object.keys(data.dataAttributes).length > 0;

  return {
    data,
    confidence: hasData ? 0.85 : 0,
    strategy: "exhaustive-css-scan",
    elapsed: Date.now() - start,
  };
}
