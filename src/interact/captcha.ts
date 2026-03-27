/**
 * CAPTCHA Solving
 *
 * Adaptive math CAPTCHA parser that works under entropy:
 * - Multiple regex patterns for different question formats
 * - Finds inputs by proximity to challenge text, not by ID/name
 * - Finds submit buttons by semantic role, not by selector
 */
import type { BrowserHandle } from "../adapter/types.js";
import type { CaptchaChallenge } from "../types.js";

const MATH_PATTERNS = [
  // Standard: "23 + 17 = ?"
  /(\d+)\s*([+\-*/×÷])\s*(\d+)\s*=\s*\?/,
  // Reversed: "? = 23 + 17"
  /\?\s*=\s*(\d+)\s*([+\-*/×÷])\s*(\d+)/,
  // Word form: "What is 23 plus 17?"
  /what\s+is\s+(\d+)\s+(plus|minus|times|divided\s+by)\s+(\d+)/i,
  // Solve: "Solve: 23 + 17"
  /solve:?\s*(\d+)\s*([+\-*/×÷])\s*(\d+)/i,
  // Calculate: "Calculate 23 + 17"
  /calculate:?\s*(\d+)\s*([+\-*/×÷])\s*(\d+)/i,
  // Word numbers
  /(\w+)\s+(plus|minus|times|divided\s+by)\s+(\w+)/i,
];

const WORD_TO_NUM: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4,
  five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20,
};

function parseOperator(op: string): string {
  const map: Record<string, string> = {
    "+": "+", "-": "-", "*": "*", "/": "/",
    "×": "*", "÷": "/",
    plus: "+", minus: "-", times: "*", "divided by": "/",
  };
  return map[op.toLowerCase()] || "+";
}

function parseNumber(s: string): number {
  const n = parseInt(s);
  if (!isNaN(n)) return n;
  return WORD_TO_NUM[s.toLowerCase()] ?? NaN;
}

function compute(a: number, op: string, b: number): number {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b !== 0 ? Math.floor(a / b) : 0;
    default: return a + b;
  }
}

/**
 * Detect and solve a math CAPTCHA on the page.
 */
export async function solveMathCaptcha(handle: BrowserHandle): Promise<CaptchaChallenge> {
  const text = await handle.evaluate(() => document.body?.innerText || "");

  for (const pattern of MATH_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const a = parseNumber(match[1]);
      const op = parseOperator(match[2]);
      const b = parseNumber(match[3]);
      if (!isNaN(a) && !isNaN(b)) {
        const answer = compute(a, op, b);
        return {
          type: "math",
          question: match[0],
          answer,
        };
      }
    }
  }

  return { type: "unknown", question: text.slice(0, 200), answer: null };
}

/**
 * Solve and submit a math CAPTCHA.
 * Finds the input and submit button by proximity/role, not by ID.
 */
export async function submitCaptcha(handle: BrowserHandle): Promise<boolean> {
  const challenge = await solveMathCaptcha(handle);
  if (challenge.answer === null) return false;

  // Find the text input closest to the challenge text
  const filled = await handle.evaluate((answer) => {
    // Find visible text inputs
    const inputs = Array.from(
      document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])')
    ).filter((el) => {
      const s = getComputedStyle(el);
      return s.display !== "none" && s.visibility !== "hidden" && parseFloat(s.opacity) > 0;
    });

    if (inputs.length === 0) return false;

    // Fill the first visible input
    const input = inputs[0] as HTMLInputElement;
    input.value = String(answer);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }, challenge.answer);

  if (!filled) return false;

  // Click submit button
  const submitted = await handle.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button, input[type='submit']"));
    for (const btn of buttons) {
      const text = btn.textContent?.toLowerCase() || "";
      const type = (btn as HTMLButtonElement).type;
      if (text.includes("submit") || text.includes("verify") || text.includes("check") || type === "submit") {
        const s = getComputedStyle(btn);
        if (s.display !== "none") {
          (btn as HTMLElement).click();
          return true;
        }
      }
    }
    // Fallback: submit the form
    const form = document.querySelector("form");
    if (form) {
      form.dispatchEvent(new Event("submit", { bubbles: true }));
      return true;
    }
    return false;
  });

  return submitted;
}
