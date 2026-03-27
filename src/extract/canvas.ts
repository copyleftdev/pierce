/**
 * Canvas Data Extraction
 *
 * Two strategies:
 * 1. Pre-render interception: hook fillText/strokeText before page loads
 *    to capture drawing commands (most reliable)
 * 2. Post-render: capture canvas as image data
 */
import type { BrowserHandle, BrowserContextHandle } from "../adapter/types.js";

export interface CanvasDrawCall {
  method: string;
  args: string[];
  canvasId: string;
}

/**
 * Init script that intercepts canvas drawing commands.
 * Must be applied to the BrowserContextHandle BEFORE navigation.
 */
export const CANVAS_INTERCEPT_SCRIPT = `
  window.__sp_canvasDrawCalls = [];
  const _origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, attrs) {
    const ctx = _origGetContext.call(this, type, attrs);
    if (type === '2d' && ctx) {
      const canvasId = this.id || 'canvas_' + document.querySelectorAll('canvas').length;
      const origFillText = ctx.fillText.bind(ctx);
      const origStrokeText = ctx.strokeText.bind(ctx);
      ctx.fillText = function(text, x, y, maxWidth) {
        window.__sp_canvasDrawCalls.push({
          method: 'fillText', args: [String(text), String(x), String(y)], canvasId
        });
        return origFillText(text, x, y, maxWidth);
      };
      ctx.strokeText = function(text, x, y, maxWidth) {
        window.__sp_canvasDrawCalls.push({
          method: 'strokeText', args: [String(text), String(x), String(y)], canvasId
        });
        return origStrokeText(text, x, y, maxWidth);
      };
    }
    return ctx;
  };
`;

/**
 * Apply canvas interception to a browser context handle.
 * Call this BEFORE navigating to the page.
 */
export async function enableCanvasIntercept(
  contextHandle: BrowserContextHandle
): Promise<void> {
  await contextHandle.addInitScript(CANVAS_INTERCEPT_SCRIPT);
}

/**
 * Retrieve intercepted canvas draw calls after page has rendered.
 */
export async function getCanvasDrawCalls(
  handle: BrowserHandle
): Promise<CanvasDrawCall[]> {
  return handle.evaluate(
    () => (window as any).__sp_canvasDrawCalls || []
  );
}

/**
 * Get text that was drawn on canvases.
 */
export async function extractCanvasText(handle: BrowserHandle): Promise<string[]> {
  const calls = await getCanvasDrawCalls(handle);
  return calls
    .filter((c) => c.method === "fillText" || c.method === "strokeText")
    .map((c) => c.args[0]);
}

/**
 * Capture canvas elements as data URLs (for screenshot/OCR fallback).
 */
export async function captureCanvasImages(
  handle: BrowserHandle
): Promise<{ id: string; dataUrl: string }[]> {
  return handle.evaluate(() => {
    const results: { id: string; dataUrl: string }[] = [];
    document.querySelectorAll("canvas").forEach((c, i) => {
      results.push({
        id: c.id || `canvas_${i}`,
        dataUrl: c.toDataURL(),
      });
    });
    return results;
  });
}
