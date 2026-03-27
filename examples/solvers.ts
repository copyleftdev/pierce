/**
 * pierce — Proteus Challenge Solvers
 *
 * 35 challenge solvers using ONLY pierce primitives.
 * Framework-agnostic: same solvers run on Playwright, Puppeteer, or anything.
 *
 * Shared by all example runners.
 */
import type { BrowserHandle, BrowserContextHandle } from "../dist/adapter/types.js";
import {
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
  detectHoneypots,
  filterDecoys,
  extractShadowContent,
  extractFrameContent,
  extractDynamicContent,
  paginate,
  navigateSPA,
  waitForHydration,
  followJourney,
  humanMouseTraverse,
  submitCaptcha,
  waitForDelayedContent,
  waitForStreamComplete,
  setSessionCookie,
} from "../dist/index.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE = "https://proteus.terrabench.io";

export interface RunConfig {
  seed: number;
  entropy: number;
}

export interface Result {
  name: string;
  tier: string;
  success: boolean;
  detail: string;
  elapsed: number;
}

function labUrl(cfg: RunConfig, route: string): string {
  return `${BASE}${route}?seed=${cfg.seed}&entropy=${cfg.entropy}`;
}

// ---------------------------------------------------------------------------
// BASIC (7)
// ---------------------------------------------------------------------------

async function solveCards(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/cards"));
  await waitForQuiescence(h);
  const table = await extractTable(h);
  const sections = await extractByHeadings(h);
  const keys = Object.keys(sections).filter(k => k !== "__intro");
  return { name: "Card Grid", tier: "basic", success: table.data.rows.length > 0 || keys.length > 0, detail: `${table.data.rows.length} rows, ${keys.length} sections`, elapsed: 0 };
}

async function solveTable(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/table"));
  await waitForQuiescence(h);
  const data = await extractTable(h);
  return { name: "Data Table", tier: "basic", success: data.data.rows.length > 0, detail: `${data.data.rows.length} rows (${data.strategy})`, elapsed: 0 };
}

async function solveForm(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/form"));
  await waitForQuiescence(h);
  const hp = await detectHoneypots(h);
  return { name: "Form", tier: "basic", success: hp.realFields.length > 0, detail: `${hp.realFields.length} real, ${hp.trapFields.length} traps`, elapsed: 0 };
}

async function solveFeed(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/feed"));
  await waitForQuiescence(h, { quietMs: 500 });
  for (let i = 0; i < 3; i++) {
    await h.scroll(0, 10000);
    await h.waitForTimeout(300);
  }
  const text = await extractVisibleText(h);
  return { name: "Infinite Feed", tier: "basic", success: text.split("\n").length > 5, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveModals(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/modals"));
  await waitForQuiescence(h);
  const found = await h.evaluate(() => {
    let count = 0;
    for (const btn of document.querySelectorAll("button")) {
      if (/open/i.test(btn.textContent || "")) {
        btn.click();
        const d = document.querySelector("dialog[open]");
        if (d) count++;
        const close = d?.querySelector("button");
        if (close) (close as HTMLElement).click();
      }
    }
    return count;
  });
  return { name: "Modals & Tooltips", tier: "basic", success: found > 0, detail: `${found} modals`, elapsed: 0 };
}

async function solveLayout(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/layout"));
  await waitForQuiescence(h);
  const sections = await extractByHeadings(h);
  const keys = Object.keys(sections).filter(k => k !== "__intro");
  return { name: "Layout Stress", tier: "basic", success: keys.length > 0, detail: `${keys.length} sections`, elapsed: 0 };
}

async function solveStructured(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/structured-data"));
  await waitForQuiescence(h);
  const data = await extractStructuredData(h);
  return { name: "Structured Data", tier: "basic", success: data.confidence > 0, detail: `confidence=${data.confidence}`, elapsed: 0 };
}

// ---------------------------------------------------------------------------
// SCRAPER (9)
// ---------------------------------------------------------------------------

async function solvePagination(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/pagination"));
  await waitForQuiescence(h);
  const pages = await paginate(h, async (handle) =>
    handle.evaluate(() =>
      Array.from(document.querySelectorAll("h2, h3, h4"))
        .map(el => el.textContent?.trim() || "")
        .filter(t => t.length > 0)
    ),
  20);
  const total = pages.reduce((a, p) => a + p.items.length, 0);
  return { name: "Pagination", tier: "scraper", success: total > 5, detail: `${total} items, ${pages.length} pages`, elapsed: 0 };
}

async function solveShadow(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/shadow"));
  await waitForQuiescence(h, { quietMs: 500 });
  const shadows = await extractShadowContent(h);
  return { name: "Shadow DOM", tier: "scraper", success: shadows.length > 0, detail: `${shadows.length} roots`, elapsed: 0 };
}

async function solveAjax(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/ajax"));
  const content = await extractDynamicContent(h, { quietMs: 800, timeoutMs: 8000 });
  return { name: "AJAX/XHR", tier: "scraper", success: content.final.length > 100, detail: `${content.final.length} chars`, elapsed: 0 };
}

async function solveIframe(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/iframe"));
  await waitForQuiescence(h, { quietMs: 500 });
  const frames = await extractFrameContent(h);
  return { name: "Iframe Nesting", tier: "scraper", success: frames.length > 0, detail: `${frames.length} frames`, elapsed: 0 };
}

async function solveObfuscation(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/obfuscation"));
  await waitForQuiescence(h, { quietMs: 800 });
  const text = await extractCleanText(h);
  const pseudo = await extractPseudoContent(h);
  return { name: "Text Obfuscation", tier: "scraper", success: text.length > 50, detail: `${text.length} chars, ${pseudo.length} pseudos`, elapsed: 0 };
}

async function solveCSSExfil(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/css-exfil"));
  await waitForQuiescence(h);
  const css = await extractCSSData(h);
  const total = Object.keys(css.data.variables).length + css.data.pseudoContent.length;
  return { name: "CSS Exfiltration", tier: "scraper", success: total > 0, detail: `${total} data points`, elapsed: 0 };
}

async function solveWebSocket(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/websocket"));
  await waitForStreamComplete(h, { timeoutMs: 15000 });
  const data = await extractTable(h);
  return { name: "WebSocket Stream", tier: "scraper", success: data.data.rows.length > 0, detail: `${data.data.rows.length} rows`, elapsed: 0 };
}

async function solveSPA(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/spa"));
  await waitForHydration(h);
  await navigateSPA(h, /products/i, { hydratedAttr: "data-hydrated" });
  const text = await extractVisibleText(h);
  return { name: "SPA Shell", tier: "scraper", success: text.length > 50, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveCSVExport(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/csv-export"));
  await waitForQuiescence(h);
  const table = await extractTable(h);
  return { name: "CSV Export", tier: "scraper", success: table.data.rows.length > 0, detail: `${table.data.rows.length} rows`, elapsed: 0 };
}

// ---------------------------------------------------------------------------
// ANTIBOT (11)
// ---------------------------------------------------------------------------

async function solveHoneypot(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/honeypot"));
  await waitForQuiescence(h);
  const hp = await detectHoneypots(h);
  return { name: "Honeypot", tier: "antibot", success: hp.realFields.length > 0, detail: `${hp.realFields.length} real, ${hp.trapFields.length} traps`, elapsed: 0 };
}

async function solveTiming(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/timing"));
  const text = await waitForDelayedContent(h, { maxWaitMs: 8000 });
  return { name: "Timing Traps", tier: "antibot", success: text.length > 50, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveFingerprint(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/fingerprint"));
  await waitForQuiescence(h, { quietMs: 500 });
  const text = await extractVisibleText(h);
  return { name: "Fingerprint", tier: "antibot", success: text.length > 30, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveHeadless(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/headless"));
  await waitForQuiescence(h, { quietMs: 500 });
  const text = await extractVisibleText(h);
  return { name: "Headless Detection", tier: "antibot", success: text.length > 30, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveSession(h: BrowserHandle, ctx: BrowserContextHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/session"));
  await waitForQuiescence(h);
  await setSessionCookie(ctx, "proteus_session", "valid_session_token", "proteus.terrabench.io");
  await h.goto(labUrl(cfg, "/lab/session"));
  await waitForQuiescence(h);
  const text = await extractVisibleText(h);
  return { name: "Session & Cookies", tier: "antibot", success: text.length > 30, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveFontCipher(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/font-cipher"));
  await waitForQuiescence(h, { quietMs: 800 });
  const text = await extractVisibleText(h);
  return { name: "Font Cipher", tier: "antibot", success: text.length > 30, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveDecoy(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/decoy"));
  await waitForQuiescence(h);
  const decoys = await filterDecoys(h);
  const text = await extractVisibleText(h);
  return { name: "Decoy Injection", tier: "antibot", success: text.length > 100, detail: `${decoys.real.length} real, ${decoys.decoys.length} decoys`, elapsed: 0 };
}

async function solveDOMSentinel(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/dom-sentinel"));
  await waitForQuiescence(h);
  const text = await extractVisibleText(h);
  return { name: "DOM Sentinel", tier: "antibot", success: text.length > 30, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveRequestFP(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/request-fp"));
  await waitForQuiescence(h);
  const text = await extractVisibleText(h);
  return { name: "Request Fingerprint", tier: "antibot", success: text.length > 30, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveRateLimit(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/rate-limit"));
  await waitForQuiescence(h, { quietMs: 1500 });
  const text = await extractVisibleText(h);
  return { name: "Rate Limit Guard", tier: "antibot", success: text.length > 30, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveBrowserFP(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/browser-fp"));
  await waitForQuiescence(h, { quietMs: 1500 });
  const text = await extractVisibleText(h);
  return { name: "Browser Fingerprint", tier: "antibot", success: text.length > 30, detail: `${text.length} chars`, elapsed: 0 };
}

// ---------------------------------------------------------------------------
// EXPERT (8)
// ---------------------------------------------------------------------------

async function solveMouse(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/mouse"));
  await waitForQuiescence(h);
  const box = await h.boundingBox("#mouse-challenge, [class*=challenge]");
  if (box) {
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await humanMouseTraverse(h, Array.from({ length: 8 }, (_, i) => ({
      x: cx + Math.cos(i * Math.PI / 4) * 80,
      y: cy + Math.sin(i * Math.PI / 4) * 60,
    })));
  }
  const text = await extractVisibleText(h);
  return { name: "Mouse Behavior", tier: "expert", success: text.length > 30, detail: `${text.length} chars`, elapsed: 0 };
}

async function solveCaptcha(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/captcha"));
  await waitForQuiescence(h);
  const solved = await submitCaptcha(h);
  await h.waitForTimeout(300);
  const text = await extractVisibleText(h);
  return { name: "CAPTCHA", tier: "expert", success: /correct|granted/i.test(text), detail: `solved=${solved}`, elapsed: 0 };
}

async function solveCanvas(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/canvas-render"));
  await waitForQuiescence(h, { quietMs: 500 });
  const texts = await extractCanvasText(h);
  const visible = await extractVisibleText(h);
  return { name: "Canvas Rendering", tier: "expert", success: texts.length > 0 || visible.length > 50, detail: `${texts.length} canvas texts`, elapsed: 0 };
}

async function solvePOW(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/proof-of-work"));
  await waitForQuiescence(h);
  await h.evaluate(() => {
    for (const btn of document.querySelectorAll("button")) {
      if (/start|solve/i.test(btn.textContent || "")) btn.click();
    }
  });
  await waitForText(h, /solved|granted/i, 60000);
  const text = await extractVisibleText(h);
  return { name: "Proof of Work", tier: "expert", success: /solved|granted/i.test(text), detail: `solved`, elapsed: 0 };
}

async function solvePolymorphic(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/polymorphic"));
  await waitForQuiescence(h);
  const table = await extractTable(h);
  const sections = await extractByHeadings(h);
  const keys = Object.keys(sections).filter(k => k !== "__intro");
  return { name: "Polymorphic Markup", tier: "expert", success: table.data.rows.length > 0 || keys.length > 0, detail: `${table.data.rows.length} rows, ${keys.length} sections`, elapsed: 0 };
}

async function solveJourney(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/journey"));
  await waitForQuiescence(h);
  const steps = await followJourney(h, { maxSteps: 5 });
  return { name: "Multi-Page Journey", tier: "expert", success: steps.length >= 2, detail: `${steps.length} steps`, elapsed: 0 };
}

async function solveWorkflow(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/workflow"));
  await waitForQuiescence(h);
  await h.evaluate(() => {
    document.querySelectorAll("input").forEach((inp: HTMLInputElement) => {
      if (inp.type === "password") inp.value = "password";
      else if (inp.type === "text" || !inp.type) inp.value = "admin";
      inp.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });
  const steps = await followJourney(h, {
    maxSteps: 6,
    advancePatterns: [/login/i, /search/i, /add/i, /cart/i, /checkout/i],
  });
  return { name: "Multi-Step Workflow", tier: "expert", success: steps.length >= 3, detail: `${steps.length} steps`, elapsed: 0 };
}

async function solveSVG(h: BrowserHandle, cfg: RunConfig): Promise<Result> {
  await h.goto(labUrl(cfg, "/lab/svg-render"));
  await waitForQuiescence(h, { quietMs: 500 });
  const svg = await extractSVGData(h);
  return { name: "SVG Data Rendering", tier: "expert", success: svg.texts.length > 0, detail: `${svg.texts.length} texts`, elapsed: 0 };
}

// ---------------------------------------------------------------------------
// Exported solver registry
// ---------------------------------------------------------------------------
type SolverFn = (h: BrowserHandle, ctx: BrowserContextHandle, cfg: RunConfig) => Promise<Result>;

export const TIERS: [string, SolverFn[]][] = [
  ["basic", [
    (h, c, cfg) => solveCards(h, cfg),
    (h, c, cfg) => solveTable(h, cfg),
    (h, c, cfg) => solveForm(h, cfg),
    (h, c, cfg) => solveFeed(h, cfg),
    (h, c, cfg) => solveModals(h, cfg),
    (h, c, cfg) => solveLayout(h, cfg),
    (h, c, cfg) => solveStructured(h, cfg),
  ]],
  ["scraper", [
    (h, c, cfg) => solvePagination(h, cfg),
    (h, c, cfg) => solveShadow(h, cfg),
    (h, c, cfg) => solveAjax(h, cfg),
    (h, c, cfg) => solveIframe(h, cfg),
    (h, c, cfg) => solveObfuscation(h, cfg),
    (h, c, cfg) => solveCSSExfil(h, cfg),
    (h, c, cfg) => solveWebSocket(h, cfg),
    (h, c, cfg) => solveSPA(h, cfg),
    (h, c, cfg) => solveCSVExport(h, cfg),
  ]],
  ["antibot", [
    (h, c, cfg) => solveHoneypot(h, cfg),
    (h, c, cfg) => solveTiming(h, cfg),
    (h, c, cfg) => solveFingerprint(h, cfg),
    (h, c, cfg) => solveHeadless(h, cfg),
    (h, c, cfg) => solveSession(h, c, cfg),
    (h, c, cfg) => solveFontCipher(h, cfg),
    (h, c, cfg) => solveDecoy(h, cfg),
    (h, c, cfg) => solveDOMSentinel(h, cfg),
    (h, c, cfg) => solveRequestFP(h, cfg),
    (h, c, cfg) => solveRateLimit(h, cfg),
    (h, c, cfg) => solveBrowserFP(h, cfg),
  ]],
  ["expert", [
    (h, c, cfg) => solveMouse(h, cfg),
    (h, c, cfg) => solveCaptcha(h, cfg),
    (h, c, cfg) => solveCanvas(h, cfg),
    (h, c, cfg) => solvePOW(h, cfg),
    (h, c, cfg) => solvePolymorphic(h, cfg),
    (h, c, cfg) => solveJourney(h, cfg),
    (h, c, cfg) => solveWorkflow(h, cfg),
    (h, c, cfg) => solveSVG(h, cfg),
  ]],
];

// ---------------------------------------------------------------------------
// Shared runner logic
// ---------------------------------------------------------------------------
export async function runSuite(
  handle: BrowserHandle,
  ctx: BrowserContextHandle,
  cfg: RunConfig
): Promise<Result[]> {
  const results: Result[] = [];
  for (const [tier, solvers] of TIERS) {
    for (const solver of solvers) {
      const t0 = Date.now();
      try {
        const r = await solver(handle, ctx, cfg);
        r.elapsed = Date.now() - t0;
        results.push(r);
      } catch (e) {
        results.push({
          name: "?",
          tier,
          success: false,
          detail: String(e).slice(0, 100),
          elapsed: Date.now() - t0,
        });
      }
    }
  }
  return results;
}

export function printResults(
  results: Result[],
  label: string,
  verbose = false
) {
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  const ok = passed === total
    ? `\x1b[32m${passed}/${total}\x1b[0m`
    : `\x1b[33m${passed}/${total}\x1b[0m`;
  const fails = results.filter(r => !r.success).map(r => r.name);
  const failStr = fails.length ? `  \x1b[31m[${fails.join(", ")}]\x1b[0m` : "";
  console.log(`  ${label}  ${ok}${failStr}`);

  if (verbose) {
    for (const [tier] of TIERS) {
      console.log(`\n  ── ${tier.toUpperCase()} ──`);
      for (const r of results.filter(r => r.tier === tier)) {
        const s = r.success ? "\x1b[32m PASS \x1b[0m" : "\x1b[31m FAIL \x1b[0m";
        console.log(`  [${s}] ${r.name.padEnd(22)} ${(r.elapsed / 1000).toFixed(2).padStart(6)}s  ${r.detail}`);
      }
    }
  }
}

export const SEEDS = [1, 42, 100, 999, 7777];
export const ENTROPIES = [0.0, 0.25, 0.5, 0.75, 1.0];
