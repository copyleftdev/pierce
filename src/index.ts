/**
 * pierce
 *
 * Entropy-tolerant extraction primitives that pierce through any DOM.
 * Framework-agnostic — works with Playwright, Puppeteer, or your own adapter.
 *
 * @example
 * ```ts
 * import { fromPlaywright } from 'pierce/adapter/playwright'
 * import { extractTable, detectHoneypots, waitForQuiescence } from 'pierce'
 *
 * const handle = fromPlaywright(page)
 * await handle.goto('https://example.com')
 * await waitForQuiescence(handle)
 * const table = await extractTable(handle)
 * ```
 */

// Adapter — framework-agnostic browser handle
export type { BrowserHandle, FrameHandle, BrowserContextHandle } from "./adapter/types.js";
export { fromPlaywright, fromPlaywrightContext } from "./adapter/playwright.js";
export { fromPuppeteer, fromPuppeteerBrowser } from "./adapter/puppeteer.js";

// Core
export { createContext, applyStealth } from "./core/page-context.js";
export { waitForQuiescence, waitForVisibleContent, waitForText } from "./core/stability.js";
export { walkDOM, walkFrames } from "./core/dom-walker.js";
export {
  findBySemanticTag,
  findByVisibleText,
  findByRole,
  findAction,
  findInputNear,
  findMainContent,
  findByDataAttr,
  findElement,
} from "./core/selector-engine.js";

// Extract
export {
  extractVisibleText,
  extractCleanText,
  extractPseudoContent,
  extractSplitText,
  extractByHeadings,
} from "./extract/text.js";
export { extractTable, extractAllTables } from "./extract/table.js";
export { extractStructuredData } from "./extract/structured-data.js";
export { extractCSSData } from "./extract/css-data.js";
export { extractSVGData } from "./extract/svg.js";
export {
  enableCanvasIntercept,
  getCanvasDrawCalls,
  extractCanvasText,
  captureCanvasImages,
} from "./extract/canvas.js";

// Detect
export { checkVisibility, getVisible, getHidden } from "./detect/visibility.js";
export { detectHoneypots } from "./detect/honeypot.js";
export { filterDecoys } from "./detect/decoy.js";

// Pierce
export { extractShadowContent, extractShadowText, hasShadowDOM } from "./pierce/shadow-dom.js";
export { extractFrameContent, countFrames } from "./pierce/iframe.js";
export { extractDynamicContent, waitForLoadingComplete } from "./pierce/dynamic.js";

// Navigate
export { findNextControl, paginate } from "./navigate/pagination.js";
export { navigateSPA, waitForHydration } from "./navigate/spa.js";
export { followJourney } from "./navigate/journey.js";

// Interact
export { humanMouseMove, humanMouseTraverse, humanClick } from "./interact/mouse.js";
export { humanType, fillByLabel } from "./interact/keyboard.js";
export { waitForDelayedContent, waitForStreamComplete, humanDelay } from "./interact/timing.js";
export { solveMathCaptcha, submitCaptcha } from "./interact/captcha.js";

// Session
export { applyStealth as applyStealthProfile } from "./session/stealth.js";
export { setSessionCookie, getCookies, getPageCookies, revisit } from "./session/cookies.js";

// Types
export type {
  ScrapeContext,
  ExtractionResult,
  VisibilityCheck,
  TableData,
  FormField,
  StructuredData,
  CSSData,
  ShadowContent,
  FrameContent,
  PaginationResult,
  JourneyStep,
  MousePath,
  CaptchaChallenge,
  SelectorStrategy,
  QuiescenceOptions,
} from "./types.js";
