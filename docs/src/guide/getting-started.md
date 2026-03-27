# Getting Started

## Install

```sh
git clone https://github.com/copyleftdev/pierce.git
cd pierce
npm install
npm run build
```

pierce has **optional** peer dependencies on `playwright` and `puppeteer`. Install whichever framework you use:

```sh
# Pick one (or both)
npm install playwright
npm install puppeteer
```

## Your first extraction

### 1. Create a browser handle

pierce doesn't launch browsers — your framework does. pierce wraps the page object with a thin adapter:

```typescript
import { chromium } from 'playwright'
import { fromPlaywright } from 'pierce/adapter/playwright'

const browser = await chromium.launch()
const page = await browser.newPage()
const handle = fromPlaywright(page)    // BrowserHandle — framework-agnostic
```

### 2. Navigate and wait

Don't wait for specific selectors (they break under entropy). Wait for the DOM to settle:

```typescript
import { waitForQuiescence } from 'pierce'

await handle.goto('https://example.com/products')
await waitForQuiescence(handle)   // DOM stable = content ready
```

### 3. Extract

```typescript
import { extractTable, extractStructuredData } from 'pierce'

// Multi-strategy table extraction
// Tries: <table> tags → display:grid → repeated siblings
const table = await extractTable(handle)
console.log(table.data.rows)       // [{col: "val", ...}, ...]
console.log(table.strategy)        // "semantic-table"
console.log(table.confidence)      // 0.95

// Structured data (JSON-LD, OpenGraph, microdata)
const meta = await extractStructuredData(handle)
console.log(meta.data.jsonLd)
```

### 4. Detect traps

```typescript
import { detectHoneypots, filterDecoys } from 'pierce'

const { realFields, trapFields } = await detectHoneypots(handle)
// Uses getComputedStyle — never class names

const { real, decoys } = await filterDecoys(handle)
// Separates visible data from aria-hidden/invisible fakes
```

### 5. Clean up

```typescript
await browser.close()
```

## Optional: stealth profile

For pages with anti-bot defenses, apply the stealth profile **before** creating pages:

```typescript
import { fromPlaywrightContext } from 'pierce/adapter/playwright'
import { applyStealth } from 'pierce'

const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
const ctx = fromPlaywrightContext(context)
await applyStealth(ctx)   // masks webdriver, intercepts shadow DOM, etc.

const page = await context.newPage()
const handle = fromPlaywright(page)
```

## Tree-shakeable imports

Import from subpaths for smaller bundles:

```typescript
import { extractTable } from 'pierce/extract'
import { detectHoneypots } from 'pierce/detect'
import { extractShadowContent } from 'pierce/pierce'
import { paginate } from 'pierce/navigate'
import { humanMouseMove } from 'pierce/interact'
import { applyStealth } from 'pierce/session'
```
