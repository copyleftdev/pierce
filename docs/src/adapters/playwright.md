# Playwright Adapter

## Setup

```typescript
import { chromium } from 'playwright'
import { fromPlaywright, fromPlaywrightContext } from 'pierce/adapter/playwright'
import { applyStealth } from 'pierce'

// Browser context (needed for stealth + cookies)
const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  locale: 'en-US',
})
const ctx = fromPlaywrightContext(context)
await applyStealth(ctx)

// Page handle
const page = await context.newPage()
const handle = fromPlaywright(page)
```

## Full example

The `examples/playwright.ts` file runs all 35 Proteus challenges through the Playwright adapter:

```sh
npx tsx examples/playwright.ts                # single run
npx tsx examples/playwright.ts --stress       # 5 seeds × 5 entropy = 25 runs
SEED=100 ENTROPY=0.75 npx tsx examples/playwright.ts
```

## What `fromPlaywright` wraps

| BrowserHandle method | Playwright API |
|---------------------|----------------|
| `evaluate(fn, arg)` | `page.evaluate(fn, arg)` |
| `goto(url)` | `page.goto(url)` + `waitForLoadState('networkidle')` |
| `click(selector)` | `page.click(selector)` |
| `type(selector, text)` | `page.type(selector, text)` |
| `fill(selector, value)` | `page.fill(selector, value)` |
| `waitForTimeout(ms)` | `page.waitForTimeout(ms)` |
| `waitForSelector(sel)` | `page.waitForSelector(sel)` |
| `mouseMove(x, y)` | `page.mouse.move(x, y)` |
| `mouseClick(x, y)` | `page.mouse.click(x, y)` |
| `boundingBox(sel)` | `page.locator(sel).first().boundingBox()` |
| `frames()` | `page.frames().slice(1)` mapped to `FrameHandle` |
| `count(sel)` | `page.locator(sel).count()` |
