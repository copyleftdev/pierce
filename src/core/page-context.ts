/**
 * Page Context Factory
 *
 * Applies stealth anti-detection scripts to a browser context:
 * - Shadow DOM interception (captures closed shadow roots)
 * - Realistic browser fingerprint masking
 */
import type { BrowserContextHandle } from "../adapter/types.js";

const STEALTH_SCRIPT = `
  // Mask webdriver flag
  Object.defineProperty(navigator, 'webdriver', { get: () => false });

  // Fake plugins array (headless has none)
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

  // Intercept attachShadow to capture closed shadow roots
  const _origAttachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function(init) {
    const root = _origAttachShadow.call(this, init);
    // Store reference regardless of mode — accessible by our walker
    try { this.__sp_shadow = root; } catch(e) {}
    return root;
  };
`;

export interface ContextOptions {
  /** Browser viewport width (default 1920) */
  width?: number;
  /** Browser viewport height (default 1080) */
  height?: number;
  /** Locale (default "en-US") */
  locale?: string;
  /** Timezone (default "America/New_York") */
  timezone?: string;
  /** Custom user agent (default Chrome on Linux) */
  userAgent?: string;
}

/**
 * Apply stealth init scripts to a BrowserContextHandle.
 * Call BEFORE navigating to any page.
 */
export async function createContext(
  contextHandle: BrowserContextHandle,
  _opts: ContextOptions = {}
): Promise<void> {
  await contextHandle.addInitScript(STEALTH_SCRIPT);
}

/**
 * Apply stealth scripts to an existing context handle.
 */
export async function applyStealth(
  contextHandle: BrowserContextHandle
): Promise<void> {
  await contextHandle.addInitScript(STEALTH_SCRIPT);
}
