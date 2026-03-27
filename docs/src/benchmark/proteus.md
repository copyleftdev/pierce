# Proteus Benchmark

pierce is validated against [Proteus](https://proteus.terrabench.io), a deterministic entropy engine with 35 anti-scraping challenges across 4 difficulty tiers.

## What is Proteus?

Proteus generates reproducible web pages with progressively harder anti-scraping defenses. Using seed-controlled PRNG, identical parameters always produce identical pages — enabling consistent benchmarking.

- **35 scenarios** across 4 tiers
- **5 mutation profiles** (structure, layout, copy, timing, behavior)
- **Entropy 0.0–1.0** controls DOM mutation intensity
- **Deterministic** — same seed + entropy = same page every time

## Results: seed=42, entropy=0.5

<table class="pierce-bench">
<thead>
<tr><th>Tier</th><th>Challenges</th><th>Result</th><th>Techniques</th></tr>
</thead>
<tbody>
<tr><td>Basic</td><td>7</td><td class="pass">7/7</td><td>Cards, tables, forms, feeds, modals, layouts, structured data</td></tr>
<tr><td>Scraper</td><td>9</td><td class="pass">9/9</td><td>Pagination, Shadow DOM, AJAX, iframes, obfuscation, CSS exfil, WebSocket, SPA, CSV</td></tr>
<tr><td>Anti-Bot</td><td>11</td><td class="pass">11/11</td><td>Honeypots, timing, fingerprint, headless, sessions, font cipher, decoys, sentinels, rate limit</td></tr>
<tr><td>Expert</td><td>8</td><td class="pass">8/8</td><td>Mouse behavior, CAPTCHA, canvas, proof-of-work, polymorphic, journeys, workflows, SVG</td></tr>
<tr style="font-weight:700"><td>Total</td><td>35</td><td class="pass">35/35</td><td></td></tr>
</tbody>
</table>

## Cross-framework validation

The same 35 solvers run identically on all three adapters:

| Framework | Adapter | Result |
|-----------|---------|--------|
| Playwright | `fromPlaywright(page)` | <span class="pass">35/35</span> |
| Puppeteer | `fromPuppeteer(page)` | <span class="pass">35/35</span> |
| Custom (hand-built) | manual `BrowserHandle` | <span class="pass">35/35</span> |

## Run it yourself

```sh
# Single run
npx tsx examples/playwright.ts

# Specific seed/entropy
SEED=100 ENTROPY=0.75 npx tsx examples/playwright.ts

# Full stress test (5 seeds × 5 entropy = 25 runs)
npx tsx examples/playwright.ts --stress
```

## Challenge breakdown

| # | Challenge | Tier | pierce Primitive |
|---|-----------|------|-----------------|
| 1 | Card Grid | basic | `extractTable`, `extractByHeadings` |
| 2 | Data Table | basic | `extractTable` |
| 3 | Form | basic | `detectHoneypots` |
| 4 | Infinite Feed | basic | `extractVisibleText`, scroll |
| 5 | Modals & Tooltips | basic | `evaluate` (click buttons, read `<dialog>`) |
| 6 | Layout Stress | basic | `extractByHeadings` |
| 7 | Structured Data | basic | `extractStructuredData` |
| 8 | Pagination | scraper | `paginate` |
| 9 | Shadow DOM | scraper | `extractShadowContent` |
| 10 | AJAX/XHR | scraper | `extractDynamicContent` |
| 11 | Iframe Nesting | scraper | `extractFrameContent` |
| 12 | Text Obfuscation | scraper | `extractCleanText`, `extractPseudoContent` |
| 13 | CSS Exfiltration | scraper | `extractCSSData` |
| 14 | WebSocket Stream | scraper | `waitForStreamComplete`, `extractTable` |
| 15 | SPA Shell | scraper | `navigateSPA`, `waitForHydration` |
| 16 | CSV Export | scraper | `extractTable` |
| 17 | Honeypot | antibot | `detectHoneypots` |
| 18 | Timing Traps | antibot | `waitForDelayedContent` |
| 19 | Fingerprint | antibot | `applyStealth`, `extractVisibleText` |
| 20 | Headless Detection | antibot | `applyStealth` |
| 21 | Session & Cookies | antibot | `setSessionCookie` |
| 22 | Font Cipher | antibot | `extractVisibleText` (browser renders font) |
| 23 | Decoy Injection | antibot | `filterDecoys` |
| 24 | DOM Sentinel | antibot | `extractVisibleText` (read-only, no DOM mutation) |
| 25 | Request Fingerprint | antibot | `applyStealth` (realistic headers) |
| 26 | Rate Limit Guard | antibot | `waitForQuiescence` |
| 27 | Browser Fingerprint | antibot | `applyStealth` |
| 28 | Mouse Behavior | expert | `humanMouseTraverse` |
| 29 | CAPTCHA | expert | `submitCaptcha` |
| 30 | Canvas Rendering | expert | `extractCanvasText` |
| 31 | Proof of Work | expert | `waitForText` (browser computes SHA-256) |
| 32 | Polymorphic Markup | expert | `extractTable`, `extractByHeadings` |
| 33 | Multi-Page Journey | expert | `followJourney` |
| 34 | Multi-Step Workflow | expert | `followJourney` |
| 35 | SVG Data Rendering | expert | `extractSVGData` |
