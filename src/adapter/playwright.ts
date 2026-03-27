/**
 * Playwright Adapter
 *
 * @example
 * ```ts
 * import { chromium } from 'playwright'
 * import { fromPlaywright } from '@terrabench/scrape-primitives/adapter/playwright'
 * import { extractTable } from '@terrabench/scrape-primitives'
 *
 * const browser = await chromium.launch()
 * const page = await browser.newPage()
 * const handle = fromPlaywright(page)
 *
 * await handle.goto('https://example.com')
 * const table = await extractTable(handle)
 * ```
 */
import type { BrowserHandle, FrameHandle, BrowserContextHandle } from "./types.js";

/**
 * Create a BrowserHandle from a Playwright Page.
 */
export function fromPlaywright(page: any): BrowserHandle {
  return {
    evaluate: (fn, arg) => page.evaluate(fn, arg),
    goto: async (url) => {
      await page.goto(url);
      await page.waitForLoadState("networkidle").catch(() => {});
    },
    click: (selector) => page.click(selector),
    type: (selector, text) => page.type(selector, text),
    fill: (selector, value) => page.fill(selector, value),
    waitForTimeout: (ms) => page.waitForTimeout(ms),
    waitForSelector: (selector, opts) =>
      page.waitForSelector(selector, opts).then(() => {}),
    mouseMove: (x, y) => page.mouse.move(x, y),
    mouseClick: (x, y) => page.mouse.click(x, y),
    boundingBox: async (selector) => {
      const loc = page.locator(selector).first();
      if ((await loc.count()) === 0) return null;
      return loc.boundingBox();
    },
    frames: async () =>
      page.frames().slice(1).map((frame: any) => ({
        url: frame.url(),
        evaluate: (fn: any, arg: any) => frame.evaluate(fn, arg),
      })),
    count: (selector) => page.locator(selector).count(),
    textContent: (selector) => page.locator(selector).first().textContent().catch(() => null),
    scroll: (x, y) => page.evaluate(([sx, sy]: number[]) => window.scrollBy(sx, sy), [x, y]),
  };
}

/**
 * Create a BrowserContextHandle from a Playwright BrowserContext.
 */
export function fromPlaywrightContext(context: any): BrowserContextHandle {
  return {
    addInitScript: (script) => context.addInitScript(script),
    addCookie: (cookie) =>
      context.addCookies([{ ...cookie, path: cookie.path ?? "/" }]),
    getCookies: async () => {
      const cookies = await context.cookies();
      return cookies.map((c: any) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
      }));
    },
  };
}
