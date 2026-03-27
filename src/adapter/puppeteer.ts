/**
 * Puppeteer Adapter
 *
 * @example
 * ```ts
 * import puppeteer from 'puppeteer'
 * import { fromPuppeteer } from '@terrabench/scrape-primitives/adapter/puppeteer'
 * import { extractTable } from '@terrabench/scrape-primitives'
 *
 * const browser = await puppeteer.launch()
 * const page = await browser.newPage()
 * const handle = fromPuppeteer(page)
 *
 * await handle.goto('https://example.com')
 * const table = await extractTable(handle)
 * ```
 */
import type { BrowserHandle, FrameHandle, BrowserContextHandle } from "./types.js";

/**
 * Create a BrowserHandle from a Puppeteer Page.
 */
export function fromPuppeteer(page: any): BrowserHandle {
  return {
    evaluate: (fn, arg) => page.evaluate(fn, arg),
    goto: async (url) => {
      await page.goto(url, { waitUntil: "networkidle0" }).catch(() =>
        page.goto(url, { waitUntil: "domcontentloaded" })
      );
    },
    click: (selector) => page.click(selector),
    type: (selector, text) => page.type(selector, text),
    fill: async (selector, value) => {
      await page.evaluate(
        ([sel, val]: [string, string]) => {
          const el = document.querySelector(sel) as HTMLInputElement;
          if (el) {
            el.value = val;
            el.dispatchEvent(new Event("input", { bubbles: true }));
          }
        },
        [selector, value]
      );
    },
    waitForTimeout: (ms) => new Promise((r) => setTimeout(r, ms)),
    waitForSelector: (selector, opts) =>
      page.waitForSelector(selector, opts).then(() => {}),
    mouseMove: (x, y) => page.mouse.move(x, y),
    mouseClick: (x, y) => page.mouse.click(x, y),
    boundingBox: async (selector) => {
      const el = await page.$(selector);
      if (!el) return null;
      return el.boundingBox();
    },
    frames: async () =>
      page.frames().slice(1).map((frame: any) => ({
        url: frame.url(),
        evaluate: (fn: any, arg: any) => frame.evaluate(fn, arg),
      })),
    count: async (selector) => {
      const els = await page.$$(selector);
      return els.length;
    },
    textContent: async (selector) => {
      const el = await page.$(selector);
      if (!el) return null;
      return page.evaluate((e: Element) => e.textContent, el);
    },
    scroll: (x, y) => page.evaluate(([sx, sy]: number[]) => window.scrollBy(sx, sy), [x, y]),
  };
}

/**
 * Create a BrowserContextHandle from a Puppeteer Browser.
 */
export function fromPuppeteerBrowser(browser: any): BrowserContextHandle {
  return {
    addInitScript: async (script) => {
      const pages = await browser.pages();
      for (const page of pages) {
        await page.evaluateOnNewDocument(script);
      }
    },
    addCookie: async (cookie) => {
      const pages = await browser.pages();
      if (pages.length > 0) {
        await pages[0].setCookie({
          ...cookie,
          path: cookie.path ?? "/",
        });
      }
    },
    getCookies: async () => {
      const pages = await browser.pages();
      if (pages.length === 0) return [];
      const cookies = await pages[0].cookies();
      return cookies.map((c: any) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
      }));
    },
  };
}
