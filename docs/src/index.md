<p align="center">
  <img src="logo.png" alt="pierce — entropy-tolerant web scraping library for Playwright and Puppeteer" width="200">
</p>

# pierce

Entropy-tolerant extraction primitives that pierce through any DOM. Framework-agnostic — works with Playwright, Puppeteer, or your own adapter.

Scrapers break when sites change their DOM. Class names shift, IDs get randomized, structures mutate. pierce uses semantic tags, computed styles, and DOM quiescence instead of hardcoded selectors, so your extraction survives.

```sh
npm install pierce
```

```typescript
import { fromPlaywright } from 'pierce/adapter/playwright'
import { extractTable, detectHoneypots, waitForQuiescence } from 'pierce'

const handle = fromPlaywright(page)

await handle.goto('https://example.com')
await waitForQuiescence(handle)

const table = await extractTable(handle)
const traps = await detectHoneypots(handle)
```

## Primitives

| Module | What it does |
|--------|-------------|
| **extract** | Tables, text, structured data, CSS variables, pseudo-elements, SVG, canvas |
| **detect** | Honeypots, decoys, computed visibility |
| **pierce** | Shadow DOM (open + closed), iframes, AJAX/dynamic content |
| **navigate** | Pagination, SPA routing, multi-step journeys |
| **interact** | Bezier mouse movement, human typing, CAPTCHA solving |
| **session** | Stealth profile, cookies, anti-detection |

## Adapters

```typescript
import { fromPlaywright } from 'pierce/adapter/playwright'   // Playwright
import { fromPuppeteer } from 'pierce/adapter/puppeteer'     // Puppeteer
import type { BrowserHandle } from 'pierce'                  // Roll your own
```

## Benchmark

Validated against [Proteus](https://proteus.terrabench.io) — 35 challenges, 5 seeds x 5 entropy levels = 875 runs, 97.9% pass rate.

| Tier | Result |
|------|--------|
| Basic (7) | 175/175 |
| Scraper (9) | 215/225 |
| Anti-Bot (11) | 275/275 |
| Expert (8) | 192/200 |
| **Total** | **857/875** |
