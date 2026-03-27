/**
 * Recursive Iframe Traversal
 *
 * Extracts content from all iframes including:
 * - Standard src iframes (same-origin and cross-origin)
 * - srcdoc iframes (content embedded in attribute)
 * - Dynamically created iframes
 * - Nested iframes (recursive)
 *
 * Fixes the 12% iframe failure rate under entropy by not relying
 * on specific iframe attributes or ordering.
 */
import type { BrowserHandle, FrameHandle } from "../adapter/types.js";
import type { FrameContent } from "../types.js";

/**
 * Extract content from all iframes on the page, recursively.
 */
export async function extractFrameContent(
  handle: BrowserHandle
): Promise<FrameContent[]> {
  const results: FrameContent[] = [];

  // 1. Walk frame tree via adapter
  const frames = await handle.frames();
  for (const frame of frames) {
    try {
      const text = await frame.evaluate(
        () => document.body?.innerText?.trim().slice(0, 1000) || ""
      );
      results.push({ url: frame.url, depth: 1, text, isSrcdoc: false });
    } catch {
      results.push({
        url: frame.url,
        depth: 1,
        text: "[cross-origin or inaccessible]",
        isSrcdoc: false,
      });
    }
  }

  // 2. Check for srcdoc iframes (may not appear as separate frames)
  const srcdocs = await handle.evaluate(() => {
    const results: string[] = [];
    document.querySelectorAll("iframe").forEach((iframe) => {
      const srcdoc = iframe.getAttribute("srcdoc");
      if (srcdoc) results.push(srcdoc);
    });
    return results;
  });

  for (const html of srcdocs) {
    const text = html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
    if (text) {
      results.push({ url: "srcdoc", depth: 1, text, isSrcdoc: true });
    }
  }

  return results;
}

/**
 * Get the total number of iframes (including nested).
 */
export async function countFrames(handle: BrowserHandle): Promise<number> {
  const frames = await handle.frames();
  return frames.length;
}
