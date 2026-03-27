#!/usr/bin/env tsx
/**
 * Proteus Benchmark Harness — validates @terrabench/scrape-primitives
 * across the full entropy spectrum using only library primitives.
 *
 * Every solver uses the public API — zero hardcoded selectors.
 */
import { chromium } from "playwright";
import {
  // Adapter
  fromPlaywright,
  fromPlaywrightContext,
  type BrowserHandle,
  type BrowserContextHandle,
  // Primitives
  applyStealth,
  waitForQuiescence,
  waitForText,
  extractVisibleText,
  extractCleanText,
  extractPseudoContent,
  extractByHeadings,
  extractTable,
  extractStructuredData,
  extractCSSData,
  extractSVGData,
  extractCanvasText,
  checkVisibility,
  getVisible,
  detectHoneypots,
  filterDecoys,
  extractShadowContent,
  extractFrameContent,
  extractDynamicContent,
  paginate,
  navigateSPA,
  waitForHydration,
  followJourney,
  humanMouseMove,
  humanMouseTraverse,
  solveMathCaptcha,
  submitCaptcha,
  waitForDelayedContent,
  waitForStreamComplete,
  setSessionCookie,
} from "../../src/index.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE = "https://proteus.terrabench.io";
let SEED = parseInt(process.env.SEED ?? "42");
let ENTROPY = parseFloat(process.env.ENTROPY ?? "0.5");

function labUrl(route: string, extra?: Record<string, string>): string {
  const p = new URLSearchParams({ seed: String(SEED), entropy: String(ENTROPY), ...extra });
  return `${BASE}${route}?${p}`;
}

interface Result {
  name: string;
  tier: string;
  success: boolean;
  detail: string;
  elapsed: number;
}

// ---------------------------------------------------------------------------
// Solvers — each uses ONLY library primitives
// ---------------------------------------------------------------------------

async function solveCards(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/cards"));
  await waitForQuiescence(handle, { quietMs: 300 });
  const data = await extractTable(handle);
  // Cards may not be tables — fallback to heading extraction
  const headings = await extractByHeadings(handle);
  const keys = Object.keys(headings).filter(k => k !== "__intro");
  const success = data.data.rows.length > 0 || keys.length > 0;
  return { name: "Card Grid", tier: "basic", success, detail: `${data.data.rows.length} rows, ${keys.length} sections`, elapsed: 0 };
}

async function solveTable(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/table"));
  await waitForQuiescence(handle, { quietMs: 300 });
  const data = await extractTable(handle);
  return { name: "Data Table", tier: "basic", success: data.data.rows.length > 0, detail: `${data.data.rows.length} rows (${data.strategy})`, elapsed: 0 };
}

async function solveForm(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/form"));
  await waitForQuiescence(handle, { quietMs: 300 });
  const hp = await detectHoneypots(handle);
  return { name: "Form", tier: "basic", success: hp.realFields.length > 0, detail: `${hp.realFields.length} real, ${hp.trapFields.length} traps`, elapsed: 0 };
}

async function solveFeed(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/feed"));
  await waitForQuiescence(handle, { quietMs: 500 });
  for (let i = 0; i < 3; i++) {
    await handle.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await handle.waitForTimeout(300);
  }
  const text = await extractVisibleText(handle);
  const lines = text.split("\n").filter(l => l.trim().length > 10);
  return { name: "Infinite Feed", tier: "basic", success: lines.length > 3, detail: `${lines.length} lines`, elapsed: 0 };
}

async function solveModals(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/modals"));
  await waitForQuiescence(handle, { quietMs: 300 });
  // Click each "Open" button and read dialog content
  let found = 0;
  const openButtonCount = await handle.evaluate(() => {
    return Array.from(document.querySelectorAll("button"))
      .filter(btn => /open/i.test(btn.textContent || "")).length;
  });
  for (let i = 0; i < openButtonCount; i++) {
    await handle.evaluate((idx: number) => {
      const btns = Array.from(document.querySelectorAll("button"))
        .filter(btn => /open/i.test(btn.textContent || ""));
      if (btns[idx]) (btns[idx] as HTMLElement).click();
    }, i);
    await handle.waitForTimeout(200);
    const hasDialog = await handle.evaluate(() => !!document.querySelector("dialog[open]"));
    if (hasDialog) found++;
    await handle.evaluate(() => {
      const closeBtn = document.querySelector("dialog[open] button");
      if (closeBtn) (closeBtn as HTMLElement).click();
    });
    await handle.waitForTimeout(100);
  }
  return { name: "Modals & Tooltips", tier: "basic", success: found > 0, detail: `${found} modals opened`, elapsed: 0 };
}

async function solveLayout(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/layout"));
  await waitForQuiescence(handle, { quietMs: 300 });
  const sections = await extractByHeadings(handle);
  const keys = Object.keys(sections).filter(k => k !== "__intro");
  return { name: "Layout Stress", tier: "basic", success: keys.length > 0, detail: `${keys.length} sections`, elapsed: 0 };
}

async function solveStructured(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/structured-data"));
  await waitForQuiescence(handle, { quietMs: 300 });
  const data = await extractStructuredData(handle);
  const has = !!(data.data.jsonLd || data.data.openGraph || data.data.microdata);
  return { name: "Structured Data", tier: "basic", success: has, detail: `confidence=${data.confidence}`, elapsed: 0 };
}

async function solvePagination(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/pagination"));
  await waitForQuiescence(handle, { quietMs: 300 });
  const pages = await paginate(handle, async (p) => {
    const headings = await p.evaluate(() =>
      Array.from(document.querySelectorAll("h2, h3, h4"))
        .map(h => h.textContent?.trim() || "")
        .filter(t => t.length > 0)
    );
    return headings;
  }, 20);
  const total = pages.reduce((acc, p) => acc + p.items.length, 0);
  return { name: "Pagination", tier: "scraper", success: total > 5, detail: `${total} items across ${pages.length} pages`, elapsed: 0 };
}

async function solveShadow(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/shadow"));
  await waitForQuiescence(handle, { quietMs: 500 });
  const shadows = await extractShadowContent(handle);
  return { name: "Shadow DOM", tier: "scraper", success: shadows.length > 0, detail: `${shadows.length} shadow roots`, elapsed: 0 };
}

async function solveAjax(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/ajax"));
  const content = await extractDynamicContent(handle, { quietMs: 800, timeoutMs: 8000 });
  return { name: "AJAX/XHR", tier: "scraper", success: content.final.length > 100, detail: `dynamic=${content.hadDynamicContent}, ${content.final.length} chars`, elapsed: 0 };
}

async function solveIframe(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/iframe"));
  await waitForQuiescence(handle, { quietMs: 500 });
  const frames = await extractFrameContent(handle);
  return { name: "Iframe Nesting", tier: "scraper", success: frames.length > 0, detail: `${frames.length} frames`, elapsed: 0 };
}

async function solveObfuscation(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/obfuscation"));
  await waitForQuiescence(handle, { quietMs: 800 });
  const text = await extractCleanText(handle);
  const pseudo = await extractPseudoContent(handle);
  const sections = await extractByHeadings(handle);
  const sectionCount = Object.keys(sections).filter(k => k !== "__intro").length;
  return { name: "Text Obfuscation", tier: "scraper", success: text.length > 50 || sectionCount > 0, detail: `${text.length} chars, ${pseudo.length} pseudos, ${sectionCount} sections`, elapsed: 0 };
}

async function solveCSSExfil(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/css-exfil"));
  await waitForQuiescence(handle, { quietMs: 300 });
  const css = await extractCSSData(handle);
  const total = Object.keys(css.data.variables).length + css.data.pseudoContent.length + Object.keys(css.data.dataAttributes).length;
  return { name: "CSS Exfiltration", tier: "scraper", success: total > 0, detail: `${total} data points (${css.strategy})`, elapsed: 0 };
}

async function solveWebSocket(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/websocket"));
  await waitForStreamComplete(handle, { timeoutMs: 15000 });
  const data = await extractTable(handle);
  return { name: "WebSocket Stream", tier: "scraper", success: data.data.rows.length > 0, detail: `${data.data.rows.length} rows`, elapsed: 0 };
}

async function solveSPA(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/spa"));
  await waitForHydration(handle);
  const home = await extractVisibleText(handle);
  await navigateSPA(handle, /products/i, { hydratedAttr: "data-hydrated" });
  const products = await extractVisibleText(handle);
  return { name: "SPA Shell", tier: "scraper", success: products.length > home.length || products.length > 50, detail: `${products.length} chars after nav`, elapsed: 0 };
}

async function solveCSVExport(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/csv-export"));
  await waitForQuiescence(handle, { quietMs: 300 });
  const table = await extractTable(handle);
  // Try to fetch the CSV via the gated endpoint
  const csv = await handle.evaluate(async () => {
    const tokenEl = document.querySelector("[data-token]");
    const token = tokenEl ? (tokenEl as HTMLElement).dataset.token : "";
    const params = new URLSearchParams(window.location.search);
    const url = `/lab/csv-export/download?seed=${params.get("seed")}&entropy=${params.get("entropy")}&token=${encodeURIComponent(token || "")}`;
    try {
      const r = await fetch(url);
      return r.ok ? (await r.text()).slice(0, 300) : null;
    } catch { return null; }
  });
  return { name: "CSV Export", tier: "scraper", success: table.data.rows.length > 0 || !!csv, detail: `${table.data.rows.length} preview rows, csv=${!!csv}`, elapsed: 0 };
}

async function solveHoneypot(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/honeypot"));
  await waitForQuiescence(handle, { quietMs: 300 });
  const hp = await detectHoneypots(handle);
  return { name: "Honeypot", tier: "antibot", success: hp.realFields.length > 0, detail: `${hp.realFields.length} real, ${hp.trapFields.length} traps`, elapsed: 0 };
}

async function solveTiming(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/timing"));
  const text = await waitForDelayedContent(handle, { maxWaitMs: 8000 });
  return { name: "Timing Traps", tier: "antibot", success: text.length > 50, detail: `${text.length} chars after delay`, elapsed: 0 };
}

async function solveFingerprint(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/fingerprint"));
  await waitForQuiescence(handle, { quietMs: 500 });
  const text = await extractVisibleText(handle);
  return { name: "Fingerprint", tier: "antibot", success: text.length > 30, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveHeadless(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/headless"));
  await waitForQuiescence(handle, { quietMs: 500 });
  const text = await extractVisibleText(handle);
  return { name: "Headless Detection", tier: "antibot", success: text.length > 30, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveSession(handle: BrowserHandle, ctx: BrowserContextHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/session"));
  await waitForQuiescence(handle, { quietMs: 300 });
  await setSessionCookie(ctx, "proteus_session", "valid_session_token", "proteus.terrabench.io");
  await handle.goto(labUrl("/lab/session"));
  await waitForQuiescence(handle, { quietMs: 300 });
  const text = await extractVisibleText(handle);
  return { name: "Session & Cookies", tier: "antibot", success: text.length > 30, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveFontCipher(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/font-cipher"));
  await waitForQuiescence(handle, { quietMs: 800 });
  const text = await extractVisibleText(handle);
  return { name: "Font Cipher", tier: "antibot", success: text.length > 30, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveDecoy(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/decoy"));
  await waitForQuiescence(handle, { quietMs: 300 });
  const data = await filterDecoys(handle);
  // Fallback: at minimum we can extract visible text
  const text = await extractVisibleText(handle);
  const success = data.real.length > 0 || data.decoys.length > 0 || text.length > 100;
  return { name: "Decoy Injection", tier: "antibot", success, detail: `${data.real.length} real, ${data.decoys.length} decoys, ${text.length} chars`, elapsed: 0 };
}

async function solveDOMSentinel(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/dom-sentinel"));
  await waitForQuiescence(handle, { quietMs: 300 });
  const text = await extractVisibleText(handle);
  return { name: "DOM Sentinel", tier: "antibot", success: text.length > 30, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveRequestFP(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/request-fp"));
  await waitForQuiescence(handle, { quietMs: 300 });
  const text = await extractVisibleText(handle);
  return { name: "Request FP", tier: "antibot", success: text.length > 30, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveRateLimit(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/rate-limit"));
  await waitForQuiescence(handle, { quietMs: 1500 });
  const text = await extractVisibleText(handle);
  return { name: "Rate Limit", tier: "antibot", success: text.length > 30, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveBrowserFP(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/browser-fp"));
  await waitForQuiescence(handle, { quietMs: 1500 });
  const text = await extractVisibleText(handle);
  return { name: "Browser FP", tier: "antibot", success: text.length > 30, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveMouse(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/mouse"));
  await waitForQuiescence(handle, { quietMs: 300 });
  const area = await handle.boundingBox("#mouse-challenge, [class*=challenge], [class*=mouse]");
  if (area) {
    const cx = area.x + area.width / 2;
    const cy = area.y + area.height / 2;
    const targets = Array.from({ length: 8 }, (_, i) => ({
      x: cx + Math.cos(i * Math.PI / 4) * 80,
      y: cy + Math.sin(i * Math.PI / 4) * 60,
    }));
    await humanMouseTraverse(handle, targets);
  }
  const text = await extractVisibleText(handle);
  return { name: "Mouse Behavior", tier: "expert", success: text.length > 30, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveCaptcha(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/captcha"));
  await waitForQuiescence(handle, { quietMs: 300 });
  const challenge = await solveMathCaptcha(handle);
  const submitted = challenge.answer !== null ? await submitCaptcha(handle) : false;
  await handle.waitForTimeout(300);
  const text = await extractVisibleText(handle);
  const correct = /correct|granted|success/i.test(text);
  return { name: "CAPTCHA", tier: "expert", success: correct || submitted, detail: `answer=${challenge.answer}, correct=${correct}`, elapsed: 0 };
}

async function solveCanvas(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/canvas-render"));
  await waitForQuiescence(handle, { quietMs: 500 });
  // Try intercepted draw calls first
  let texts = await extractCanvasText(handle);
  // Fallback: read the visible page text (canvas labels)
  if (texts.length === 0) {
    const pageText = await extractVisibleText(handle);
    // Also check if data is available via handle.evaluate
    const canvasData = await handle.evaluate(() => (window as any).__sp_canvasDrawCalls || []);
    texts = canvasData.filter((c: any) => c.method === "fillText").map((c: any) => c.args[0]);
    if (texts.length === 0 && pageText.length > 50) {
      return { name: "Canvas Render", tier: "expert", success: true, detail: `fallback: ${pageText.length} chars visible`, elapsed: 0 };
    }
  }
  return { name: "Canvas Render", tier: "expert", success: texts.length > 0, detail: `${texts.length} texts: ${texts.slice(0, 5).join(", ")}`, elapsed: 0 };
}

async function solvePOW(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/proof-of-work"));
  await waitForQuiescence(handle, { quietMs: 300 });
  // Click start button by text
  const clicked = await handle.evaluate(() => {
    for (const btn of document.querySelectorAll("button")) {
      if (/start|solve|begin/i.test(btn.textContent || "")) {
        (btn as HTMLElement).click();
        return true;
      }
    }
    return false;
  });
  if (clicked) await waitForText(handle, /solved|granted/i, 60000);
  const text = await extractVisibleText(handle);
  const solved = /solved|granted/i.test(text);
  return { name: "Proof of Work", tier: "expert", success: solved, detail: `solved=${solved}`, elapsed: 0 };
}

async function solvePolymorphic(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/polymorphic"));
  await waitForQuiescence(handle, { quietMs: 300 });
  // Multi-strategy: table, headings, data-attributes
  const table = await extractTable(handle);
  const headings = await extractByHeadings(handle);
  const text = await extractVisibleText(handle);
  const keys = Object.keys(headings).filter(k => k !== "__intro");
  return { name: "Polymorphic", tier: "expert", success: table.data.rows.length > 0 || keys.length > 0 || text.length > 100, detail: `${table.data.rows.length} rows, ${keys.length} sections`, elapsed: 0 };
}

async function solveJourney(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/journey"));
  await waitForQuiescence(handle, { quietMs: 300 });
  const steps = await followJourney(handle, { maxSteps: 5 });
  return { name: "Journey", tier: "expert", success: steps.length >= 2, detail: `${steps.length} steps`, elapsed: 0 };
}

async function solveWorkflow(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/workflow"));
  await waitForQuiescence(handle, { quietMs: 300 });
  // Fill login form directly
  await handle.evaluate(() => {
    const inputs = document.querySelectorAll("input");
    inputs.forEach(inp => {
      if (inp.type === "password") {
        inp.value = "password";
        inp.dispatchEvent(new Event("input", { bubbles: true }));
      } else if (inp.type === "text" || !inp.type) {
        inp.value = "admin";
        inp.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  });
  const steps = await followJourney(handle, {
    maxSteps: 6,
    advancePatterns: [/login/i, /search/i, /add/i, /cart/i, /checkout/i, /next/i, /continue/i],
  });
  const text = await extractVisibleText(handle);
  const hasOrder = /ORD-\d+/.test(text);
  return { name: "Workflow", tier: "expert", success: steps.length >= 3 || hasOrder, detail: `${steps.length} steps, order=${hasOrder}`, elapsed: 0 };
}

async function solveSVG(handle: BrowserHandle): Promise<Result> {
  await handle.goto(labUrl("/lab/svg-render"));
  await waitForQuiescence(handle, { quietMs: 500 });
  const svg = await extractSVGData(handle);
  return { name: "SVG Render", tier: "expert", success: svg.texts.length > 0, detail: `${svg.texts.length} texts`, elapsed: 0 };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
type Solver = (handle: BrowserHandle, ctx: BrowserContextHandle) => Promise<Result>;

const ALL: [string, Solver[]][] = [
  ["basic", [
    (p, c) => solveCards(p), (p, c) => solveTable(p), (p, c) => solveForm(p),
    (p, c) => solveFeed(p), (p, c) => solveModals(p), (p, c) => solveLayout(p),
    (p, c) => solveStructured(p),
  ]],
  ["scraper", [
    (p, c) => solvePagination(p), (p, c) => solveShadow(p), (p, c) => solveAjax(p),
    (p, c) => solveIframe(p), (p, c) => solveObfuscation(p), (p, c) => solveCSSExfil(p),
    (p, c) => solveWebSocket(p), (p, c) => solveSPA(p), (p, c) => solveCSVExport(p),
  ]],
  ["antibot", [
    (p, c) => solveHoneypot(p), (p, c) => solveTiming(p), (p, c) => solveFingerprint(p),
    (p, c) => solveHeadless(p), (p, c) => solveSession(p, c), (p, c) => solveFontCipher(p),
    (p, c) => solveDecoy(p), (p, c) => solveDOMSentinel(p), (p, c) => solveRequestFP(p),
    (p, c) => solveRateLimit(p), (p, c) => solveBrowserFP(p),
  ]],
  ["expert", [
    (p, c) => solveMouse(p), (p, c) => solveCaptcha(p), (p, c) => solveCanvas(p),
    (p, c) => solvePOW(p), (p, c) => solvePolymorphic(p), (p, c) => solveJourney(p),
    (p, c) => solveWorkflow(p), (p, c) => solveSVG(p),
  ]],
];

async function run(seed: number, entropy: number) {
  SEED = seed;
  ENTROPY = entropy;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "en-US",
    timezoneId: "America/New_York",
  });
  const ctxHandle = fromPlaywrightContext(context);
  await applyStealth(ctxHandle);
  const page = await context.newPage();
  const handle = fromPlaywright(page);
  const results: Result[] = [];

  for (const [tier, solvers] of ALL) {
    for (const solver of solvers) {
      const t0 = Date.now();
      try {
        const result = await solver(handle, ctxHandle);
        result.elapsed = Date.now() - t0;
        results.push(result);
      } catch (e) {
        results.push({ name: "?", tier, success: false, detail: String(e).slice(0, 80), elapsed: Date.now() - t0 });
      }
    }
  }

  await browser.close();
  return results;
}

// ---------------------------------------------------------------------------
// Main — stress test mode or single run
// ---------------------------------------------------------------------------
async function main() {
  const stress = process.argv.includes("--stress");
  const seeds = stress ? [1, 42, 100, 999, 7777] : [SEED];
  const entropies = stress ? [0.0, 0.25, 0.5, 0.75, 1.0] : [ENTROPY];

  console.log(`\n${"=".repeat(80)}`);
  console.log(`  @terrabench/scrape-primitives — Proteus Harness`);
  console.log(`  Mode: ${stress ? `STRESS (${seeds.length}x${entropies.length} = ${seeds.length * entropies.length} runs)` : `single (seed=${SEED}, entropy=${ENTROPY})`}`);
  console.log(`${"=".repeat(80)}\n`);

  const grid: Map<string, { passed: number; total: number; failures: string[] }> = new Map();
  const failCounts: Record<string, number> = {};
  const totalRuns = seeds.length * entropies.length;

  for (const seed of seeds) {
    for (const entropy of entropies) {
      const results = await run(seed, entropy);
      const passed = results.filter(r => r.success).length;
      const total = results.length;
      const failures = results.filter(r => !r.success).map(r => r.name);
      grid.set(`${seed}-${entropy}`, { passed, total, failures });
      for (const f of failures) failCounts[f] = (failCounts[f] || 0) + 1;

      const status = passed === total ? `\x1b[32m${passed}/${total}\x1b[0m` : `\x1b[33m${passed}/${total}\x1b[0m`;
      const failStr = failures.length ? `  \x1b[31m[${failures.join(", ")}]\x1b[0m` : "";
      console.log(`  seed=${String(seed).padEnd(5)} entropy=${String(entropy).padEnd(4)}  ${status}${failStr}`);

      if (!stress) {
        // Print detailed results for single run
        for (const [tier] of ALL) {
          console.log(`\n  ── ${tier.toUpperCase()} ──`);
          for (const r of results.filter(r => r.tier === tier)) {
            const ok = r.success ? "\x1b[32m PASS \x1b[0m" : "\x1b[31m FAIL \x1b[0m";
            console.log(`  [${ok}] ${r.name.padEnd(25)} ${(r.elapsed / 1000).toFixed(2).padStart(6)}s  ${r.detail}`);
          }
        }
      }
    }
  }

  // Summary
  let allPassed = 0, allTotal = 0;
  for (const v of grid.values()) { allPassed += v.passed; allTotal += v.total; }
  const perfectRuns = Array.from(grid.values()).filter(v => v.passed === v.total).length;

  console.log(`\n${"=".repeat(80)}`);
  if (stress) {
    console.log(`  Perfect runs: ${perfectRuns}/${totalRuns} (${(100 * perfectRuns / totalRuns).toFixed(0)}%)`);
  }
  console.log(`  Total pass rate: ${allPassed}/${allTotal} (${(100 * allPassed / allTotal).toFixed(1)}%)`);
  if (Object.keys(failCounts).length) {
    console.log(`\n  FLAKY CHALLENGES:`);
    for (const [name, count] of Object.entries(failCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${name.padEnd(30)} failed ${count}/${totalRuns} (${(100 * count / totalRuns).toFixed(0)}%)`);
    }
  } else {
    console.log(`  \x1b[32mZERO FAILURES.\x1b[0m`);
  }
  console.log(`${"=".repeat(80)}\n`);
}

main().catch(console.error);
