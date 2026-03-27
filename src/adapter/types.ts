/**
 * Browser Adapter Interface
 *
 * This is the only contract between scrape-primitives and the browser
 * automation framework. Implement this interface for any framework:
 * Playwright, Puppeteer, Selenium, or your own.
 *
 * Design goals:
 * - Minimal surface area (only what primitives actually need)
 * - No framework types leak into the public API
 * - Every method maps cleanly to any browser automation tool
 */

/**
 * Minimal handle to a browser page. Framework-agnostic.
 *
 * @example Playwright
 * ```ts
 * import { fromPlaywright } from '@terrabench/scrape-primitives/adapter/playwright'
 * const handle = fromPlaywright(page)
 * ```
 *
 * @example Puppeteer
 * ```ts
 * import { fromPuppeteer } from '@terrabench/scrape-primitives/adapter/puppeteer'
 * const handle = fromPuppeteer(page)
 * ```
 *
 * @example Custom
 * ```ts
 * const handle: BrowserHandle = {
 *   evaluate: (fn, arg) => myDriver.executeScript(fn, arg),
 *   goto: (url) => myDriver.navigate(url),
 *   ...
 * }
 * ```
 */
export interface BrowserHandle {
  /**
   * Execute a function in the browser context and return the result.
   * This is the core primitive — most extraction runs through this.
   *
   * The function is serialized and executed in the browser. It must be
   * self-contained (no closures over Node.js variables).
   */
  evaluate<R>(fn: (arg: any) => R, arg?: any): Promise<R>;

  /** Navigate to a URL and wait for the page to be usable. */
  goto(url: string): Promise<void>;

  /** Click an element matching a CSS selector. */
  click(selector: string): Promise<void>;

  /** Type text into a focused element or selector. */
  type(selector: string, text: string): Promise<void>;

  /** Fill an input field (sets value instantly, no keystroke simulation). */
  fill(selector: string, value: string): Promise<void>;

  /** Wait for a fixed duration (ms). Prefer smart waits over this. */
  waitForTimeout(ms: number): Promise<void>;

  /** Wait for a selector to appear in the DOM. */
  waitForSelector(selector: string, opts?: { timeout?: number }): Promise<void>;

  /**
   * Move the mouse to absolute page coordinates.
   * Used by human-like mouse movement primitives.
   */
  mouseMove(x: number, y: number): Promise<void>;

  /** Click at absolute page coordinates. */
  mouseClick(x: number, y: number): Promise<void>;

  /**
   * Get the bounding box of an element matching a selector.
   * Returns null if the element doesn't exist.
   */
  boundingBox(
    selector: string
  ): Promise<{ x: number; y: number; width: number; height: number } | null>;

  /**
   * Get content from child frames/iframes.
   * Returns an array of frame content. Implementation varies by framework.
   * If the framework doesn't support frame access, return an empty array.
   */
  frames(): Promise<FrameHandle[]>;

  /**
   * Count elements matching a selector.
   */
  count(selector: string): Promise<number>;

  /**
   * Get the text content of an element matching a selector.
   */
  textContent(selector: string): Promise<string | null>;

  /**
   * Scroll the page by a relative amount.
   */
  scroll(x: number, y: number): Promise<void>;
}

/**
 * Handle to a child frame. Subset of BrowserHandle.
 */
export interface FrameHandle {
  /** URL of the frame */
  url: string;

  /** Execute JS within this frame's context */
  evaluate<R>(fn: (arg: any) => R, arg?: any): Promise<R>;
}

/**
 * Optional: context-level operations (cookies, init scripts).
 * Not all primitives need this — only session/stealth management.
 */
export interface BrowserContextHandle {
  /** Add an init script that runs before every page navigation. */
  addInitScript(script: string): Promise<void>;

  /** Set a cookie. */
  addCookie(cookie: {
    name: string;
    value: string;
    domain: string;
    path?: string;
  }): Promise<void>;

  /** Get all cookies. */
  getCookies(): Promise<{ name: string; value: string; domain: string }[]>;
}
