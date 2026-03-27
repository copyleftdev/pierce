#!/usr/bin/env npx tsx
/**
 * pierce + Playwright — Full Proteus Benchmark
 *
 * Runs all 35 challenges against https://proteus.terrabench.io
 * using pierce primitives through the Playwright adapter.
 *
 * Usage:
 *   npx tsx examples/playwright.ts                    # single run (seed=42, entropy=0.5)
 *   npx tsx examples/playwright.ts --stress           # 5 seeds × 5 entropy = 25 runs
 *   SEED=100 ENTROPY=0.75 npx tsx examples/playwright.ts
 */
import { chromium } from "playwright";
import { fromPlaywright, fromPlaywrightContext } from "../dist/adapter/playwright.js";
import { applyStealth } from "../dist/index.js";
import {
  TIERS, SEEDS, ENTROPIES,
  runSuite, printResults,
  type RunConfig, type Result,
} from "./solvers.js";

async function createPlaywrightHandle() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "en-US",
    timezoneId: "America/New_York",
  });

  const ctx = fromPlaywrightContext(context);
  await applyStealth(ctx);

  const page = await context.newPage();
  const handle = fromPlaywright(page);

  return { browser, handle, ctx };
}

async function main() {
  const stress = process.argv.includes("--stress");
  const defaultSeed = parseInt(process.env.SEED ?? "42");
  const defaultEntropy = parseFloat(process.env.ENTROPY ?? "0.5");

  const seeds = stress ? SEEDS : [defaultSeed];
  const entropies = stress ? ENTROPIES : [defaultEntropy];
  const totalRuns = seeds.length * entropies.length;

  console.log(`\n${"=".repeat(72)}`);
  console.log(`  pierce + Playwright — Proteus Benchmark`);
  console.log(`  ${stress ? `STRESS: ${seeds.length} seeds × ${entropies.length} entropy = ${totalRuns} runs` : `seed=${defaultSeed} entropy=${defaultEntropy}`}`);
  console.log(`  Target: https://proteus.terrabench.io (35 challenges)`);
  console.log(`${"=".repeat(72)}\n`);

  const failures: Record<string, number> = {};
  let allPassed = 0, allTotal = 0;

  for (const seed of seeds) {
    for (const entropy of entropies) {
      const { browser, handle, ctx } = await createPlaywrightHandle();
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

  // Summary
  console.log(`\n${"=".repeat(72)}`);
  if (stress) {
    const perfect = totalRuns - Object.values(failures).reduce((a, b) => a + Math.min(b, 1), 0);
    // Actually count perfect runs properly
    console.log(`  Framework: Playwright`);
  }
  console.log(`  Pass rate: ${allPassed}/${allTotal} (${(100 * allPassed / allTotal).toFixed(1)}%)`);

  if (Object.keys(failures).length) {
    console.log(`\n  Flaky challenges:`);
    for (const [name, count] of Object.entries(failures).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${name.padEnd(25)} failed ${count}/${totalRuns} (${(100 * count / totalRuns).toFixed(0)}%)`);
    }
  } else {
    console.log(`  \x1b[32mZERO FAILURES across all configurations.\x1b[0m`);
  }
  console.log(`${"=".repeat(72)}\n`);
}

main().catch(console.error);
