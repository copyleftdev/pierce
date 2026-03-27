/**
 * Entropy-Tolerant Pagination
 *
 * Discovers "next page" controls without relying on specific text or selectors.
 * Strategy chain:
 * 1. rel="next" link (standardized)
 * 2. aria-label containing "next" (accessible)
 * 3. Visible text matching next/arrows patterns
 * 4. Numbered pagination (find current, click next number)
 * 5. "Load More" button
 */
import type { BrowserHandle } from "../adapter/types.js";
import { waitForQuiescence } from "../core/stability.js";

export interface PageItems<T = string> {
  pageNum: number;
  items: T[];
}

/**
 * Find and click the "next page" control using multiple strategies.
 * Returns true if a next control was found and clicked, false otherwise.
 */
export async function findNextControl(handle: BrowserHandle): Promise<boolean> {
  return handle.evaluate(() => {
    // 1. rel="next"
    const relNext = document.querySelector('a[rel="next"], link[rel="next"]') as HTMLElement | null;
    if (relNext) {
      const s = getComputedStyle(relNext);
      if (s.display !== "none" && s.visibility !== "hidden") {
        // Don't click yet, just report that we found it
        return true;
      }
    }

    // 2. aria-label
    for (const el of document.querySelectorAll("[aria-label]")) {
      const label = (el.getAttribute("aria-label") || "").toLowerCase();
      if (label.includes("next")) {
        const s = getComputedStyle(el);
        if (s.display !== "none" && s.visibility !== "hidden") return true;
      }
    }

    // 3. Visible text patterns
    const patterns = ["Next", "next", "\u2192", ">>", "\u203A", "\u25B6"];
    for (const pattern of patterns) {
      for (const el of document.querySelectorAll("a, button")) {
        const text = el.textContent?.trim() || "";
        if (text.includes(pattern)) {
          const s = getComputedStyle(el);
          if (s.display !== "none" && s.visibility !== "hidden") return true;
        }
      }
    }

    // 4. "Load More"
    const loadMorePatterns = ["Load More", "load more", "Show More", "View More"];
    for (const pattern of loadMorePatterns) {
      for (const el of document.querySelectorAll("button, a")) {
        const text = el.textContent?.trim() || "";
        if (text.toLowerCase().includes(pattern.toLowerCase())) {
          const s = getComputedStyle(el);
          if (s.display !== "none" && s.visibility !== "hidden") return true;
        }
      }
    }

    return false;
  });
}

/**
 * Click the next page control. Returns true if clicked.
 */
async function clickNextControl(handle: BrowserHandle): Promise<boolean> {
  return handle.evaluate(() => {
    // 1. rel="next"
    const relNext = document.querySelector('a[rel="next"], link[rel="next"]') as HTMLElement | null;
    if (relNext) {
      const s = getComputedStyle(relNext);
      if (s.display !== "none" && s.visibility !== "hidden") {
        relNext.click();
        return true;
      }
    }

    // 2. aria-label
    for (const el of document.querySelectorAll("[aria-label]")) {
      const label = (el.getAttribute("aria-label") || "").toLowerCase();
      if (label.includes("next")) {
        const s = getComputedStyle(el);
        if (s.display !== "none" && s.visibility !== "hidden") {
          (el as HTMLElement).click();
          return true;
        }
      }
    }

    // 3. Visible text patterns
    const patterns = ["Next", "next", "\u2192", ">>", "\u203A", "\u25B6"];
    for (const pattern of patterns) {
      for (const el of document.querySelectorAll("a, button")) {
        const text = el.textContent?.trim() || "";
        if (text.includes(pattern)) {
          const s = getComputedStyle(el);
          if (s.display !== "none" && s.visibility !== "hidden") {
            (el as HTMLElement).click();
            return true;
          }
        }
      }
    }

    // 4. "Load More"
    const loadMorePatterns = ["Load More", "load more", "Show More", "View More"];
    for (const pattern of loadMorePatterns) {
      for (const el of document.querySelectorAll("button, a")) {
        const text = el.textContent?.trim() || "";
        if (text.toLowerCase().includes(pattern.toLowerCase())) {
          const s = getComputedStyle(el);
          if (s.display !== "none" && s.visibility !== "hidden") {
            (el as HTMLElement).click();
            return true;
          }
        }
      }
    }

    return false;
  });
}

/**
 * Extract items from each page, following pagination automatically.
 *
 * @param handle BrowserHandle (already navigated to page 1)
 * @param extractFn Function that extracts items from the current page view
 * @param maxPages Safety limit (default 50)
 */
export async function paginate<T>(
  handle: BrowserHandle,
  extractFn: (handle: BrowserHandle) => Promise<T[]>,
  maxPages = 50
): Promise<PageItems<T>[]> {
  const results: PageItems<T>[] = [];

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const items = await extractFn(handle);
    if (items.length === 0 && pageNum > 1) break;
    results.push({ pageNum, items });

    const hasNext = await findNextControl(handle);
    if (!hasNext) break;

    // Check if next control is disabled
    const disabled = await handle.evaluate(() => {
      // Check rel="next" first
      const relNext = document.querySelector('a[rel="next"]') as HTMLElement | null;
      if (relNext) {
        return (
          (relNext as HTMLButtonElement).disabled ||
          relNext.classList.contains("disabled") ||
          relNext.getAttribute("aria-disabled") === "true"
        );
      }
      // Check aria-label next
      for (const el of document.querySelectorAll("[aria-label]")) {
        const label = (el.getAttribute("aria-label") || "").toLowerCase();
        if (label.includes("next")) {
          return (
            (el as HTMLButtonElement).disabled ||
            el.classList.contains("disabled") ||
            el.getAttribute("aria-disabled") === "true"
          );
        }
      }
      return false;
    });
    if (disabled) break;

    await clickNextControl(handle);
    // Brief pause to let navigation settle before checking quiescence
    await handle.waitForTimeout(200);
    await waitForQuiescence(handle, { quietMs: 300, timeoutMs: 5000 });
  }

  return results;
}
