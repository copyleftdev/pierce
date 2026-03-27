/**
 * Browser Stealth Profile
 *
 * Consolidated anti-detection measures applied as init scripts.
 */
import type { BrowserContextHandle } from "../adapter/types.js";

/**
 * Apply full stealth profile to a browser context.
 * Includes: webdriver mask, plugin spoofing, language normalization,
 * chrome.runtime stub, and shadow DOM interception.
 *
 * Call BEFORE creating pages.
 */
export async function applyStealth(contextHandle: BrowserContextHandle): Promise<void> {
  await contextHandle.addInitScript(`
    // Mask webdriver
    Object.defineProperty(navigator, 'webdriver', { get: () => false });

    // Fake plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const arr = [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' }
        ];
        arr.length = 3;
        return arr;
      }
    });

    // Fake languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en']
    });

    // Chrome runtime stub
    window.chrome = { runtime: {} };

    // Permissions API override
    const origQuery = window.navigator.permissions?.query;
    if (origQuery) {
      window.navigator.permissions.query = (params) =>
        params.name === 'notifications'
          ? Promise.resolve({ state: 'denied', onchange: null })
          : origQuery.call(window.navigator.permissions, params);
    }

    // Intercept attachShadow for closed shadow root access
    const _origAttach = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function(init) {
      const root = _origAttach.call(this, init);
      try { this.__sp_shadow = root; } catch(e) {}
      return root;
    };

    // Canvas interception for data extraction
    window.__sp_canvasDrawCalls = [];
    const _origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, attrs) {
      const ctx = _origGetContext.call(this, type, attrs);
      if (type === '2d' && ctx) {
        const canvasId = this.id || 'canvas_' + document.querySelectorAll('canvas').length;
        const origFillText = ctx.fillText.bind(ctx);
        const origStrokeText = ctx.strokeText.bind(ctx);
        ctx.fillText = function(text, x, y, maxWidth) {
          window.__sp_canvasDrawCalls.push({ method: 'fillText', args: [String(text)], canvasId });
          return origFillText(text, x, y, maxWidth);
        };
        ctx.strokeText = function(text, x, y, maxWidth) {
          window.__sp_canvasDrawCalls.push({ method: 'strokeText', args: [String(text)], canvasId });
          return origStrokeText(text, x, y, maxWidth);
        };
      }
      return ctx;
    };
  `);
}
