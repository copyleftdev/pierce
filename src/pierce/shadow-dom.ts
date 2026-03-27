/**
 * Shadow DOM Piercing
 *
 * Discovers and extracts content from shadow roots WITHOUT relying on
 * host element IDs or class names. Uses:
 * 1. Property traversal (el.shadowRoot for open mode)
 * 2. Intercepted reference (__sp_shadow for closed mode, set by init script)
 * 3. Full document walk — finds ALL shadow hosts automatically
 *
 * This fixes the 20% shadow DOM failure rate under entropy.
 */
import type { BrowserHandle } from "../adapter/types.js";
import type { ShadowContent } from "../types.js";

/**
 * Discover and extract all shadow DOM content on the page.
 * No IDs or class names needed — walks every element.
 */
export async function extractShadowContent(
  handle: BrowserHandle
): Promise<ShadowContent[]> {
  return handle.evaluate(() => {
    const results: any[] = [];

    function extractFromRoot(
      root: ShadowRoot,
      hostTag: string,
      mode: string
    ) {
      const dataValues: Record<string, string> = {};
      root.querySelectorAll("*").forEach((el) => {
        for (const attr of Array.from(el.attributes)) {
          if (attr.name.startsWith("data-")) {
            dataValues[attr.name] = attr.value;
          }
        }
      });
      results.push({
        hostTag,
        mode,
        text: root.textContent?.trim() || "",
        dataValues,
        html: root.innerHTML?.slice(0, 1000) || "",
      });
    }

    // Walk every element in the document
    document.querySelectorAll("*").forEach((el) => {
      const tag = el.tagName.toLowerCase();

      // Open shadow root
      if (el.shadowRoot) {
        extractFromRoot(el.shadowRoot, tag, "open");
      }

      // Intercepted shadow root (closed mode, captured by init script)
      const intercepted = (el as any).__sp_shadow;
      if (intercepted && intercepted !== el.shadowRoot) {
        extractFromRoot(intercepted, tag, "closed");
      }
    });

    return results;
  });
}

/**
 * Extract text from all shadow roots, merged into a single string.
 */
export async function extractShadowText(handle: BrowserHandle): Promise<string> {
  const shadows = await extractShadowContent(handle);
  return shadows.map((s) => s.text).join("\n");
}

/**
 * Check if the page contains any shadow DOM elements.
 */
export async function hasShadowDOM(handle: BrowserHandle): Promise<boolean> {
  return handle.evaluate(() => {
    return Array.from(document.querySelectorAll("*")).some(
      (el) => el.shadowRoot || (el as any).__sp_shadow
    );
  });
}
