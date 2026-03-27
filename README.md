# pierce

Entropy-tolerant extraction primitives that pierce through any DOM.

Framework-agnostic. Works with Playwright, Puppeteer, or your own adapter.

## Install

```sh
npm install pierce
```

## Quickstart

```typescript
import { chromium } from 'playwright'
import { fromPlaywright } from 'pierce/adapter/playwright'
import { extractTable, detectHoneypots, waitForQuiescence } from 'pierce'

const page = await (await chromium.launch()).newPage()
const handle = fromPlaywright(page)

await handle.goto('https://example.com')
await waitForQuiescence(handle)

const table = await extractTable(handle)
const traps = await detectHoneypots(handle)
```

## Adapters

```typescript
// Playwright
import { fromPlaywright } from 'pierce/adapter/playwright'
const handle = fromPlaywright(page)

// Puppeteer
import { fromPuppeteer } from 'pierce/adapter/puppeteer'
const handle = fromPuppeteer(page)

// Custom — implement BrowserHandle (12 methods)
import type { BrowserHandle } from 'pierce'
const handle: BrowserHandle = { evaluate, goto, click, ... }
```

## Primitives

| Module | What it does |
|--------|-------------|
| `extract` | Tables, text, structured data, CSS variables, SVG, canvas |
| `detect` | Honeypots, decoys, computed visibility |
| `pierce` | Shadow DOM, iframes, dynamic/AJAX content |
| `navigate` | Pagination, SPA routing, multi-step journeys |
| `interact` | Human mouse movement, typing, CAPTCHA solving |
| `session` | Stealth profile, cookies, anti-detection |

## Benchmark

Validated against [Proteus](https://proteus.terrabench.io) — 35 challenges, 5 seeds x 5 entropy levels = 875 runs.

```
  Pass rate: 857/875 (97.9%)
  basic:   175/175 (100%)
  antibot: 275/275 (100%)
  scraper: 215/225 (95.6%)
  expert:  192/200 (96%)
```

## Examples

```sh
npx tsx examples/playwright.ts           # Playwright, single run
npx tsx examples/puppeteer.ts            # Puppeteer, single run
npx tsx examples/custom-adapter.ts       # Custom adapter, single run
npx tsx examples/playwright.ts --stress  # Full entropy matrix (25 runs)
```

## License

MIT
