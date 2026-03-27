#!/usr/bin/env npx tsx
/**
 * pierce + Custom Adapter — BrowserHandle Reference Implementation
 *
 * Shows how to implement BrowserHandle for any browser automation framework.
 * This example wraps Playwright manually (without using the built-in adapter)
 * to demonstrate every method on the interface, then runs all 35 Proteus
 * challenges through it.
 *
 * Use this as a template when adapting pierce to your own framework.
 *
 * Usage:
 *   npx tsx examples/custom-adapter.ts
 *   npx tsx examples/custom-adapter.ts --stress
 */
import { chromium } from "playwright";
import type {
  BrowserHandle,
  FrameHandle,
  BrowserContextHandle,
} from "../dist/adapter/types.js";
import { applyStealth } from "../dist/index.js";
import {
  SEEDS, ENTROPIES,
  runSuite, printResults,
  type RunConfig,
} from "./solvers.js";

// ---------------------------------------------------------------------------
// Custom BrowserHandle — implements every method from scratch
// ---------------------------------------------------------------------------
function buildHandle(page: any): BrowserHandle {
  return {
    // ── Core: execute JS in the browser ──────────────────────────
    evaluate: async <R>(fn: (arg: any) => R, arg?: any): Promise<R> => {
      return page.evaluate(fn, arg);
    },

    // ── Navigation ───────────────────────────────────────────────
    goto: async (url: string) => {
      await page.goto(url);
      await page.waitForLoadState("networkidle").catch(() => {});
    },

    // ── Element Interaction ──────────────────────────────────────
    click: async (selector: string) => {
      await page.click(selector);
    },
    type: async (selector: string, text: string) => {
      await page.type(selector, text);
    },
    fill: async (selector: string, value: string) => {
      await page.fill(selector, value);
    },

    // ── Waits ────────────────────────────────────────────────────
    waitForTimeout: (ms: number) => page.waitForTimeout(ms),
    waitForSelector: async (selector: string, opts?: { timeout?: number }) => {
      await page.waitForSelector(selector, opts);
    },

    // ── Mouse ────────────────────────────────────────────────────
    mouseMove: (x: number, y: number) => page.mouse.move(x, y),
    mouseClick: (x: number, y: number) => page.mouse.click(x, y),

    // ── Layout ───────────────────────────────────────────────────
    boundingBox: async (selector: string) => {
      const loc = page.locator(selector).first();
      if ((await loc.count()) === 0) return null;
      return loc.boundingBox();
    },

    // ── Frames ───────────────────────────────────────────────────
    frames: async (): Promise<FrameHandle[]> => {
      return page.frames().slice(1).map((frame: any) => ({
        url: frame.url(),
        evaluate: <R>(fn: (arg: any) => R, arg?: any): Promise<R> =>
          frame.evaluate(fn, arg),
      }));
    },

    // ── DOM Queries ──────────────────────────────────────────────
    count: async (selector: string) => page.locator(selector).count(),
    textContent: async (selector: string) =>
      page.locator(selector).first().textContent().catch(() => null),
    scroll: (x: number, y: number) =>
      page.evaluate(([sx, sy]: number[]) => window.scrollBy(sx, sy), [x, y]),
  };
}

// ---------------------------------------------------------------------------
// Custom BrowserContextHandle
// ---------------------------------------------------------------------------
function buildContextHandle(context: any): BrowserContextHandle {
  return {
    addInitScript: (script: string) => context.addInitScript(script),
    addCookie: (cookie) =>
      context.addCookies([{ ...cookie, path: cookie.path ?? "/" }]),
    getCookies: async () => {
      const cookies = await context.cookies();
      return cookies.map((c: any) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
      }));
    },
  };
}

// ---------------------------------------------------------------------------
// Run against Proteus
// ---------------------------------------------------------------------------
async function main() {
  const stress = process.argv.includes("--stress");
  const defaultSeed = parseInt(process.env.SEED ?? "42");
  const defaultEntropy = parseFloat(process.env.ENTROPY ?? "0.5");
  const seeds = stress ? SEEDS : [defaultSeed];
  const entropies = stress ? ENTROPIES : [defaultEntropy];
  const totalRuns = seeds.length * entropies.length;

  console.log(`\n${"=".repeat(72)}`);
  console.log(`  pierce + Custom Adapter — Proteus Benchmark`);
  console.log(`  ${stress ? `STRESS: ${totalRuns} runs` : `seed=${defaultSeed} entropy=${defaultEntropy}`}`);
  console.log(`  Adapter: hand-built BrowserHandle (reference implementation)`);
  console.log(`  Target: https://proteus.terrabench.io (35 challenges)`);
  console.log(`${"=".repeat(72)}\n`);

  const failures: Record<string, number> = {};
  let allPassed = 0, allTotal = 0;

  for (const seed of seeds) {
    for (const entropy of entropies) {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        locale: "en-US",
        timezoneId: "America/New_York",
      });

      // Use our hand-built adapter — NOT the built-in fromPlaywright
      const ctx = buildContextHandle(context);
      await applyStealth(ctx);
      const page = await context.newPage();
      const handle = buildHandle(page);

      const cfg: RunConfig = { seed, entropy };
      const results = await runSuite(handle, ctx, cfg);
      await browser.close();

      const passed = results.filter(r => r.success).length;
      allPassed += passed;
      allTotal += results.length;
      for (const r of results.filter(r => !r.success)) {
        failures[r.name] = (failures[r.name] || 0) + 1;
      }

      const label = `seed=${String(seed).padEnd(5)} entropy=${String(entropy).padEnd(4)}`;
      printResults(results, label, !stress);
    }
  }

  console.log(`\n${"=".repeat(72)}`);
  console.log(`  Adapter: Custom (hand-built BrowserHandle)`);
  console.log(`  Pass rate: ${allPassed}/${allTotal} (${(100 * allPassed / allTotal).toFixed(1)}%)`);
  if (Object.keys(failures).length) {
    console.log(`\n  Flaky challenges:`);
    for (const [name, count] of Object.entries(failures).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${name.padEnd(25)} failed ${count}/${totalRuns} (${(100 * count / totalRuns).toFixed(0)}%)`);
    }
  } else {
    console.log(`  \x1b[32mZERO FAILURES.\x1b[0m`);
  }
  console.log(`${"=".repeat(72)}\n`);
}

main().catch(console.error);
