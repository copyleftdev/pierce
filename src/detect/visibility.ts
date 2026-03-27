/**
 * Computed Visibility Oracle
 *
 * Determines element visibility using ONLY getComputedStyle — never class names,
 * inline styles, or attribute strings. This is the universal foundation for
 * honeypot detection, decoy filtering, and real-content extraction.
 *
 * Why this matters: under entropy, the *method* of hiding changes (class name,
 * inline style, CSS rule, parent inheritance), but getComputedStyle always
 * reflects the final rendered state.
 */
import type { BrowserHandle } from "../adapter/types.js";
import type { VisibilityCheck } from "../types.js";

/**
 * In-browser visibility check script.
 * Returns results for all matched elements.
 */
const VISIBILITY_SCRIPT = `(selector) => {
  const els = selector ? document.querySelectorAll(selector) : document.querySelectorAll('input, select, textarea');
  return Array.from(els).map(el => {
    const s = getComputedStyle(el);
    const reasons = [];
    let visible = true;

    // display: none
    if (s.display === 'none') { visible = false; reasons.push('display:none'); }

    // visibility: hidden
    if (s.visibility === 'hidden') { visible = false; reasons.push('visibility:hidden'); }

    // opacity: 0
    if (parseFloat(s.opacity) === 0) { visible = false; reasons.push('opacity:0'); }

    // Positioned off-screen (left/top < -1000)
    const left = parseInt(s.left);
    const top = parseInt(s.top);
    if (!isNaN(left) && Math.abs(left) > 1000) { visible = false; reasons.push('offscreen-left'); }
    if (!isNaN(top) && Math.abs(top) > 1000) { visible = false; reasons.push('offscreen-top'); }

    // Zero dimensions
    const h = parseInt(s.height);
    const w = parseInt(s.width);
    if (h === 0 && w === 0) { visible = false; reasons.push('zero-size'); }

    // Clip to zero
    if (s.clip === 'rect(0px, 0px, 0px, 0px)' || s.clipPath === 'inset(100%)') {
      visible = false; reasons.push('clipped');
    }

    // Overflow hidden + zero size
    if (s.overflow === 'hidden' && (h === 0 || w === 0)) {
      visible = false; reasons.push('overflow-hidden-zero');
    }

    // aria-hidden
    if (el.getAttribute('aria-hidden') === 'true') {
      visible = false; reasons.push('aria-hidden');
    }

    // Check parent chain (inherited hiding)
    let parent = el.parentElement;
    let depth = 0;
    while (parent && depth < 10) {
      const ps = getComputedStyle(parent);
      if (ps.display === 'none') { visible = false; reasons.push('parent-display:none'); break; }
      if (parseFloat(ps.opacity) === 0) { visible = false; reasons.push('parent-opacity:0'); break; }
      const pLeft = parseInt(ps.left);
      const pTop = parseInt(ps.top);
      if (!isNaN(pLeft) && Math.abs(pLeft) > 1000) { visible = false; reasons.push('parent-offscreen'); break; }
      if (!isNaN(pTop) && Math.abs(pTop) > 1000) { visible = false; reasons.push('parent-offscreen'); break; }
      parent = parent.parentElement;
      depth++;
    }

    // Color === backgroundColor (invisible text, common decoy)
    if (s.color === s.backgroundColor && s.color !== 'rgba(0, 0, 0, 0)') {
      reasons.push('same-color-as-bg');
    }

    return {
      visible,
      reasons,
      tag: el.tagName.toLowerCase(),
      type: el.type || el.tagName.toLowerCase(),
      name: el.name || '',
      text: el.textContent?.trim().slice(0, 100) || ''
    };
  });
}`;

export interface VisibleElement {
  visible: boolean;
  reasons: string[];
  tag: string;
  type: string;
  name: string;
  text: string;
}

/**
 * Check visibility of all elements matching a selector.
 * If no selector given, checks all form inputs.
 */
export async function checkVisibility(
  handle: BrowserHandle,
  selector?: string
): Promise<VisibleElement[]> {
  return handle.evaluate(
    (sel) => {
      const els = sel
        ? document.querySelectorAll(sel)
        : document.querySelectorAll("input, select, textarea");
      return Array.from(els).map((el) => {
        const s = getComputedStyle(el);
        const reasons: string[] = [];
        let visible = true;
        if (s.display === "none") { visible = false; reasons.push("display:none"); }
        if (s.visibility === "hidden") { visible = false; reasons.push("visibility:hidden"); }
        if (parseFloat(s.opacity) === 0) { visible = false; reasons.push("opacity:0"); }
        const left = parseInt(s.left);
        const top = parseInt(s.top);
        if (!isNaN(left) && Math.abs(left) > 1000) { visible = false; reasons.push("offscreen-left"); }
        if (!isNaN(top) && Math.abs(top) > 1000) { visible = false; reasons.push("offscreen-top"); }
        const h = parseInt(s.height);
        const w = parseInt(s.width);
        if (h === 0 && w === 0) { visible = false; reasons.push("zero-size"); }
        if (s.clip === "rect(0px, 0px, 0px, 0px)" || s.clipPath === "inset(100%)") {
          visible = false; reasons.push("clipped");
        }
        if (el.getAttribute("aria-hidden") === "true") { visible = false; reasons.push("aria-hidden"); }
        let parent = el.parentElement;
        let depth = 0;
        while (parent && depth < 10) {
          const ps = getComputedStyle(parent);
          if (ps.display === "none") { visible = false; reasons.push("parent-hidden"); break; }
          if (parseFloat(ps.opacity) === 0) { visible = false; reasons.push("parent-opacity:0"); break; }
          const pl = parseInt(ps.left);
          const pt = parseInt(ps.top);
          if (!isNaN(pl) && Math.abs(pl) > 1000) { visible = false; reasons.push("parent-offscreen"); break; }
          if (!isNaN(pt) && Math.abs(pt) > 1000) { visible = false; reasons.push("parent-offscreen"); break; }
          parent = parent.parentElement;
          depth++;
        }
        return {
          visible,
          reasons,
          tag: el.tagName.toLowerCase(),
          type: (el as HTMLInputElement).type || el.tagName.toLowerCase(),
          name: (el as HTMLInputElement).name || "",
          text: el.textContent?.trim().slice(0, 100) || "",
        };
      });
    },
    selector ?? null
  );
}

/**
 * Get only visible elements matching a selector.
 */
export async function getVisible(
  handle: BrowserHandle,
  selector?: string
): Promise<VisibleElement[]> {
  const all = await checkVisibility(handle, selector);
  return all.filter((el) => el.visible);
}

/**
 * Get hidden/trap elements matching a selector.
 */
export async function getHidden(
  handle: BrowserHandle,
  selector?: string
): Promise<VisibleElement[]> {
  const all = await checkVisibility(handle, selector);
  return all.filter((el) => !el.visible);
}
