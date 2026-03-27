# Puppeteer Adapter

## Setup

```typescript
import puppeteer from 'puppeteer'
import { fromPuppeteer, fromPuppeteerBrowser } from 'pierce/adapter/puppeteer'
import { applyStealth } from 'pierce'

const browser = await puppeteer.launch({ headless: true })
const ctx = fromPuppeteerBrowser(browser)
await applyStealth(ctx)

const page = await browser.newPage()
await page.setViewport({ width: 1920, height: 1080 })
const handle = fromPuppeteer(page)
```

## Full example

```sh
npx tsx examples/puppeteer.ts                # single run
npx tsx examples/puppeteer.ts --stress       # full entropy matrix
```

## Notes

- Puppeteer's `page.evaluate` works identically to Playwright's for pierce's purposes
- `fill()` is implemented via `evaluate` since Puppeteer doesn't have a native `fill` method
- `waitForTimeout` uses `setTimeout` (Puppeteer deprecated `page.waitForTimeout`)
- Frame access via `page.frames()` works the same as Playwright
