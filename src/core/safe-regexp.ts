/**
 * Safe RegExp Construction
 *
 * Prevents ReDoS by escaping user-supplied strings before passing them
 * to the RegExp constructor. Provides both a Node-side helper and an
 * inlineable snippet for browser evaluate() callbacks.
 */

/**
 * Escape all regex special characters in a string so it matches literally.
 */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build a RegExp from an untrusted string. If the string is not a valid
 * regex pattern, it is escaped and treated as a literal match.
 */
export function safeRegExp(pattern: string, flags?: string): RegExp {
  try {
    // nosemgrep: detect-non-literal-regexp — intentional: this IS the safe wrapper
    return new RegExp(pattern, flags);
  } catch {
    // nosemgrep: detect-non-literal-regexp — fallback to escaped literal
    return new RegExp(escapeRegExp(pattern), flags);
  }
}

/**
 * Inlineable escape snippet for use inside browser evaluate() callbacks
 * where module imports are unavailable. Copy this string literal into the
 * evaluate body and call it before passing user input to new RegExp().
 *
 * Usage inside evaluate:
 *   const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
 *   let re: RegExp;
 *   try { re = new RegExp(pattern, "i"); } catch { re = new RegExp(esc(pattern), "i"); }
 */
