/**
 * Cross-boundary DOM Walker
 *
 * Traverses the entire document tree including shadow roots and iframes,
 * returning a unified view of all content regardless of encapsulation.
 */
import type { BrowserHandle, FrameHandle } from "../adapter/types.js";

export interface WalkedNode {
  tag: string;
  text: string;
  attributes: Record<string, string>;
  depth: number;
  inShadow: boolean;
  frameDepth: number;
}

/**
 * Walk all elements in a page, piercing shadow roots.
 * Returns flattened array of node info.
 */
export async function walkDOM(handle: BrowserHandle): Promise<WalkedNode[]> {
  return handle.evaluate(() => {
    const results: any[] = [];

    function walk(node: Element, depth: number, inShadow: boolean) {
      const attrs: Record<string, string> = {};
      for (const attr of Array.from(node.attributes || [])) {
        attrs[attr.name] = attr.value;
      }
      results.push({
        tag: node.tagName?.toLowerCase() || "",
        text: node.textContent?.trim().slice(0, 200) || "",
        attributes: attrs,
        depth,
        inShadow,
        frameDepth: 0,
      });

      // Pierce shadow root (open)
      if (node.shadowRoot) {
        for (const child of Array.from(node.shadowRoot.children)) {
          walk(child as Element, depth + 1, true);
        }
      }
      // Intercepted closed shadow root
      if ((node as any).__interceptedShadowRoot) {
        const sr = (node as any).__interceptedShadowRoot;
        for (const child of Array.from(sr.children)) {
          walk(child as Element, depth + 1, true);
        }
      }

      // Regular children
      for (const child of Array.from(node.children || [])) {
        walk(child as Element, depth + 1, inShadow);
      }
    }

    walk(document.documentElement, 0, false);
    return results;
  });
}

/**
 * Walk all frames (including nested iframes) and extract content from each.
 */
export async function walkFrames(
  handle: BrowserHandle
): Promise<{ url: string; depth: number; text: string }[]> {
  const results: { url: string; depth: number; text: string }[] = [];

  const frames = await handle.frames();
  for (const frame of frames) {
    try {
      const text = await frame.evaluate(() =>
        document.body?.innerText?.trim().slice(0, 1000) || ""
      );
      results.push({ url: frame.url, depth: 1, text });
    } catch {
      results.push({ url: frame.url, depth: 1, text: "[inaccessible]" });
    }
  }

  // Also check srcdoc iframes that might not appear as separate frames
  const srcdocs = await handle.evaluate(() => {
    const results: string[] = [];
    document.querySelectorAll("iframe[srcdoc]").forEach((iframe) => {
      results.push((iframe as HTMLIFrameElement).getAttribute("srcdoc") || "");
    });
    return results;
  });
  for (const sd of srcdocs) {
    const text = sd.replace(/<[^>]+>/g, " ").trim().slice(0, 500);
    if (text) results.push({ url: "srcdoc", depth: 1, text });
  }

  return results;
}
